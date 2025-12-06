import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import ProfilePage from "./pages/ProfilePage";
import DeadlinesPage from "./pages/DeadlinesPage";

function App() {
  return (
    <Router>
      <div style={{ padding: 20 }}>
        <h1>📅 Meeting Dashboard</h1>
        <nav style={{ marginBottom: "20px" }}>
          <Link to="/profile">Profile</Link> |{" "}
          <Link to="/deadlines">Deadlines</Link>
        </nav>
        <Routes>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/deadlines" element={<DeadlinesPage />} />
          <Route path="*" element={<div>Welcome! Choose a page above.</div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
