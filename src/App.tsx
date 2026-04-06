import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/ui/Header';
import Home from './pages/Home';
import LessonsPage from './pages/LessonsPage';
import LessonPage from './pages/LessonPage';
import QuizzesPage from './pages/QuizzesPage';
import QuizPage from './pages/QuizPage';
import CoachPage from './pages/CoachPage';
import PlayPage from './pages/PlayPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-parchment">
        <Header />
        <main className="pb-12">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/play" element={<PlayPage />} />
            <Route path="/lessons" element={<LessonsPage />} />
            <Route path="/lessons/:id" element={<LessonPage />} />
            <Route path="/quizzes" element={<QuizzesPage />} />
            <Route path="/quizzes/:id" element={<QuizPage />} />
            <Route path="/coach" element={<CoachPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
