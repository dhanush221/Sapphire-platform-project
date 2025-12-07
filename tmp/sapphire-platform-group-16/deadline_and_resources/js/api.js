const API_BASE = 'http://localhost:5000'; // update if backend uses proxy

export async function listTasks(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/tasks${qs ? `?${qs}` : ''}`);
  return res.json();
}

export async function createTask(payload) {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function updateTask(id, payload) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function deleteTask(id) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function reorderTask(payload) {
  const res = await fetch(`${API_BASE}/tasks/reorder`, {
    method: 'PATCH',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  return res.json();
}

// Deadlines
export async function listUpcomingDeadlines() {
  const res = await fetch(`${API_BASE}/deadlines/upcoming`);
  return res.json();
}

export async function createDeadline(payload) {
  const res = await fetch(`${API_BASE}/deadlines`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  return res.json();
}
