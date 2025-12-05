import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTasks } from '../../lib/hooks/useTasks';
import { useAuth } from '../../context/AuthContext.jsx';
import { useMoods } from '../../lib/hooks/useMoods.js';

const ENERGY_LEVELS = [
  { value: 1, label: 'Very Low Energy', color: '#ef4444' },
  { value: 2, label: 'Low Energy', color: '#f97316' },
  { value: 3, label: 'Moderate Energy', color: '#facc15' },
  { value: 4, label: 'High Energy', color: '#22c55e' },
  { value: 5, label: 'Very High Energy', color: '#10b981' },
]

export default function DashboardPage() {
  const { tasks, refresh: refreshTasks } = useTasks();
  const { user } = useAuth();
  const { entries: moodEntries, trendPoints, loading: moodLoading, saving: moodSaving, error: moodError, refresh: refreshMoods, create: createMoodEntry } = useMoods({ autoRefresh: true });
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);

  const todayList = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    const all = (tasks || []).filter(t => t.dueDate && t.dueDate.startsWith && t.dueDate.startsWith(todayStr));
    return all.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')).slice(0, 3);
  }, [tasks]);

  const energyInfo = ENERGY_LEVELS.find(l => l.value === energy) || ENERGY_LEVELS[3];

  useEffect(() => { refreshTasks(); }, [refreshTasks]);

  useEffect(() => {
    if (moodEntries && moodEntries.length > 0) {
      setMood(moodEntries[0].mood ?? 3);
      setEnergy(moodEntries[0].energy ?? 3);
    }
  }, [moodEntries]);

  const emojiFor = (v) => {
    if (v === 5) return String.fromCodePoint(0x1F604);
    if (v === 4) return String.fromCodePoint(0x1F642);
    if (v === 3) return String.fromCodePoint(0x1F610);
    if (v === 2) return String.fromCodePoint(0x1F61F);
    return String.fromCodePoint(0x1F61E);
  };

  const handleCheckIn = async () => {
    try {
      await createMoodEntry({ mood, energy });
    } catch (err) {
      alert(err?.message || 'Failed to save check-in');
    }
  };

  const supportTip = useMemo(() => supportTipFor(mood, energy, moodEntries?.[0]), [mood, energy, moodEntries]);

  return (
    <section id="dashboard" className="content-section active">
      <div className="dashboard-container">
        <div className="welcome-section">
          <h1 id="greetingTitle">{(() => {
            const h = new Date().getHours();
            let g = 'Hello';
            if (h>=5 && h<12) g='Good Morning'; else if(h>=12 && h<17) g='Good Afternoon'; else if (h>=17 && h<21) g='Good Evening'; else g='Good Night';
            return `${g}, ${user?.name || 'User'}!`
          })()}</h1>
          <p className="date-display" id="currentDateTitle">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="dashboard-grid">
          <div className="card dashboard-card">
            <div className="card__header"><h3><i className="fas fa-tasks"></i> Today’s Tasks</h3></div>
            <div className="card__body" id="dashboardTodayTasks">
              {todayList.length === 0 ? (
                <div className="task-mini-empty">No tasks due today</div>
              ) : (
                todayList.map(t => {
                  const time = t.dueDate ? new Date(t.dueDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''
                  return (
                    <div key={t.id} className="task-mini-row">
                      <span className="task-mini-title">{t.title}</span>
                      <span className="task-mini-time">{time}</span>
                    </div>
                  )
                })
              )}
              <Link className="btn btn--outline btn--sm" to="/tasks">View All Tasks</Link>
            </div>
          </div>
          <div className="card dashboard-card">
            <div className="card__header"><h3><i className="fas fa-heart"></i> How are you feeling?</h3></div>
            <div className="card__body">
              <div className="mood-checkin">
                <div className="mood-options">
                  {[1,2,3,4,5].map(v => (
                    <button
                      key={v}
                      className={`mood-btn${mood===v?' selected':''}`}
                      data-mood={v}
                      onClick={()=> setMood(v)}
                      style={{ fontFamily: 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif' }}
                      aria-label={`Mood ${v}`}
                    >
                      {emojiFor(v)}
                    </button>
                  ))}
                </div>
                <div className="energy-level">
                  <label>Energy Level:</label>
                  <input type="range" id="energySlider" min="1" max="5" value={energy} className="energy-slider" onChange={(e)=> setEnergy(parseInt(e.target.value,10))} />
                  <span id="energyLabel" style={{ color: energyInfo.color }}>{energyInfo.label}</span>
                </div>
                <div className="mood-actions">
                  <button className="btn btn--primary btn--sm" onClick={handleCheckIn} disabled={moodSaving}>
                    {moodSaving ? 'Saving...' : 'Log check-in'}
                  </button>
                  <button className="btn btn--outline btn--sm" onClick={refreshMoods} disabled={moodLoading}>
                    <i className="fas fa-sync-alt" aria-hidden /> Refresh
                  </button>
                </div>
                {moodError && <div className="mood-error">{moodError}</div>}
                {supportTip && (
                  <div className="support-tip">
                    <div className="support-icon"><i className="fas fa-lightbulb" aria-hidden /></div>
                    <div>
                      <div className="support-text">{supportTip.text}</div>
                      {supportTip.cta && <Link to={supportTip.cta.href} className="support-cta">{supportTip.cta.label}</Link>}
                    </div>
                  </div>
                )}
                <div className="mood-summary">
                  <div className="mood-history-card">
                    <div className="mood-block-header">
                      <span>Last 7 check-ins</span>
                      <span className="mood-block-hint">{moodEntries?.length || 0} logged</span>
                    </div>
                    <div className="mood-history">
                      {(moodEntries || []).length === 0 ? (
                        <div className="mood-history-empty">No check-ins yet. Log today’s mood to start your trend.</div>
                      ) : (
                        (moodEntries || []).map(entry => (
                          <div key={entry.id} className="mood-history-row">
                            <div>
                              <div className="mood-history-date">{formatDate(entry.createdAt)}</div>
                              <div className="mood-history-time">{formatTime(entry.createdAt)}</div>
                            </div>
                            <div className="mood-history-values">
                              <span className="mood-chip">{emojiFor(entry.mood)} Mood {entry.mood}</span>
                              <span className="energy-chip">⚡ Energy {entry.energy}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="mood-trend-card">
                    <div className="mood-block-header">
                      <span>Trend (7 days)</span>
                    </div>
                    <MoodSparkline points={trendPoints} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="card dashboard-card">
            <div className="card__header"><h3><i className="fas fa-lightning-bolt"></i> Quick Actions</h3></div>
            <div className="card__body">
              <div className="quick-actions">
                <Link className="btn btn--primary btn--sm" to="/tasks"><i className="fas fa-plus"></i> Add Task</Link>
                <Link className="btn btn--secondary btn--sm" to="/meetings"><i className="fas fa-microphone"></i> View Meetings</Link>
                <Link className="btn btn--outline btn--sm" to="/resources"><i className="fas fa-book-open"></i> Browse Resources</Link>
              </div>
            </div>
          </div>
          <div className="card dashboard-card architecture-card">
            <div className="card__header"><h3><i className="fas fa-sitemap"></i> Platform Overview</h3></div>
            <div className="card__body">
              <div className="architecture-wrapper">
                <img src="https://ppl-ai-code-interpreter-files.s3.amazonaws.com/web/direct-files/7e33f05c8d808293b50d3f649bf25bc8/3be4b797-0364-435f-a482-491a0e47e812/94050b70.png" alt="Platform Architecture Diagram" className="architecture-diagram" onError={(e)=>{e.currentTarget.style.display='none'; const next=e.currentTarget.nextElementSibling; if(next) next.style.display='block'}} />
                <div className="image-fallback" style={{display:'none'}}>
                  <p>Platform Architecture: Central hub connecting Organization Tools, Deadline Management, Meeting Transcription, Resource Library, Flexible Workflows, and Optional Supports.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card dashboard-card journey-card">
            <div className="card__header"><h3><i className="fas fa-route"></i> Your Internship Journey</h3></div>
            <div className="card__body">
              <div className="journey-wrapper">
                <img src="https://ppl-ai-code-interpreter-files.s3.amazonaws.com/web/direct-files/7e33f05c8d808293b50d3f649bf25bc8/71ff4dd6-6d52-4e91-a314-33a234d2d592/40c04daf.png" alt="Student User Journey" className="journey-diagram" onError={(e)=>{e.currentTarget.style.display='none'; const next=e.currentTarget.nextElementSibling; if(next) next.style.display='block'}} />
                <div className="image-fallback" style={{display:'none'}}>
                  <p>Your journey through the platform: Onboarding → Daily Check-ins → Task Management → Meeting Support → Resources Access → Weekly Review</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function supportTipFor(mood, energy, lastEntry) {
  const lowThreshold = 2;
  const currentLow = mood <= lowThreshold || energy <= lowThreshold;
  const lastLow = lastEntry && (lastEntry.mood <= lowThreshold || lastEntry.energy <= lowThreshold);
  if (!currentLow && !lastLow) return null;
  if (mood <= lowThreshold && energy <= lowThreshold) {
    return {
      text: 'Mood and energy look low. Take a 10-minute break, hydrate, and step away from the screen.',
      cta: { href: '/resources', label: 'Browse calming resources' }
    };
  }
  if (energy <= lowThreshold) {
    return {
      text: 'Energy is low. Try a quick stretch or short walk to reset.',
      cta: { href: '/tasks', label: 'Schedule a 10-minute break' }
    };
  }
  return {
    text: 'Mood seems low. Write one small win or ask for help if you need it.',
    cta: { href: '/help-requests', label: 'Ask for help' }
  };
}

function MoodSparkline({ points = [] }) {
  if (!points || points.length === 0) {
    return <div className="mood-chart-empty">No check-ins yet.</div>;
  }

  const width = 280;
  const height = 120;
  const pad = 12;
  const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;
  const valueToY = (val) => {
    const clamped = Math.min(5, Math.max(1, val || 1));
    const normalized = (clamped - 1) / 4;
    return height - pad - normalized * (height - pad * 2);
  };

  const buildLine = (key) => {
    const coords = points
      .map((p, idx) => {
        const val = p[key];
        if (val === null || typeof val === 'undefined') return null;
        const x = pad + step * idx;
        const y = valueToY(val);
        return `${x},${y}`;
      })
      .filter(Boolean)
      .join(' ');
    return coords || null;
  };

  const moodLine = buildLine('moodAvg');
  const energyLine = buildLine('energyAvg');
  const labels = points.map((p) => p.date?.slice(5) || '');

  return (
    <div className="mood-chart">
      <svg width="100%" height="120" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Mood and energy trend">
        <line x1={pad} x2={width - pad} y1={valueToY(3)} y2={valueToY(3)} className="mood-chart-baseline" />
        {moodLine && <polyline points={moodLine} className="mood-line" />}
        {energyLine && <polyline points={energyLine} className="energy-line" />}
      </svg>
      <div className="mood-chart-legend">
        <span className="legend-item"><span className="legend-dot mood-dot" />Mood</span>
        <span className="legend-item"><span className="legend-dot energy-dot" />Energy</span>
        <span className="legend-item legend-muted">Last {points.length} days</span>
      </div>
      <div className="mood-chart-axis">
        {labels.map(label => <span key={label}>{label}</span>)}
      </div>
    </div>
  );
}
