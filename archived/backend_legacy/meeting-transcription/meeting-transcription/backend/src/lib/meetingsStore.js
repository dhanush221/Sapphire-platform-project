const fs = require("fs");
const path = require("path");
const STORAGE_MODE = (process.env.STORAGE_MODE || "file").toLowerCase();
let PrismaClient;
if (STORAGE_MODE === "database") {
  ({ PrismaClient } = require("@prisma/client"));
}

function createDatabaseStore() {
  const prisma = new PrismaClient();

  return {
    mode: "database",
    async createMeeting(data) {
      return prisma.meeting.create({ data });
    },
    async listMeetings() {
      return prisma.meeting.findMany({
        orderBy: { createdAt: "desc" }
      });
    },
    async getMeetingById(id) {
      return prisma.meeting.findUnique({ where: { id } });
    },
    async searchMeetings(query) {
      return prisma.meeting.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { transcript: { contains: query, mode: "insensitive" } },
            { notes: { contains: query, mode: "insensitive" } },
            { actionItems: { contains: query, mode: "insensitive" } }
          ]
        },
        orderBy: { createdAt: "desc" }
      });
    }
  };
}

function createFileStore() {
  const dataDir = path.join(__dirname, "..", "..", "data");
  const dataFile = path.join(dataDir, "meetings.json");

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  function load() {
    try {
      const raw = fs.readFileSync(dataFile, "utf-8");
      return JSON.parse(raw);
    } catch (err) {
      return [];
    }
  }

  let cache = load();
  let lastId = cache.reduce((max, meeting) => Math.max(max, meeting.id || 0), 0);

  function persist() {
    fs.writeFileSync(dataFile, JSON.stringify(cache, null, 2));
  }

  function normalizeMeeting(meeting) {
    return {
      ...meeting,
      createdAt: meeting.createdAt || new Date().toISOString()
    };
  }

  cache = cache.map(normalizeMeeting);

  function sortMeetings(list) {
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return {
    mode: "file",
    async createMeeting(data) {
      const meeting = normalizeMeeting({
        ...data,
        id: ++lastId,
        createdAt: new Date().toISOString()
      });
      cache.push(meeting);
      persist();
      return meeting;
    },
    async listMeetings() {
      return sortMeetings(cache);
    },
    async getMeetingById(id) {
      return cache.find((meeting) => meeting.id === id) || null;
    },
    async searchMeetings(query) {
      const q = query.toLowerCase();
      const filterText = (value) => (value || "").toLowerCase().includes(q);
      const results = cache.filter((meeting) =>
        filterText(meeting.title) ||
        filterText(meeting.transcript) ||
        filterText(meeting.notes) ||
        filterText(meeting.actionItems)
      );
      return sortMeetings(results);
    }
  };
}

const store = STORAGE_MODE === "database"
  ? createDatabaseStore()
  : createFileStore();

module.exports = store;
