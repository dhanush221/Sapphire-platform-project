import app from './app.js';
import { scheduleReminderJob } from '../jobs/reminders.js';

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
    scheduleReminderJob();
  });
}
