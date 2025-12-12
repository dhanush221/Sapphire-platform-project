const { AssemblyAI } = require("assemblyai");

const rawApiKey = (process.env.ASSEMBLYAI_API_KEY || "").trim();
const hasApiKey = rawApiKey.length > 0;
const requestedMode = (process.env.AI_MODE || (hasApiKey ? "live" : "mock")).toLowerCase();
const mode = requestedMode === "live" && hasApiKey ? "live" : "mock";

if (requestedMode === "live" && !hasApiKey) {
  console.warn("[AI] AI_MODE=live but ASSEMBLYAI_API_KEY missing. Falling back to mock mode.");
}
if (mode === "mock") {
  console.info("[AI] AssemblyAI mock mode enabled. Returning placeholder transcripts/summaries.");
}

const SUMMARY_MODEL = process.env.ASSEMBLYAI_SUMMARY_MODEL || "informative";
const SUMMARY_TYPE = process.env.ASSEMBLYAI_SUMMARY_TYPE || "bullets";
let assemblyClient = null;
if (mode === "live") {
  assemblyClient = new AssemblyAI({
    apiKey: rawApiKey
  });
}

function buildMockTranscript(metadata = {}) {
  const title = metadata.title || metadata.originalName || "Meeting";
  return `Mock transcript for "${title}". Provide an AssemblyAI API key to enable real transcriptions.`;
}

function buildMockSummary(metadata = {}) {
  const meetingTitle = metadata.title || metadata.originalName || "Meeting";
  return `### Summary
- ${meetingTitle} was processed in mock mode. Enable ASSEMBLYAI_API_KEY + AI_MODE=live for real summaries.`;
}

function buildMockActionItems(metadata = {}) {
  const meetingTitle = metadata.title || metadata.originalName || "Meeting";
  return `### Action Items
- [Owner] Configure AssemblyAI credentials to capture action items for ${meetingTitle}.`;
}

function formatActionItems(results = []) {
  if (!results.length) {
    return "No action items detected.";
  }
  const topItems = results.slice(0, 5).map((item) => {
    const score = item.relevance ? `${Math.round(item.relevance * 100)}%` : "n/a";
    return `- ${item.text} (relevance ${score})`;
  });
  return `### Action Items\n${topItems.join("\n")}`;
}

async function generateMeetingInsights(filePath, metadata = {}) {
  if (mode === "mock" || !filePath) {
    return {
      transcriptText: buildMockTranscript(metadata),
      summary: buildMockSummary(metadata),
      actionItems: buildMockActionItems(metadata)
    };
  }

  const transcript = await assemblyClient.transcripts.transcribe({
    audio: filePath,
    summarization: true,
    summary_model: SUMMARY_MODEL,
    summary_type: SUMMARY_TYPE,
    auto_highlights: true
  });

  return {
    transcriptText: transcript.text || "",
    summary: transcript.summary
      ? Array.isArray(transcript.summary) ? transcript.summary.join("\n") : transcript.summary
      : "",
    actionItems: formatActionItems(transcript.auto_highlights?.results || [])
  };
}

module.exports = {
  mode,
  generateMeetingInsights
};
