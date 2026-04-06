import type { Move } from '../../lib/backgammon';
import { useGameStore } from '../../stores/gameStore';

// SVG board dimensions
const W = 920;
const H = 580;
const PAD = 20;
const BAR_W = 56;
const BEAROFF_W = 52;

// Inner board area (excluding outer frame)
const INNER_X = PAD;
const INNER_Y = PAD;
const INNER_W = W - PAD * 2 - BEAROFF_W;
const INNER_H = H - PAD * 2;

// Each half-board (left/right of bar)
const HALF_W = (INNER_W - BAR_W) / 2;
const PT_W = HALF_W / 6; // width per point
const PT_H = (INNER_H / 2) - 10; // triangle height

const BAR_X = INNER_X + HALF_W;
const RIGHT_X = BAR_X + BAR_W;

// Bearoff tray
const BEAROFF_X = W - BEAROFF_W - PAD + 8;

function pointX(pointIndex: number): number {
  // pointIndex: 0-23 (0=visual bottom-right = game point 1)
  // Bottom row: indices 0-11 (points 1-12), right to left
  // Top row: indices 12-23 (points 13-24), left to right
  if (pointIndex < 6) {
    // Points 1-6: right half bottom, right to left
    return RIGHT_X + (5 - pointIndex) * PT_W + PT_W / 2;
  } else if (pointIndex < 12) {
    // Points 7-12: left half bottom, right to left
    return INNER_X + (11 - pointIndex) * PT_W + PT_W / 2;
  } else if (pointIndex < 18) {
    // Points 13-18: left half top, left to right
    return INNER_X + (pointIndex - 12) * PT_W + PT_W / 2;
  } else {
    // Points 19-24: right half top, left to right
    return RIGHT_X + (pointIndex - 18) * PT_W + PT_W / 2;
  }
}

function isTopRow(pointIndex: number): boolean {
  return pointIndex >= 12;
}

function checkerY(pointIndex: number, stackPos: number, total: number): number {
  const top = isTopRow(pointIndex);
  const maxSpacing = Math.min(42, (PT_H - 28) / Math.max(total - 1, 1));
  const spacing = Math.min(42, maxSpacing);
  if (top) {
    return INNER_Y + 22 + stackPos * spacing;
  } else {
    return INNER_Y + INNER_H - 22 - stackPos * spacing;
  }
}

function DiceSVG({ value, used, x, y, dark }: { value: number; used: boolean; x: number; y: number; dark: boolean }) {
  const s = 36;
  const r = 5;
  const bg = dark ? '#2C1A0E' : '#F5DEB3';
  const fg = dark ? '#F5DEB3' : '#2C1A0E';
  const opacity = used ? 0.35 : 1;

  const pipPositions: Record<number, [number, number][]> = {
    1: [[0.5, 0.5]],
    2: [[0.25, 0.25], [0.75, 0.75]],
    3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
    4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
    5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
    6: [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.25, 0.8], [0.75, 0.8]],
  };

  const pips = pipPositions[value] || [];

  return (
    <g opacity={opacity}>
      <rect x={x} y={y} width={s} height={s} rx={r} ry={r}
        fill={bg} stroke={dark ? '#5C4033' : '#8B4513'} strokeWidth={1.5} />
      {pips.map(([px, py], i) => (
        <circle key={i} cx={x + px * s} cy={y + py * s} r={3.5} fill={fg} />
      ))}
    </g>
  );
}

interface Props {
  overridePoints?: number[];
  overrideBar?: [number, number];
  overrideCurrentPlayer?: 0 | 1;
  overrideDice?: [number, number];
  overrideLegalMoves?: Move[];
  interactive?: boolean;
  highlightPoints?: number[];
  showPipCount?: boolean; // reserved for future use
  compact?: boolean;
}

