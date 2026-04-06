import { useGameStore } from '../stores/gameStore';
import { getPipCount } from '../lib/backgammon';
import BackgammonBoard from '../components/board/BackgammonBoard';

export default function PlayPage() {
  const store = useGameStore();
  const pip0 = getPipCount(store, 0);
  const pip1 = getPipCount(store, 1);
  const canUndo = store.turnHistory.length > 0 && store.phase === 'moving';

  const statusText =
    store.phase === 'rolling' ? `${store.currentPlayer === 0 ? '⬜ Cream' : '⬛ Dark'} — Tap Roll`
    : store.phase === 'moving' ? `${store.currentPlayer === 0 ? '⬜ Cream' : '⬛ Dark'} — Move a piece`
    : '🏆 Game Over';

  return (
    <div className="flex flex-col items-center px-2 py-3 gap-3 max-w-5xl mx-auto">

      {/* Top bar: status + buttons */}
      <div className="w-full flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-bold font-serif text-wood-dark bg-white/60 px-3 py-1 rounded-full border border-wood/20">
          {statusText}
        </span>

        <div className="flex gap-2">
          {/* Pip counts */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-serif text-wood-dark bg-white/50 px-2 py-1 rounded-full border border-wood/20">
            <span className="w-3 h-3 rounded-full bg-checker-light border border-wood/40 inline-block" />
            {pip0}p
            <span className="mx-1 text-wood/40">·</span>
            <span className="w-3 h-3 rounded-full bg-checker-dark inline-block" />
            {pip1}p
          </div>

          <button
            onClick={() => store.undoMove()}
            disabled={!canUndo}
            className="px-3 py-1.5 text-sm font-serif rounded-lg border transition-all
              disabled:opacity-30 disabled:cursor-not-allowed
              bg-white/70 border-wood/30 text-wood-dark hover:bg-white active:scale-95"
          >
            ↩ Undo
          </button>

          <button
            onClick={() => store.resetGame()}
            className="px-3 py-1.5 text-sm font-serif rounded-lg border transition-all
              bg-wood text-checker-light border-wood-dark hover:bg-wood-dark active:scale-95"
          >
            New Game
          </button>
        </div>
      </div>

      {/* Dice remaining pills (mobile) */}
      {store.phase === 'moving' && store.movesLeft.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-wood font-serif">Dice left:</span>
          {store.movesLeft.map((d, i) => (
            <span key={i}
              className="w-7 h-7 bg-gold text-wood-dark text-sm font-bold rounded-md flex items-center justify-center shadow-sm">
              {d}
            </span>
          ))}
        </div>
      )}

      {/* Board — fills available width */}
      <div className="w-full overflow-x-auto flex justify-center">
        <BackgammonBoard interactive />
      </div>

      {/* Instructions (collapsible on mobile) */}
      <details className="w-full text-xs font-serif text-wood bg-white/50 border border-wood/20 rounded-xl p-3 cursor-pointer">
        <summary className="font-bold text-wood-dark">How to play</summary>
        <ul className="mt-2 space-y-0.5 list-disc list-inside">
          <li><strong>Drag</strong> a cream piece to move it — valid spots glow gold</li>
          <li>Or <strong>tap</strong> a piece then tap a destination</li>
          <li>Cream moves right → left (24 → 1), Dark moves left → right</li>
          <li>Land on a lone opponent checker to <strong>hit</strong> it to the bar</li>
          <li>Use <strong>Undo</strong> to take back a move within your turn</li>
        </ul>
      </details>
    </div>
  );
}
