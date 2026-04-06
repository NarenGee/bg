import { NavLink } from 'react-router-dom';
import { useProgressStore } from '../../stores/progressStore';

export default function Header() {
  const { totalXP, streak, level } = useProgressStore();

  const levelColors: Record<string, string> = {
    beginner: 'text-green-700 bg-green-100',
    intermediate: 'text-blue-700 bg-blue-100',
    advanced: 'text-orange-700 bg-orange-100',
    expert: 'text-red-700 bg-red-100',
  };

  return (
    <header className="bg-wood-dark border-b-2 border-wood shadow-lg">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 text-gold font-bold text-xl tracking-wide">
          <span className="text-2xl">♟</span>
          <span className="hidden sm:block font-serif">BackgammonAI</span>
        </NavLink>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {[
            { to: '/', label: 'Home' },
            { to: '/play', label: 'Play' },
            { to: '/lessons', label: 'Learn' },
            { to: '/quizzes', label: 'Quizzes' },
            { to: '/coach', label: 'Coach' },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded text-sm font-serif transition-colors ${
                  isActive
                    ? 'bg-gold text-wood-dark font-bold'
                    : 'text-checker-light hover:bg-wood hover:text-gold'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Stats */}
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${levelColors[level]}`}>
            {level}
          </span>
          {streak > 0 && (
            <span className="text-sm text-orange-300 font-bold">🔥 {streak}</span>
          )}
          <span className="text-xs text-checker-light font-mono bg-wood px-2 py-0.5 rounded">
            {totalXP} XP
          </span>
        </div>
      </div>
    </header>
  );
}
