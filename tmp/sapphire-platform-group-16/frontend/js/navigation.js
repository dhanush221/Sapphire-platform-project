// navigation.js

import { announceToScreenReader } from './state.js';
import { closeHelpModal } from './help.js';

let currentSection = 'dashboard';

function initializeNavigation() {
  // Query elements at init time to avoid early-evaluation issues
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(button => {
    button.addEventListener('click', function() {
      const section = this.getAttribute('data-section');
      showSection(section);
      setActiveNavButton(this);
    });
  });

  // Set initial active states
  showSection(currentSection);
  const initialNavButton = document.querySelector(`[data-section="${currentSection}"]`);
  if (initialNavButton) setActiveNavButton(initialNavButton);

  // Keyboard Navigation
  document.addEventListener('keydown', function(e) {
    const helpModal = document.getElementById('helpModal');
    if (e.key === 'Escape' && helpModal && !helpModal.classList.contains('hidden')) {
      closeHelpModal();
    }
    if (e.altKey) {
      switch(e.key) {
        case '1': e.preventDefault(); showSection('dashboard'); break;
        case '2': e.preventDefault(); showSection('tasks'); break;
        case '3': e.preventDefault(); showSection('deadlines'); break;
        case '4': e.preventDefault(); showSection('meetings'); break;
        case '5': e.preventDefault(); showSection('resources'); break;
        case '6': e.preventDefault(); showSection('settings'); break;
      }
    }
  });
}

function showSection(sectionId) {
  // Hide all sections (re-query to be robust)
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
    section.setAttribute('hidden', true);
  });

  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add('active');
    targetSection.removeAttribute('hidden');
    currentSection = sectionId;
    const sectionNames = {
      dashboard: 'Dashboard',
      tasks: 'Organization Tool',
      deadlines: 'Deadline Management',
      meetings: 'Meeting Transcription and Notes',
      resources: 'Resource Library',
      settings: 'Settings and Customization'
    };
    announceToScreenReader(`Navigated to ${sectionNames[sectionId] || sectionId}`);
  }
  const targetNavButton = document.querySelector(`[data-section="${sectionId}"]`);
  if (targetNavButton) setActiveNavButton(targetNavButton);
  window.scrollTo(0, 0);
}

function setActiveNavButton(activeButton) {
  document.querySelectorAll('.nav-btn').forEach(button => {
    button.classList.remove('active');
  });
  if (activeButton) activeButton.classList.add('active');
}

export { initializeNavigation, showSection, setActiveNavButton };
