import { useGameStore } from '../stores/gameStore';
import { getPipCount } from '../lib/backgammon';
import BackgammonBoard from '../components/board/BackgammonBoard';

export default function PlayPage() {
  const store = useGameStore();
  const pip0 = getPipCount(store, 0);
  const pip1 = getPipCount(store, 1);

  const playerLabels = ['Cream (You)', 'Dark'];
  const phaseLabel =
    store.phase === 'rolling'
      ? `${playerLabels[store.currentPlayer]}'s turn — Roll the dice`
      : store.phase === 'moving'
      ? `${playerLabels[store.currentPlayer]}'s turn — Make your move`
      : 'Game Over';

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Title row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-wood-dark">Practice Board</h1>
          <p className="text-sm text-wood mt-0.5 font-serif">{phaseLabel}</p>
        </div>
        <button
          onClick={() => store.resetGame()}
          className="px-4 py-2 bg-wood text-checker-light rounded-lg font-serif text-sm hover:bg-wood-dark transition-colors border border-wood-dark"
        >
          New Game
        </button>
      </div>

      {/* Pip counts */}
      <div className="flex gap-4 mb-4 text-sm font-serif">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-checker-light/30 border border-wood/30 rounded-lg">
          <span className="w-4 h-4 rounded-full bg-checker-light border border-wood/50 inline-block" />
          <span className="text-wood-dark">Cream: <strong>{pip0} pips</strong></span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-checker-dark/10 border border-wood/30 rounded-lg">
          <span className="w-4 h-4 rounded-full bg-checker-dark inline-block" />
          <span className="text-wood-dark">Dark: <strong>{pip1} pips</strong></span>
        </div>
        {store.phase === 'moving' && store.movesLeft.length > 0 && (
          <div className="flex items-center gap-1 px-3 py-1.5 bg-gold/10 border border-gold/30 rounded-lg">
            <span className="text-wood-dark">Dice left: </span>
            {store.movesLeft.map((d, i) => (
              <span key={i} className="w-6 h-6 bg-gold text-wood-dark text-xs font-bold rounded flex items-center justify-center">{d}</span>
            ))}
          </div>
        )}
      </div>

      {/* Board */}
      <div className="flex justify-center">
        <BackgammonBoard interactive showPipCount />
      </div>

      {/* Instructions */}
      <div className="mt-5 p-4 bg-wood/10 border border-wood/20 rounded-xl font-serif text-sm text-wood-dark">
        <p className="font-bold mb-1 text-wood-dark">How to play:</p>
        <ul className="space-y-0.5 text-wood list-disc list-inside">
          <li>Click <strong>ROLL</strong> in the center bar to roll dice</li>
          <li>Click one of your checkers (cream pieces) to select it — valid destinations glow gold</li>
          <li>Click a highlighted destination to move</li>
          <li>Cream moves from top-right → bottom-left (point 24 → point 1)</li>
          <li>Hit a lone opponent checker to send it to the bar</li>
        </ul>
      </div>
    </div>
  );
}
