const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const meetingsRouter = require("./routes/meetings");

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173"
}));
app.use(express.json());

// Serve uploaded media
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Meeting Transcription Backend" });
});

app.use("/api/meetings", meetingsRouter);

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
