import { listUpcomingDeadlines, createDeadline } from './api.js';

function humanCountdown(due) {
  const ms = +new Date(due) - Date.now();
  if (ms <= 0) return 'Due now';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d} day${d > 1 ? 's' : ''} remaining` : `${h} hour${h > 1 ? 's' : ''} remaining`;
}

function renderUpcoming(deadlines) {
  const container = document.querySelector('#deadlines .deadline-grid .card .card__body');
  if (!container) return;
  container.innerHTML = deadlines.map(d => {
    const due = new Date(d.due_at);
    const day = due.getDate();
    const mon = due.toLocaleDateString(undefined, { month: 'short' });
    const urgency = d.priority === 'urgent' ? 'urgent' : 'normal';
    return `
      <div class="deadline-item ${urgency}">
        <div class="deadline-date">
          <span class="day">${day}</span>
          <span class="month">${mon}</span>
        </div>
        <div class="deadline-info">
          <h4>${d.task_title || d.title}</h4>
          <div class="countdown" data-due="${d.due_at}">${humanCountdown(d.due_at)}</div>
        </div>
      </div>
    `;
  }).join('');
}

function tickCountdowns() {
  document.querySelectorAll('.countdown').forEach(el => {
    const due = el.getAttribute('data-due');
    el.textContent = humanCountdown(due);
  });
}

async function loadDeadlines() {
  const data = await listUpcomingDeadlines();
  renderUpcoming(data);
}

function wireForm() {
  const form = document.querySelector('#deadlines .deadline-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = form.querySelector('input[placeholder="Enter task title"]').value.trim();
    const due = form.querySelector('input[type="date"]').value;
    const priority = form.querySelector('select').value.toLowerCase();
    if (!title || !due) return alert('Please enter title and due date.');

    // create linked task + deadline
    const task = await createTask({ title, status: 'pending', priority });
    await createDeadline({
      task_id: task.id,
      due_at: new Date(due).toISOString(),
      priority: priority === 'high' ? 'urgent' : 'normal',
      note: null,
      reminder_offsets: [1440, 180] // 1 day, 3 hours
    });
    form.reset();
    await loadDeadlines();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadDeadlines();
  wireForm();
  setInterval(tickCountdowns, 60 * 1000);
});
