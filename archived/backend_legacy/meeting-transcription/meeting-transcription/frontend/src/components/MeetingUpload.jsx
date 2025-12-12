import React, { useState } from "react";
import api from "../lib/api";

export default function MeetingUpload({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const uploadLimitMb = Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB || 500);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      setError("Please select a video file first.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("meetingVideo", file);
      if (title.trim()) formData.append("title", title.trim());

      const { data } = await api.post("/api/meetings/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setFile(null);
      setTitle("");
      if (onUploaded) onUploaded(data);
    } catch (err) {
      console.error(err);
      const serverError = err.response?.data?.error;
      setError(serverError || "Upload failed. Check the backend logs and AssemblyAI credentials.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleUpload} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "1rem" }}>
      <h2 style={{ marginTop: 0 }}>Upload Meeting Recording</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <input
          type="text"
          placeholder="Optional title (defaults to file name)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ padding: "0.5rem 0.75rem", borderRadius: 6, border: "1px solid #ccc" }}
        />
        <input
          type="file"
          accept="video/*"
          onChange={(e) => {
            setFile(e.target.files[0]);
            setError("");
          }}
        />
        <small style={{ color: "#6b7280" }}>
          Max file size: {uploadLimitMb} MB · Accepted types: video/*
        </small>
        {error && <p style={{ color: "red", margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={uploading || !file}
          style={{
            alignSelf: "flex-start",
            padding: "0.5rem 0.9rem",
            borderRadius: 6,
            border: "none",
            background: uploading ? "#9ca3af" : "#16a34a",
            color: "white",
            cursor: uploading ? "default" : "pointer"
          }}
        >
          {uploading ? "Uploading & processing..." : "Upload & Process"}
        </button>
      </div>
    </form>
  );
}
