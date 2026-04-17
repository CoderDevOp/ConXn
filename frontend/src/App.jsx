import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { StudentLayout } from './pages/student/StudentLayout'
import { StudentChoicePage } from './pages/student/StudentChoicePage'
import { StudentMentorshipPage } from './pages/student/StudentMentorshipPage'
import { StudentEventsPage } from './pages/student/StudentEventsPage'
import { AlumniLayout } from './pages/alumni/AlumniLayout'
import { AlumniChoicePage } from './pages/alumni/AlumniChoicePage'
import { AlumniMentorPage } from './pages/alumni/AlumniMentorPage'
import { AlumniDiscoverPage } from './pages/alumni/AlumniDiscoverPage'
import { AlumniChatsPage } from './pages/alumni/AlumniChatsPage'
import { OrganizationWorkspacePage } from './pages/OrganizationWorkspacePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/organization" element={<OrganizationWorkspacePage />} />
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentChoicePage />} />
          <Route path="mentorship" element={<StudentMentorshipPage />} />
          <Route path="events" element={<StudentEventsPage />} />
        </Route>
        <Route path="/alumni" element={<AlumniLayout />}>
          <Route index element={<AlumniChoicePage />} />
          <Route path="mentor" element={<AlumniMentorPage />} />
          <Route path="discover" element={<AlumniDiscoverPage />} />
          <Route path="chats" element={<AlumniChatsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
