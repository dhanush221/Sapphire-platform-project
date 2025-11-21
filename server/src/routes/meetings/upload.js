import express from "express";
import multer from "multer";
import fs from "fs";
import OpenAI from "openai";
import { HttpsProxyAgent } from "https-proxy-agent";
import { prisma } from "../../prisma.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });
const uploadFields = upload.fields([
  { name: "audio", maxCount: 1 },
  { name: "meetingVideo", maxCount: 1 }
]);
const MEETING_INCLUDE = { actionItems: true };

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

// Configure OpenAI client with optional corporate proxy support
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || null;
const openaiOptions = { apiKey: process.env.OPENAI_API_KEY, maxRetries: 2 };
if (proxyUrl) {
  try {
    openaiOptions.httpAgent = new HttpsProxyAgent(proxyUrl);
  } catch (e) {
    console.warn("Failed to configure HTTPS proxy agent:", e?.message);
  }
}
const openai = new OpenAI(openaiOptions);
const USE_MOCK = String(process.env.MEETINGS_MOCK || '').toLowerCase() === '1' || String(process.env.MEETINGS_MOCK || '').toLowerCase() === 'true';

router.get("/", async (req, res) => {
  try {
    const user = await resolveUserFromRequest(req);
    const where = user ? { userId: user.id } : {};
    const meetings = await prisma.meeting.findMany({
      where,
      include: MEETING_INCLUDE,
      orderBy: { createdAt: "desc" }
    });
    res.json(meetings);
  } catch (err) {
    console.error("GET /api/meetings failed:", err);
    res.status(500).json({ error: "Failed to load meetings" });
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
    res.status(500).json({ error: "Failed to search meetings" });
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
      return res.status(404).json({ error: "Meeting not found" });
    }
    res.json(meeting);
  } catch (err) {
    console.error("GET /api/meetings/:id failed:", err);
    res.status(500).json({ error: "Failed to load meeting" });
  }
});

router.post("/upload", uploadFields, async (req, res) => {
  try {
    const files = req.files || {};
    const uploaded = (Array.isArray(files.audio) && files.audio[0]) || (Array.isArray(files.meetingVideo) && files.meetingVideo[0]) || null;
    if (!uploaded) {
      return res.status(400).json({ error: "No file uploaded (expected 'audio' or 'meetingVideo')" });
    }
    const filePath = uploaded.path;

    const user = await resolveUserFromRequest(req, { createIfMissing: true });
    if (!user) {
      try { fs.unlinkSync(filePath); } catch {}
      return res.status(400).json({ error: "Missing x-user-email header" });
    }

    const providedTitle = String(req.body?.title || "").trim();
    const baseTitle = uploaded.originalname ? uploaded.originalname.replace(/\.[^/.]+$/, "") : "Meeting";
    const finalTitle = providedTitle || baseTitle;

    if (USE_MOCK || !process.env.OPENAI_API_KEY) {
      const fakeTranscript = `Mock transcript for ${uploaded.originalname}.`;
      const fakeSummary = `Mock summary generated locally for ${uploaded.originalname}.`;
      const fakeActionItems = [
        'Review recording and capture notes',
        'Assign follow-ups to attendees'
      ];

      let meeting;
      try {
        meeting = await prisma.meeting.create({
          data: {
            userId: user.id,
            title: finalTitle,
            recordingUrl: `/uploads/${uploaded.filename}`,
            transcript: fakeTranscript,
            summary: fakeSummary,
            actionItems: { create: fakeActionItems.map(text => ({ text })) },
          },
          include: MEETING_INCLUDE
        });
      } catch {
        meeting = {
          id: null,
          userId: user.id,
          title: finalTitle,
          recordingUrl: `/uploads/${uploaded.filename}`,
          transcript: fakeTranscript,
          summary: fakeSummary,
          actionItems: fakeActionItems.map((text, i) => ({ id: i + 1, text, status: 'pending' }))
        };
      }
      return res.json({ success: true, meeting, mock: true });
    }

    // 1) Transcribe audio to text
    let transcriptText = '';
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "whisper-1",
      });
      transcriptText = transcription.text;
    } catch (e) {
      if (USE_MOCK) {
        const fakeTranscript = `Mock transcript (fallback) for ${uploaded.originalname}.`;
        transcriptText = fakeTranscript;
      } else {
        try { fs.unlinkSync(filePath); } catch {}
        return res.status(500).json({ error: `Transcription failed: ${e?.message || 'unknown error'}` });
      }
    }

    // 2) Summarize + extract action items (structured JSON)
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a meeting summarizer. Summarize the text and extract action items in JSON: {summary: '...', action_items: ['item1', 'item2', ...]}",
          },
          { role: "user", content: transcriptText },
        ],
        response_format: { type: "json_object" },
      });
    } catch (e) {
      if (USE_MOCK) {
        completion = { choices: [{ message: { content: JSON.stringify({ summary: `Mock summary for ${uploaded.originalname}`, action_items: ['Follow up with team', 'Prepare minutes'] }) } }] };
      } else {
        try { fs.unlinkSync(filePath); } catch {}
        return res.status(500).json({ error: `Summarization failed: ${e?.message || 'unknown error'}` });
      }
    }

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    const summaryText = result.summary || '';
    const actionItems = result.action_items || [];

    // 3) Store in DB (fallback to transient response if DB fails)
    let meeting;
    try {
      meeting = await prisma.meeting.create({
        data: {
          userId: user.id,
          title: finalTitle,
          recordingUrl: `/uploads/${uploaded.filename}`,
          transcript: transcriptText,
          summary: summaryText,
          actionItems: {
            create: actionItems.map((item) => ({ text: item })),
          },
        },
        include: MEETING_INCLUDE,
      });
    } catch (e) {
      meeting = {
        id: null,
        userId: user.id,
        title: finalTitle,
        recordingUrl: `/uploads/${uploaded.filename}`,
        transcript: transcriptText,
        summary: summaryText,
        actionItems: (actionItems || []).map((text, idx) => ({ id: idx + 1, text, status: 'pending' }))
      };
    }

    res.json({ success: true, meeting });
  } catch (err) {
    console.error("Meeting upload failed:", err);
    res.status(500).json({ error: `Failed to process meeting recording: ${err?.message || 'unknown error'}` });
  }
});

export default router;
