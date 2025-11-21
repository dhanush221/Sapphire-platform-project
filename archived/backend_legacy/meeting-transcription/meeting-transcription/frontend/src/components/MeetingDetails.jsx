import React from "react";
import { resolveMediaUrl } from "../lib/api";

export default function MeetingDetails({ meeting }) {
  if (!meeting) return null;

  const hasVideo = !!meeting.videoUrl;
  const hasAudio = !!meeting.audioUrl;
  const videoSrc = resolveMediaUrl(meeting.videoUrl);
  const audioSrc = resolveMediaUrl(meeting.audioUrl);

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "0.75rem", maxHeight: 500, overflowY: "auto" }}>
      <h3 style={{ marginTop: 0 }}>{meeting.title}</h3>
      <div style={{ fontSize: 12, color: "#666", marginBottom: "0.5rem" }}>
        Recorded on {new Date(meeting.createdAt).toLocaleString()}
      </div>

      {hasVideo && (
        <div style={{ marginBottom: "0.75rem" }}>
          <video
            controls
            src={videoSrc}
            style={{ width: "100%", borderRadius: 6, border: "1px solid #e5e7eb" }}
          />
        </div>
      )}
      {hasAudio && (
        <div style={{ marginBottom: "0.75rem" }}>
          <audio
            controls
            src={audioSrc}
            style={{ width: "100%" }}
          />
        </div>
      )}

      <section style={{ marginBottom: "0.75rem" }}>
        <h4>Summary & Notes</h4>
        <div
          style={{
            whiteSpace: "pre-wrap",
            fontSize: 14,
            background: "#f9fafb",
            padding: "0.5rem",
            borderRadius: 4,
            border: "1px solid #e5e7eb"
          }}
        >
          {meeting.notes || "No summary available."}
        </div>
      </section>

      <section style={{ marginBottom: "0.75rem" }}>
        <h4>Action Items</h4>
        <div
          style={{
            whiteSpace: "pre-wrap",
            fontSize: 14,
            background: "#f9fafb",
            padding: "0.5rem",
            borderRadius: 4,
            border: "1px solid #e5e7eb"
          }}
        >
          {meeting.actionItems || "No action items extracted."}
        </div>
      </section>

      <section>
        <h4>Full Transcript</h4>
        <div
          style={{
            whiteSpace: "pre-wrap",
            fontSize: 13,
            background: "#f9fafb",
            padding: "0.5rem",
            borderRadius: 4,
            border: "1px solid #e5e7eb"
          }}
        >
          {meeting.transcript || "No transcript available."}
        </div>
      </section>
    </div>
  );
}
