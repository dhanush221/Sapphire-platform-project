import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import taskRoutes from "./routes/task.routes.js";
import deadlineRoutes from "./routes/deadline.routes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/tasks", taskRoutes);
app.use("/deadlines", deadlineRoutes);

app.get("/", (req, res) => res.send("✅ Sapphire API running with Prisma + PostgreSQL"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

// backend/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Routes
const tasksRouter = require('./routes/task');
const deadlinesRouter = require('./routes/deadline');

// Optional: reminder job
const { startReminderJob } = require('./jobs/reminders');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Register routes
app.use('/tasks', tasksRouter);
app.use('/deadlines', deadlinesRouter);

// Start reminder job (optional)
startReminderJob();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
