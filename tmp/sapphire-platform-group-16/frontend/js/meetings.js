// meetings.js

// Initialize meeting tab buttons and content toggling
export function initializeMeetingTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const tab = this.getAttribute('data-tab');

      // Update tab buttons active state
      tabButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');

      // Show corresponding tab content
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === tab) {
          content.classList.add('active');
        }
      });
    });
  });
}

// Initialize upload form for meeting transcription
export function initializeMeetingUpload() {
  const uploadForm = document.getElementById('meetingUploadForm');
  const fileInput = document.getElementById('meetingFile');
  const output = document.getElementById('meetingOutput');
  const uploadBtn = document.getElementById('meetingUploadBtn');
  if (!uploadForm || !fileInput || !output || !uploadBtn) return;

  // Compute API base like api.js does so POST goes to backend even if
  // the frontend is served from a different origin (e.g., :5500).
  const BASE = (() => {
    if (typeof window === 'undefined' || !window.location) return 'http://localhost:5000';
    const { protocol, hostname, port } = window.location;
    if (port === '5000') return `${protocol}//${hostname}:${port}`;
    return `${protocol}//${hostname}:5000`;
  })();

  // Prevent any accidental form submission
  uploadForm.addEventListener('submit', (e) => { e.preventDefault(); e.stopPropagation(); return false; });

  uploadBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[meetings] upload click');
    uploadBtn.disabled = true;

    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      alert('Select a recording first!');
      uploadBtn.disabled = false;
      return false;
    }

    const form = new FormData();
    form.append('audio', file);

    // Pull email from stored user object
    let email = null;
    try {
      const u = JSON.parse(localStorage.getItem('sapphireUser') || '{}');
      email = u.email || null;
    } catch {}

    try {
      const res = await fetch(`${BASE}/api/meetings/upload`, {
        method: 'POST',
        headers: email ? { 'x-user-email': email } : {},
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        let errObj = { error: res.statusText };
        try { if (text) errObj = JSON.parse(text); } catch {}
        output.innerHTML = `<div class="error">Upload failed: ${errObj.error || 'Unknown error'}</div>`;
        console.error('[meetings] upload error', errObj);
        uploadBtn.disabled = false;
        return false;
      }

      const data = await res.json();
      const m = data.meeting || {};
      output.innerHTML = `
        <h3>${m.title || 'Meeting'}</h3>
        <h4>Summary</h4>
        <p>${m.summary || ''}</p>

        <h4>Action Items</h4>
        <ul>${(m.actionItems || []).map(ai => `<li>• ${ai.text}</li>`).join('')}</ul>

        <details>
          <summary>Full Transcript</summary>
          <p>${m.transcript || ''}</p>
        </details>
      `;

      // Keep user on Meetings section
      if (window.showSection) {
        try { window.showSection('meetings'); } catch {}
      }
    } catch (err) {
      console.error('[meetings] upload fetch failed', err);
      output.innerHTML = `<div class="error">Upload failed: network or CORS error</div>`;
    } finally {
      uploadBtn.disabled = false;
    }
  });
}

// Show meeting details section and scroll to it smoothly
export function showMeetingDetails() {
  const meetingDetails = document.getElementById('meetingDetails');
  if (meetingDetails) {
    meetingDetails.style.display = 'block';
    meetingDetails.scrollIntoView({ behavior: 'smooth' });
  }
}

