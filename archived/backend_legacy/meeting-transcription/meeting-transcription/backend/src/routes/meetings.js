const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs/promises");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
let Prisma;
try {
  ({ Prisma } = require("@prisma/client"));
} catch (err) {
  Prisma = null;
}

const meetingsStore = require("../lib/meetingsStore");
const ai = require("../lib/ai");

ffmpeg.setFfmpegPath(ffmpegPath);

const uploadsDir = path.join(__dirname, "..", "..", "uploads");
const configuredUploadLimit = Number(process.env.MAX_UPLOAD_SIZE_MB || 500);
const MAX_UPLOAD_SIZE_MB = Number.isFinite(configuredUploadLimit) && configuredUploadLimit > 0
  ? configuredUploadLimit
  : 500;

const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: MAX_UPLOAD_SIZE_MB * 1024 * 1024
  }
});

function deriveDatabaseErrorMessage(err, fallback = "Storage operation failed.") {
  if (meetingsStore.mode !== "database" || !Prisma) {
    return fallback;
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return "Database is unreachable. Check DATABASE_URL and ensure Postgres is running.";
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2021") {
      return "Database schema is missing tables. Run `npx prisma migrate deploy`.";
    }
    if (err.code === "P1001") {
      return "Database connection refused. Verify credentials/host.";
    }
  }
  if (typeof err.message === "string" && err.message.includes('relation "Meeting" does not exist')) {
    return "Meeting table is missing. Apply migrations before starting the server.";
  }
  return fallback;
}

async function cleanupFiles(filePaths = []) {
  await Promise.all(
    filePaths
      .filter(Boolean)
      .map(async (filePath) => {
        try {
          await fsPromises.unlink(filePath);
        } catch (error) {
          if (error.code !== "ENOENT") {
            console.warn(`Unable to remove temp file ${filePath}`, error);
          }
        }
      })
  );
}

    // POST /api/meetings/upload
router.post("/upload", upload.single("meetingVideo"), async (req, res) => {
  let videoPath;
  let audioPath;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    videoPath = req.file.path;

    if (!req.file.mimetype || !req.file.mimetype.startsWith("video/")) {
      await cleanupFiles([videoPath]);
      return res.status(400).json({ error: "Only video uploads are supported." });
    }

    if (ai.mode === "live") {
      audioPath = path.join(path.dirname(videoPath), `${req.file.filename}.mp3`);

      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .output(audioPath)
          .audioCodec("libmp3lame")
          .on("end", resolve)
          .on("error", reject)
          .run();
      });
    }

    const { transcriptText, summary, actionItems: aiActionItems } = await ai.generateMeetingInsights(audioPath || videoPath, {
      title: req.body.title || req.file.originalname,
      originalName: req.file.originalname
    });

    const notes = (summary || "").trim() || "No summary available.";
    const actionItems = (aiActionItems || "").trim() || "No action items available.";

    const meeting = await meetingsStore.createMeeting({
      title: req.body.title || req.file.originalname,
      videoUrl: `/uploads/${path.basename(videoPath)}`,
      audioUrl: audioPath ? `/uploads/${path.basename(audioPath)}` : null,
      transcript: transcriptText || "",
      notes,
      actionItems
    });

    res.status(201).json(meeting);
  } catch (err) {
    console.error("Error processing meeting upload:", err);
    await cleanupFiles([videoPath, audioPath]);
    const message = deriveDatabaseErrorMessage(err, "Failed to process meeting");
    res.status(500).json({ error: message });
  }
});

    // GET /api/meetings
router.get("/", async (req, res) => {
  try {
    const meetings = await meetingsStore.listMeetings();
    res.json(meetings);
  } catch (err) {
    console.error(err);
    const message = deriveDatabaseErrorMessage(err, "Failed to load meetings");
    res.status(500).json({ error: message });
  }
});

// GET /api/meetings/search?q=...
router.get("/search/query", async (req, res) => {
  try {
    const q = req.query.q || "";
    if (!q) return res.json([]);

    const meetings = await meetingsStore.searchMeetings(q);

    res.json(meetings);
  } catch (err) {
    console.error(err);
    const message = deriveDatabaseErrorMessage(err, "Failed to search meetings");
    res.status(500).json({ error: message });
  }
});

// GET /api/meetings/:id
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Meeting id must be a number." });
    }
    const meeting = await meetingsStore.getMeetingById(id);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });
    res.json(meeting);
  } catch (err) {
    console.error(err);
    const message = deriveDatabaseErrorMessage(err, "Failed to load meeting");
    res.status(500).json({ error: message });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: `File too large. Max allowed size is ${MAX_UPLOAD_SIZE_MB}MB.` });
    }
    return res.status(400).json({ error: err.message });
  }

  console.error("Unexpected error in meetings router:", err);
  return res.status(500).json({ error: "An unexpected error occurred." });
});

module.exports = router;
