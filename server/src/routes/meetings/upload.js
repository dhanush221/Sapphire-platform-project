import express from "express";
import multer from "multer";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { AssemblyAI } from "assemblyai";
import { prisma } from "../../prisma.js";

const router = express.Router();
const uploadsDir = path.resolve("uploads");
try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}

const MAX_UPLOAD_SIZE_MB_RAW = Number(process.env.MAX_UPLOAD_SIZE_MB || 500);
const MAX_UPLOAD_SIZE_MB = Number.isFinite(MAX_UPLOAD_SIZE_MB_RAW) && MAX_UPLOAD_SIZE_MB_RAW > 0
  ? MAX_UPLOAD_SIZE_MB_RAW
  : 500;

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: MAX_UPLOAD_SIZE_MB * 1024 * 1024 }
});
const uploadFields = upload.fields([
  { name: "audio", maxCount: 1 },
  { name: "meetingVideo", maxCount: 1 },
  { name: "file", maxCount: 1 }
]);
const MEETING_INCLUDE = { actionItems: true };

// Configure ffmpeg for environments where it is not on PATH
if (ffmpegStatic) {
  try { ffmpeg.setFfmpegPath(ffmpegStatic); } catch {}
}

// AssemblyAI client + modes
const assemblyApiKey = (process.env.ASSEMBLYAI_API_KEY || "").trim();
const requestedMode = (process.env.AI_MODE || (assemblyApiKey ? "live" : "mock")).toLowerCase();
const AI_MODE = requestedMode === "live" && assemblyApiKey ? "live" : "mock";
const SUMMARY_MODEL = process.env.ASSEMBLYAI_SUMMARY_MODEL || "informative";
const SUMMARY_TYPE = process.env.ASSEMBLYAI_SUMMARY_TYPE || "bullets";
const assemblyClient = AI_MODE === "live" ? new AssemblyAI({ apiKey: assemblyApiKey }) : null;

// Simple in-memory fallback store so the feature still works if the database is unavailable
const memoryMeetings = [];
const memoryId = () => Date.now() + Math.floor(Math.random() * 1000);
const addMemoryMeeting = (meeting) => {
  const materialized = { ...meeting, id: meeting.id ?? memoryId(), createdAt: meeting.createdAt || new Date().toISOString() };
  memoryMeetings.unshift(materialized);
  return materialized;
};
const listMemoryMeetings = (q = "") => {
  const query = q.trim().toLowerCase();
  return memoryMeetings.filter(m => {
    if (!query) return true;
    return (
      (m.title || "").toLowerCase().includes(query) ||
      (m.summary || "").toLowerCase().includes(query) ||
      (m.transcript || "").toLowerCase().includes(query) ||
      (Array.isArray(m.actionItems) && m.actionItems.some(ai => (ai.text || "").toLowerCase().includes(query)))
    );
  });
};
const findMemoryMeeting = (id) => memoryMeetings.find(m => Number(m.id) === Number(id)) || null;
const updateMemoryActionItem = (meetingId, actionId, status, extra = {}) => {
  const meeting = findMemoryMeeting(meetingId);
  if (!meeting) return null;
  const ai = (meeting.actionItems || []).find(a => Number(a.id) === Number(actionId));
  if (!ai) return null;
  ai.status = status;
  if (extra.assignee !== undefined) ai.assignee = extra.assignee;
  if (extra.dueAt !== undefined) ai.dueAt = extra.dueAt;
  return meeting;
};

async function resolveUserFromRequest(req, { createIfMissing = false } = {}) {
  const email = req.user?.email || req.headers["x-user-email"] || null;
  if (!email) return null;
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user && createIfMissing) {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: "",
        role: req.user?.role || req.headers["x-user-role"] || "student"
      }
    });
  }
  return user;
}

async function cleanupFiles(files = []) {
  await Promise.all(
    files.filter(Boolean).map(async (p) => {
      try { await fsPromises.unlink(p); } catch (err) { if (err.code !== "ENOENT") console.warn("Failed to cleanup file", p, err); }
    })
  );
}

async function extractAudio(inputPath) {
  const outputPath = `${inputPath}.mp3`;
  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .audioCodec("libmp3lame")
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
  return outputPath;
}

