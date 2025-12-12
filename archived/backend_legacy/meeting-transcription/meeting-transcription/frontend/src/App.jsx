import React, { useEffect, useState } from "react";
import MeetingUpload from "./components/MeetingUpload";
import MeetingList from "./components/MeetingList";
import MeetingDetails from "./components/MeetingDetails";
import api from "./lib/api";

export default function App() {
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function syncSelected(meetingList) {
    setMeetings(meetingList);
    setSelectedMeeting((current) => {
      if (!meetingList.length) return null;
      if (current) {
        const existing = meetingList.find((m) => m.id === current.id);
        if (existing) return existing;
      }
      return meetingList[0];
    });
  }

  async function loadMeetings() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/meetings");
      syncSelected(res.data);
    } catch (err) {
      console.error(err);
      const serverError = err.response?.data?.error;
      setError(serverError || "Failed to load meetings. Check the backend service.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!search.trim()) {
      return loadMeetings();
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/meetings/search/query", {
        params: { q: search }
      });
      syncSelected(res.data);
    } catch (err) {
      console.error(err);
      const serverError = err.response?.data?.error;
      setError(serverError || "Search failed. Please retry.");
    } finally {
      setLoading(false);
    }
  }

  function handleMeetingUploaded(createdMeeting) {
    if (!createdMeeting) {
      loadMeetings();
      return;
    }

    setMeetings((current) => {
      const deduped = current.filter((m) => m.id !== createdMeeting.id);
      return [createdMeeting, ...deduped];
    });
    setSelectedMeeting(createdMeeting);
  }

  useEffect(() => {
    loadMeetings();
  }, []);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "1.5rem", maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Meeting Transcription & Notes</h1>
          <p style={{ margin: 0, color: "#555" }}>
            Upload recordings, get transcripts, summaries, and action items.
          </p>
        </div>
      </header>

      <section style={{ marginBottom: "1.5rem" }}>
        <MeetingUpload onUploaded={handleMeetingUploaded} />
        {error && (
          <p style={{ color: "red", marginTop: "0.5rem" }}>
            {error}
          </p>
        )}
      </section>

      <section style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.5rem", flex: 1 }}>
          <input
            type="text"
            placeholder="Search by title, transcript, notes or action items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: "0.5rem 0.75rem",
              borderRadius: 6,
              border: "1px solid #ccc"
            }}
          />
          <button
            type="submit"
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: 6,
              border: "none",
              background: "#2563eb",
              color: "white",
              cursor: "pointer"
            }}
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              loadMeetings();
            }}
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: 6,
              border: "1px solid #ccc",
              background: "white",
              cursor: "pointer"
            }}
          >
            Reset
          </button>
        </form>
      </section>

      <main style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr", gap: "1rem", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ marginTop: 0 }}>Meetings</h2>
          {loading && <p>Loading...</p>}
          <MeetingList
            meetings={meetings}
            selectedId={selectedMeeting?.id}
            onSelect={setSelectedMeeting}
          />
        </div>
        <div>
          <h2 style={{ marginTop: 0 }}>Details</h2>
          {selectedMeeting ? (
            <MeetingDetails meeting={selectedMeeting} />
          ) : (
            <p style={{ color: "#666" }}>Select a meeting to view transcript, notes and action items.</p>
          )}
        </div>
      </main>
    </div>
  );
}
