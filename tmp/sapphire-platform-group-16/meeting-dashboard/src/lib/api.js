const api = {
  getDeadlines: async () => [
    { id: 1, task: "Submit report", due: "2025-11-05" },
    { id: 2, task: "Team meeting", due: "2025-11-07" },
  ],
  getTasks: async () => [
    { id: 1, name: "Finish documentation", completed: false },
    { id: 2, name: "Design UI mockups", completed: true },
  ],
};

export default api;
