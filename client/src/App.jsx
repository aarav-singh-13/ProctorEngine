import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/login_page.jsx';
import ExamPage from './pages/exam_page.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/exam" element={<ExamPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