function mockContent(filename, title) {
  const label = title || filename || "Meeting";
  const transcriptText = `Mock transcript for "${label}". Provide ASSEMBLYAI_API_KEY and AI_MODE=live for real transcription.`;
  const summary = `### Summary\n- ${label} processed in mock mode.\n- Add AssemblyAI credentials for production transcription.`;
  const actionItems = [
    `Configure AssemblyAI credentials for ${label}`,
    "Share meeting notes with the team"
  ];
  return { transcriptText, summary, actionItems };
}

async function runAssemblyTranscription(filePath, metadata = {}) {
  if (AI_MODE !== "live" || !assemblyClient) return mockContent(metadata.originalName, metadata.title);
  const transcript = await assemblyClient.transcripts.transcribe({
    audio: filePath,
    summarization: true,
    summary_model: SUMMARY_MODEL,
    summary_type: SUMMARY_TYPE,
    auto_highlights: true
  });

  const transcriptText = transcript.text || "";
  const summary = Array.isArray(transcript.summary) ? transcript.summary.join("\n") : (transcript.summary || "");
  const actionItems = (transcript.auto_highlights?.results || [])
    .map((item) => item.text)
    .filter(Boolean)
    .slice(0, 8);

  return { transcriptText, summary, actionItems };
}

router.get("/", async (req, res) => {
  try {
    const user = await resolveUserFromRequest(req);
    const q = String(req.query.q || "").trim();
    const where = {
      ...(user ? { userId: user.id } : {})
    };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { transcript: { contains: q, mode: "insensitive" } },
        { actionItems: { some: { text: { contains: q, mode: "insensitive" } } } }
      ];
    }
    const meetings = await prisma.meeting.findMany({
      where,
      include: MEETING_INCLUDE,
      orderBy: { createdAt: "desc" }
    });
    res.json(meetings);
  } catch (err) {
    console.error("GET /api/meetings failed:", err);
    const fallback = listMemoryMeetings(String(req.query.q || ""));
    res.json(fallback);
  }
});

router.get("/search/query", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json([]);
    const user = await resolveUserFromRequest(req);
    const where = {
      ...(user ? { userId: user.id } : {}),
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { transcript: { contains: q, mode: "insensitive" } },
        { actionItems: { some: { text: { contains: q, mode: "insensitive" } } } }
      ]
    };
    const meetings = await prisma.meeting.findMany({
      where,
      include: MEETING_INCLUDE,
      orderBy: { createdAt: "desc" }
    });
    res.json(meetings);
  } catch (err) {
    console.error("GET /api/meetings/search/query failed:", err);
    const fallback = listMemoryMeetings(String(req.query.q || ""));
    res.json(fallback);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Meeting id must be a number" });
    }
    const user = await resolveUserFromRequest(req);
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: MEETING_INCLUDE
    });
    if (!meeting || (user && meeting.userId !== user.id)) {
      const mem = findMemoryMeeting(id);
      if (!mem) return res.status(404).json({ error: "Meeting not found" });
      return res.json(mem);
    }
    res.json(meeting);
  } catch (err) {
    console.error("GET /api/meetings/:id failed:", err);
    const mem = findMemoryMeeting(req.params.id);
    if (mem) return res.json(mem);
    res.status(500).json({ error: "Failed to load meeting" });
  }
});