export default function BackgammonBoard({
  overridePoints,
  overrideBar,
  overrideCurrentPlayer,
  overrideDice,
  overrideLegalMoves,
  interactive = true,
  highlightPoints = [],
  showPipCount: _showPipCount = false,
  compact = false,
}: Props) {
  const store = useGameStore();

  const points = overridePoints ?? store.points;
  const bar = overrideBar ?? store.bar;
  const currentPlayer = overrideCurrentPlayer ?? store.currentPlayer;
  const dice = overrideDice ?? store.dice;
  const legalMoves = overrideLegalMoves ?? store.legalMoves;
  const phase = store.phase;
  const selectedPoint = store.selectedPoint;
  const movesLeft = store.movesLeft;

  const isInteractive = interactive && !overridePoints;

  function handlePointClick(idx: number) {
    if (!isInteractive) return;
    if (phase !== 'moving') return;

    if (selectedPoint !== null) {
      const move = legalMoves.find(
        m => m.from === (selectedPoint === -1 ? 'bar' : selectedPoint) && m.to === idx
      );
      if (move) { store.makeMove(move); return; }
      const bearoffMove = legalMoves.find(
        m => m.from === (selectedPoint === -1 ? 'bar' : selectedPoint) && m.to === 'bearoff'
      );
      if (bearoffMove && idx === -99) { store.makeMove(bearoffMove); return; }
    }
    store.selectPoint(idx);
  }

  function handleBarClick() {
    if (!isInteractive || phase !== 'moving') return;
    store.selectPoint(-1);
  }

  // Legal destinations for selected piece
  const legalDests = new Set<number | 'bearoff'>();
  if (selectedPoint !== null) {
    const from = selectedPoint === -1 ? 'bar' : selectedPoint;
    legalMoves.filter(m => m.from === from).forEach(m => legalDests.add(m.to));
  }

  const svgScale = compact ? 0.65 : 1;
  const svgW = W * svgScale;
  const svgH = H * svgScale;

  return (
    <div className="relative inline-block select-none">
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', maxWidth: '100%' }}
      >
        <defs>
          <linearGradient id="woodFrame" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5C2D07" />
            <stop offset="50%" stopColor="#3D1C08" />
            <stop offset="100%" stopColor="#5C2D07" />
          </linearGradient>
          <linearGradient id="woodBoard" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8B4513" />
            <stop offset="50%" stopColor="#A0522D" />
            <stop offset="100%" stopColor="#8B4513" />
          </linearGradient>
          <linearGradient id="woodBar" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4A2507" />
            <stop offset="100%" stopColor="#3D1C08" />
          </linearGradient>
          <radialGradient id="checkerLight" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFFAEE" />
            <stop offset="60%" stopColor="#F5DEB3" />
            <stop offset="100%" stopColor="#D4A96A" />
          </radialGradient>
          <radialGradient id="checkerDark" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#5C4033" />
            <stop offset="60%" stopColor="#2C1A0E" />
            <stop offset="100%" stopColor="#1A0A04" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Outer wooden frame */}
        <rect x={0} y={0} width={W} height={H} rx={12} ry={12}
          fill="url(#woodFrame)" stroke="#1A0A04" strokeWidth={3} />

        {/* Inner board surface */}
        <rect x={INNER_X} y={INNER_Y} width={INNER_W - PAD} height={INNER_H}
          fill="url(#woodBoard)" />

        {/* Center dividing line */}
        <line x1={INNER_X} y1={H / 2} x2={INNER_X + INNER_W - PAD} y2={H / 2}
          stroke="#3D1C08" strokeWidth={2} opacity={0.4} />

        {/* === POINTS (triangles) === */}
        {points.map((_count, idx) => {
          const cx = pointX(idx);
          const top = isTopRow(idx);
          const tipY = top ? INNER_Y + PT_H : INNER_Y + INNER_H - PT_H;
          const baseY = top ? INNER_Y : INNER_Y + INNER_H;
          const halfW = PT_W / 2 - 2;

          // Alternate colors: even index = ivory, odd = red (for visual interest)
          const isRed = idx % 2 === 0;
          const fill = isRed ? '#8B1A1A' : '#F5F0DC';
          const stroke = isRed ? '#6B0E0E' : '#D4C9A8';

          const isHighlighted = highlightPoints.includes(idx);
          const isLegalDest = legalDests.has(idx);
          const isSelected = selectedPoint === idx;

          return (
            <g key={idx} onClick={() => handlePointClick(idx)}
              style={{ cursor: isInteractive ? 'pointer' : 'default' }}>
              {/* Triangle */}
              <polygon
                points={`${cx - halfW},${baseY} ${cx + halfW},${baseY} ${cx},${tipY}`}
                fill={fill} stroke={stroke} strokeWidth={1}
                opacity={isHighlighted ? 1 : 0.85}
              />
              {/* Legal destination highlight */}
              {isLegalDest && (
                <polygon
                  points={`${cx - halfW},${baseY} ${cx + halfW},${baseY} ${cx},${tipY}`}
                  fill="#C8960C" opacity={0.35}
                  style={{ pointerEvents: 'none' }}
                />
              )}
              {/* Selected source highlight */}
              {isSelected && (
                <polygon
                  points={`${cx - halfW},${baseY} ${cx + halfW},${baseY} ${cx},${tipY}`}
                  fill="#C8960C" opacity={0.5}
                  style={{ pointerEvents: 'none' }}
                />
              )}
              {/* Point number */}
              <text
                x={cx}
                y={top ? INNER_Y + INNER_H - 5 : INNER_Y + 12}
                textAnchor="middle"
                fontSize={10}
                fill="#F5DEB3"
                opacity={0.7}
                fontFamily="Georgia, serif"
                style={{ pointerEvents: 'none' }}
              >
                {idx + 1}
              </text>
            </g>
          );
        })}

        {/* === CHECKERS === */}
        {points.map((val, idx) => {
          if (val === 0) return null;
          const owner = val > 0 ? 0 : 1;
          const count = val;
          const absCount = Math.abs(count);
          const cx = pointX(idx);

          return Array.from({ length: absCount }, (_, stackPos) => {
            const cy = checkerY(idx, stackPos, absCount);
            const isSelected = selectedPoint === idx;
            const r = 19;
            return (
              <g key={`${idx}-${stackPos}`}
                onClick={() => handlePointClick(idx)}
                style={{ cursor: isInteractive ? 'pointer' : 'default' }}>
                <circle cx={cx} cy={cy} r={r}
                  fill={owner === 0 ? 'url(#checkerLight)' : 'url(#checkerDark)'}
                  stroke={owner === 0 ? '#8B6914' : '#5C4033'}
                  strokeWidth={isSelected && stackPos === absCount - 1 ? 2.5 : 1.5}
                  filter={isSelected && stackPos === absCount - 1 ? 'url(#glow)' : undefined}
                />
                {/* Checker ring detail */}
                <circle cx={cx} cy={cy} r={r - 5}
                  fill="none"
                  stroke={owner === 0 ? '#C8960C' : '#8B4513'}
                  strokeWidth={0.8}
                  opacity={0.5}
                  style={{ pointerEvents: 'none' }}
                />
                {absCount > 5 && stackPos === absCount - 1 && (
                  <text x={cx} y={cy + 4} textAnchor="middle"
                    fontSize={11} fontWeight="bold"
                    fill={owner === 0 ? '#5C2D07' : '#F5DEB3'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {absCount}
                  </text>
                )}
              </g>
            );
          });
        })}

        {/* === BAR === */}
        <rect x={BAR_X} y={INNER_Y} width={BAR_W} height={INNER_H}
          fill="url(#woodBar)" onClick={handleBarClick}
          style={{ cursor: isInteractive && bar[currentPlayer] > 0 ? 'pointer' : 'default' }}
        />
        <text x={BAR_X + BAR_W / 2} y={H / 2 - 2} textAnchor="middle"
          fontSize={9} fill="#F5DEB3" opacity={0.5} fontFamily="Georgia, serif">
          BAR
        </text>

        {/* Bar checkers - player 0 (top half of bar) */}
        {Array.from({ length: bar[0] }, (_, i) => (
          <g key={`bar0-${i}`} onClick={handleBarClick}
            style={{ cursor: isInteractive ? 'pointer' : 'default' }}>
            <circle cx={BAR_X + BAR_W / 2} cy={INNER_Y + INNER_H * 0.25 - i * 28}
              r={19} fill="url(#checkerLight)" stroke="#8B6914" strokeWidth={1.5}
              filter={selectedPoint === -1 ? 'url(#glow)' : undefined}
            />
            <circle cx={BAR_X + BAR_W / 2} cy={INNER_Y + INNER_H * 0.25 - i * 28}
              r={14} fill="none" stroke="#C8960C" strokeWidth={0.8} opacity={0.5}
              style={{ pointerEvents: 'none' }} />
          </g>
        ))}

        {/* Bar checkers - player 1 (bottom half of bar) */}
        {Array.from({ length: bar[1] }, (_, i) => (
          <g key={`bar1-${i}`} onClick={handleBarClick}
            style={{ cursor: isInteractive ? 'pointer' : 'default' }}>
            <circle cx={BAR_X + BAR_W / 2} cy={INNER_Y + INNER_H * 0.75 + i * 28}
              r={19} fill="url(#checkerDark)" stroke="#5C4033" strokeWidth={1.5} />
            <circle cx={BAR_X + BAR_W / 2} cy={INNER_Y + INNER_H * 0.75 + i * 28}
              r={14} fill="none" stroke="#8B4513" strokeWidth={0.8} opacity={0.5}
              style={{ pointerEvents: 'none' }} />
          </g>
        ))}

        {/* === BEAROFF TRAY === */}
        <rect x={BEAROFF_X - 4} y={INNER_Y} width={BEAROFF_W} height={INNER_H}
          fill="#3D1C08" stroke="#1A0A04" strokeWidth={1} rx={4} />
        <text x={BEAROFF_X + BEAROFF_W / 2 - 4} y={H / 2 - 2} textAnchor="middle"
          fontSize={8} fill="#F5DEB3" opacity={0.5} fontFamily="Georgia, serif">
          OFF
        </text>

        {/* Bearoff - player 0 stacked at top */}
        {Array.from({ length: Math.min(store.bearOff[0], 8) }, (_, i) => (
          <circle key={`bo0-${i}`}
            cx={BEAROFF_X + BEAROFF_W / 2 - 4}
            cy={INNER_Y + 18 + i * 22}
            r={16} fill="url(#checkerLight)" stroke="#8B6914" strokeWidth={1} />
        ))}
        {store.bearOff[0] > 0 && (
          <text x={BEAROFF_X + BEAROFF_W / 2 - 4} y={INNER_Y + INNER_H / 4}
            textAnchor="middle" fontSize={12} fontWeight="bold"
            fill="#F5DEB3" fontFamily="Georgia, serif"
          >
            {store.bearOff[0]}
          </text>
        )}

        {/* Bearoff - player 1 stacked at bottom */}
        {Array.from({ length: Math.min(store.bearOff[1], 8) }, (_, i) => (
          <circle key={`bo1-${i}`}
            cx={BEAROFF_X + BEAROFF_W / 2 - 4}
            cy={INNER_Y + INNER_H - 18 - i * 22}
            r={16} fill="url(#checkerDark)" stroke="#5C4033" strokeWidth={1} />
        ))}
        {store.bearOff[1] > 0 && (
          <text x={BEAROFF_X + BEAROFF_W / 2 - 4} y={INNER_Y + INNER_H * 3 / 4}
            textAnchor="middle" fontSize={12} fontWeight="bold"
            fill="#F5DEB3" fontFamily="Georgia, serif"
          >
            {store.bearOff[1]}
          </text>
        )}

        {/* === DICE === */}
        {dice && (
          <g>
            {[dice[0], dice[1]].map((val, i) => {
              const isUsed = !movesLeft.includes(val) && !(dice[0] === dice[1] && movesLeft.length > i);
              return (
                <DiceSVG
                  key={i}
                  value={val}
                  used={isUsed}
                  x={BAR_X + BAR_W / 2 - 38 + i * 42}
                  y={H / 2 - 18}
                  dark={currentPlayer === 1}
                />
              );
            })}
          </g>
        )}

        {/* === ROLL BUTTON (when no dice) === */}
        {phase === 'rolling' && isInteractive && (
          <g onClick={() => store.rollDice()} style={{ cursor: 'pointer' }}>
            <rect x={BAR_X + 4} y={H / 2 - 22} width={BAR_W - 8} height={44}
              rx={8} fill="#C8960C" stroke="#8B6914" strokeWidth={1.5} />
            <text x={BAR_X + BAR_W / 2} y={H / 2 + 6}
              textAnchor="middle" fontSize={11} fontWeight="bold"
              fill="#3D1C08" fontFamily="Georgia, serif">
              ROLL
            </text>
          </g>
        )}

        {/* === GAME OVER === */}
        {phase === 'gameover' && (
          <g>
            <rect x={W / 2 - 120} y={H / 2 - 36} width={240} height={72}
              rx={12} fill="#3D1C08" stroke="#C8960C" strokeWidth={2} opacity={0.95} />
            <text x={W / 2} y={H / 2 - 8} textAnchor="middle"
              fontSize={18} fontWeight="bold" fill="#C8960C" fontFamily="Georgia, serif">
              {store.winner === 0 ? 'Cream Wins!' : 'Dark Wins!'}
            </text>
            <text x={W / 2} y={H / 2 + 16} textAnchor="middle"
              fontSize={11} fill="#F5DEB3" fontFamily="Georgia, serif">
              Click New Game to play again
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
