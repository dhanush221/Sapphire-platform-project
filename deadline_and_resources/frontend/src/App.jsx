import { Routes, Route, Navigate } from 'react-router-dom'

import AppLayout from './layouts/AppLayout.jsx'
import DeadlinesPage from './features/deadlines/DeadlinesPage.jsx'
import ResourcesPage from './features/resources/ResourcesPage.jsx'

import HelpRequestsPage from './features/help/HelpRequestsPage.jsx'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* My default route will go to Deadlines */}
        <Route index element={<Navigate to="/deadlines" replace />} />
        <Route path="/deadlines" element={<DeadlinesPage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/help-requests" element={<HelpRequestsPage />} />
      </Route>

      {/* Fallback if anything unknown goes to Deadlines */}
      <Route path="*" element={<Navigate to="/deadlines" replace />} />
    </Routes>
  )
}

export default App
