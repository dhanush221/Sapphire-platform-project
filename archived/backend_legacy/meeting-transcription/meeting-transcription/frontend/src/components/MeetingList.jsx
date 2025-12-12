import React from "react";

export default function MeetingList({ meetings, selectedId, onSelect }) {
  if (!meetings.length) {
    return <p style={{ color: "#666" }}>No meetings yet. Upload your first recording above.</p>;
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "0.5rem", maxHeight: 500, overflowY: "auto" }}>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {meetings.map((m) => (
          <li key={m.id}>
            <button
              onClick={() => onSelect && onSelect(m)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "0.5rem 0.75rem",
                borderRadius: 6,
                border: "none",
                marginBottom: 4,
                cursor: "pointer",
                background: m.id === selectedId ? "#dbeafe" : "transparent"
              }}
            >
              <div style={{ fontWeight: 600 }}>{m.title}</div>
              <div style={{ fontSize: 12, color: "#666" }}>
                {new Date(m.createdAt).toLocaleString()}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