router.post("/upload", uploadFields, async (req, res) => {
  const files = req.files || {};
  const uploaded =
    (Array.isArray(files.audio) && files.audio[0]) ||
    (Array.isArray(files.meetingVideo) && files.meetingVideo[0]) ||
    (Array.isArray(files.file) && files.file[0]) ||
    null;

  if (!uploaded) {
    return res.status(400).json({ error: "No file uploaded (expected 'meetingVideo', 'audio', or 'file')." });
  }

  let audioPath = null;
  let playbackRelative = null;
  const filePath = uploaded.path;
  try {
    const user = await resolveUserFromRequest(req, { createIfMissing: true });
    if (!user) {
      await cleanupFiles([filePath]);
      return res.status(400).json({ error: "Missing x-user-email header" });
    }

    const providedTitle = String(req.body?.title || "").trim();
    const baseTitle = uploaded.originalname ? uploaded.originalname.replace(/\.[^/.]+$/, "") : "Meeting";
    const finalTitle = providedTitle || baseTitle;

    // Convert to mp3 for AssemblyAI if possible; fallback to original
    try {
      audioPath = await extractAudio(filePath);
      playbackRelative = `/uploads/${path.basename(audioPath)}`;
    } catch (err) {
      console.warn("Audio extraction failed, using original file for transcription.", err?.message || err);
      audioPath = filePath;
      playbackRelative = `/uploads/${uploaded.filename}`;
    }

    const { transcriptText, summary, actionItems } = await runAssemblyTranscription(audioPath, { title: finalTitle, originalName: uploaded.originalname });
    const actionTexts = Array.isArray(actionItems) ? actionItems : (typeof actionItems === "string" ? actionItems.split(/\n+/).map(s => s.replace(/^[-*•]\s*/, "").trim()).filter(Boolean) : []);

    let meeting;
    try {
      meeting = await prisma.meeting.create({
        data: {
          userId: user.id,
          title: finalTitle,
          recordingUrl: playbackRelative || `/uploads/${uploaded.filename}`,
          transcript: transcriptText,
          summary: summary || "",
          actionItems: actionTexts.length
            ? { create: actionTexts.map(text => ({ text, status: "pending" })) }
            : undefined
        },
        include: MEETING_INCLUDE
      });
    } catch (err) {
      console.error("Failed to persist meeting, returning transient response:", err);
      meeting = addMemoryMeeting({
        id: null,
        userId: user.id,
        title: finalTitle,
        recordingUrl: playbackRelative || `/uploads/${uploaded.filename}`,
        transcript: transcriptText,
        summary: summary || "",
        actionItems: actionTexts.map((text, idx) => ({ id: idx + 1, text, status: "pending" }))
      });
    }

    res.json({ success: true, meeting, mode: AI_MODE });
  } catch (err) {
    console.error("Meeting upload failed:", err);
    res.status(500).json({ error: `Failed to process meeting recording: ${err?.message || "unknown error"}` });
  } finally {
    // Keep derived audio for playback; do not delete files here.
  }
});

// PATCH /api/meetings/:meetingId/action-items/:actionId
// Body: { completed: boolean } or { status: 'done'|'pending' }
router.patch("/:meetingId/action-items/:actionId", async (req, res) => {
  try {
    const meetingId = Number(req.params.meetingId);
    const actionId = Number(req.params.actionId);
    if (!Number.isInteger(meetingId) || !Number.isInteger(actionId)) {
      return res.status(400).json({ error: "Invalid ids" });
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { actionItems: true, user: true }
    });
    if (!meeting) {
      const mem = updateMemoryActionItem(meetingId, actionId, nextStatus);
      if (mem) return res.json(mem);
      return res.status(404).json({ error: "Meeting not found" });
    }

    const user = await resolveUserFromRequest(req);
    if (user && meeting.userId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const body = req.body || {};
    const statusFromBoolean = "completed" in body ? (body.completed ? "done" : "pending") : null;
    const nextStatusRaw = (body.status || statusFromBoolean || "").toString().toLowerCase();
    const nextStatus = ["done","in_progress","pending"].includes(nextStatusRaw) ? nextStatusRaw : "pending";
    const assignee = typeof body.assignee === "string" ? body.assignee.trim() : null;
    const dueAt = body.dueAt ? new Date(body.dueAt) : null;

    const target = meeting.actionItems.find(a => a.id === actionId);
    if (!target) return res.status(404).json({ error: "Action item not found" });

    await prisma.actionItem.update({
      where: { id: actionId },
      data: {
        status: nextStatus,
        assignee,
        dueAt: dueAt || null
      }
    });
    const refreshed = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: MEETING_INCLUDE
    });
    if (!refreshed) return res.status(404).json({ error: "Meeting not found after update" });
    res.json(refreshed);
  } catch (err) {
    console.error("PATCH action-item failed:", err);
    const mem = updateMemoryActionItem(req.params.meetingId, req.params.actionId, req.body?.status || "pending", {
      assignee: req.body?.assignee,
      dueAt: req.body?.dueAt
    });
    if (mem) return res.json(mem);
    res.status(500).json({ error: "Failed to update action item" });
  }
});

// Multer error handling (size limits, etc.)
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: `File too large. Max allowed size is ${MAX_UPLOAD_SIZE_MB}MB.` });
    }
    return res.status(400).json({ error: err.message });
  }
  console.error("Unexpected error in meetings router:", err);
  return res.status(500).json({ error: "An unexpected error occurred." });
});

export default router;
