import { Link } from 'react-router-dom';
import { useProgressStore } from '../stores/progressStore';

export default function Home() {
  const { level, totalXP, streak, completedLessons } = useProgressStore();

  const cards = [
    { to: '/play', emoji: '🎲', title: 'Practice Board', desc: 'Play interactively and learn by doing', color: 'bg-amber-50 border-amber-200' },
    { to: '/lessons', emoji: '📖', title: 'Lessons', desc: 'Structured curriculum from beginner to expert', color: 'bg-emerald-50 border-emerald-200' },
    { to: '/quizzes', emoji: '🎯', title: 'Quizzes', desc: 'Scenario-based challenges to test your skills', color: 'bg-blue-50 border-blue-200' },
    { to: '/coach', emoji: '🤖', title: 'AI Coach', desc: 'Ask anything — get expert Gemini-powered advice', color: 'bg-purple-50 border-purple-200' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">♟</div>
        <h1 className="text-4xl font-bold font-serif text-wood-dark mb-3">
          Master Backgammon
        </h1>
        <p className="text-lg text-wood font-serif max-w-xl mx-auto">
          From beginner to expert — with interactive lessons, scenario quizzes, and an AI coach powered by Gemini.
        </p>
      </div>

      {/* Progress bar */}
      <div className="bg-white border border-wood/30 rounded-2xl p-5 mb-8 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="font-bold font-serif text-wood-dark capitalize">{level} Level</p>
              <p className="text-sm text-wood font-serif">{completedLessons.length} lessons completed · {totalXP} XP</p>
            </div>
          </div>
          {streak > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">🔥 {streak}</p>
              <p className="text-xs text-wood font-serif">day streak</p>
            </div>
          )}
        </div>
        <div className="w-full bg-wood/20 rounded-full h-2.5">
          <div
            className="bg-gold h-2.5 rounded-full transition-all"
            style={{ width: `${Math.min((totalXP / 500) * 100, 100)}%` }}
          />
        </div>
        <p className="text-xs text-wood mt-1 font-serif text-right">{totalXP} / 500 XP to next level</p>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-2 gap-4">
        {cards.map(({ to, emoji, title, desc, color }) => (
          <Link
            key={to}
            to={to}
            className={`${color} border-2 rounded-2xl p-5 hover:shadow-md transition-all hover:-translate-y-0.5`}
          >
            <div className="text-3xl mb-2">{emoji}</div>
            <h2 className="font-bold font-serif text-wood-dark text-lg mb-1">{title}</h2>
            <p className="text-sm text-wood font-serif">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
