export default function ResourcesPage() {
  return (
    <section id="resources" className="content-section active">
      <div className="section-header">
        <h2>Resource Library</h2>
        <div className="search-box">
          <input type="text" placeholder="Search resources..." className="form-control" />
          <i className="fas fa-search"></i>
        </div>
      </div>
      <div className="resources-grid">
        <div className="card">
          <div className="card__header"><h3><i className="fas fa-comments"></i> Communication</h3></div>
          <div className="card__body">
            <div className="resource-item">
              <div className="resource-icon"><i className="fas fa-envelope"/></div>
              <div className="resource-info"><h4>Email Writing Templates</h4><p>Professional email templates for common workplace situations</p></div>
              <button className="btn btn--outline btn--sm">View</button>
            </div>
            <div className="resource-item">
              <div className="resource-icon"><i className="fas fa-handshake"/></div>
              <div className="resource-info"><h4>Meeting Etiquette Guide</h4><p>Best practices for participating in workplace meetings</p></div>
              <button className="btn btn--outline btn--sm">View</button>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card__header"><h3><i className="fas fa-briefcase"></i> Workplace Skills</h3></div>
          <div className="card__body">
            <div className="resource-item">
              <div className="resource-icon"><i className="fas fa-clock"/></div>
              <div className="resource-info"><h4>Time Management Strategies</h4><p>Techniques for managing time and priorities effectively</p></div>
              <button className="btn btn--outline btn--sm">View</button>
            </div>
            <div className="resource-item">
              <div className="resource-icon"><i className="fas fa-diagram-project"/></div>
              <div className="resource-info"><h4>Project Planning Template</h4><p>Step-by-step template for planning internship projects</p></div>
              <button className="btn btn--outline btn--sm">View</button>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card__header"><h3><i className="fas fa-user-shield"></i> Self-Advocacy</h3></div>
          <div className="card__body">
            <div className="resource-item">
              <div className="resource-icon"><i className="fas fa-file-signature"/></div>
              <div className="resource-info"><h4>Accommodation Request Guide</h4><p>How to request workplace accommodations professionally</p></div>
              <button className="btn btn--outline btn--sm">View</button>
            </div>
            <div className="resource-item">
              <div className="resource-icon"><i className="fas fa-heart"/></div>
              <div className="resource-info"><h4>Stress Management Techniques</h4><p>Strategies for managing stress and overwhelm at work</p></div>
              <button className="btn btn--outline btn--sm">View</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

