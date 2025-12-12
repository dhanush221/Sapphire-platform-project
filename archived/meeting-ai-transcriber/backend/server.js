import express from "express";
import multer from "multer";
import fs from "fs";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// ---- config ----
const API_KEY = "a81d09a02f3d4aeda210537c4a6b84c0"; // AssemblyAI key

// ---- helpers ----
async function assertOk(resp) {
  if (resp.ok) return;
  const text = await resp.text();
  throw new Error(`HTTP ${resp.status} ${resp.statusText}: ${text}`);
}

function shortSummary(chapters) {
  const arr = Array.isArray(chapters) ? chapters : [];
  const parts = arr.map(c => (c?.summary || "").trim()).filter(Boolean);
  let text = parts.slice(0, 2).join(" ");               // take 1–2 chapter summaries
  const words = text.split(/\s+/);
  if (words.length > 90) text = words.slice(0, 90).join(" ") + "…"; // cap length
  return text || "No summary available for this audio.";
}

// ---- routes ----
app.get("/", (_req, res) => {
  res.send("✅ Meeting AI Transcriber API is running. POST /api/upload to transcribe.");
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    // 0) validations
    if (!req.file) return res.status(400).json({ error: "No file received. Field name must be 'file'." });
    if (!API_KEY) return res.status(500).json({ error: "Server missing AssemblyAI API key." });
    const filePath = req.file.path;

    // 1) upload audio
    const upResp = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: { authorization: API_KEY },
      body: fs.createReadStream(filePath),
    });
    await assertOk(upResp);
    const { upload_url } = await upResp.json();

    // 2) request transcription (enable chapters for summaries)
    const createResp = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: { authorization: API_KEY, "content-type": "application/json" },
      body: JSON.stringify({ audio_url: upload_url, auto_chapters: true }),
    });
    await assertOk(createResp);
    const { id } = await createResp.json();

    // 3) poll until completed
    let result = null, status = "processing";
    while (status !== "completed" && status !== "error") {
      const poll = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
        headers: { authorization: API_KEY },
      });
      await assertOk(poll);
      result = await poll.json();
      status = result.status;
      if (status === "completed") break;
      await new Promise(r => setTimeout(r, 4000));
    }
    if (status === "error") throw new Error(result?.error || "Transcription failed");

    // 4) build response
    const transcript = result?.text || "";
    const summary = shortSummary(result?.chapters);

    res.json({ transcript, summary });
  } catch (err) {
    console.error("❌ /api/upload error:", err);
    res.status(500).json({ error: String(err.message || err) });
  } finally {
  if (req?.file?.path) fs.unlink(req.file.path, () => {});
}

});

app.listen(8080, () => console.log("✅ Server running on http://localhost:8080"));
