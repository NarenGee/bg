import { useState, useRef, useCallback } from 'react';
import type { Move } from '../../lib/backgammon';
import { useGameStore } from '../../stores/gameStore';

// ── Board geometry ──────────────────────────────────────────────
const VW = 960;
const VH = 540;
const FRAME = 22;          // outer wooden frame thickness
const SPINE = 18;          // horizontal divider height
const BAR_W = 52;
const BEAROFF_W = 48;

const BX = FRAME;                        // board inner left
const BY = FRAME;                        // board inner top
const BW = VW - FRAME * 2 - BEAROFF_W;  // board inner width (excl. bearoff)
const BH = VH - FRAME * 2;              // board inner height

const MID_Y = BY + BH / 2;              // spine top

const HALF_W = (BW - BAR_W) / 2;
const PT_W = HALF_W / 6;
const PT_H = (BH - SPINE) / 2 - 4;     // triangle height

const BAR_X = BX + HALF_W;
const RIGHT_X = BAR_X + BAR_W;

const BEAROFF_X = VW - FRAME - BEAROFF_W + 4;
const CR = 19; // checker radius

// Point x-center (0-indexed: 0=point1 bottom-right … 23=point24 top-right)
function ptX(i: number): number {
  if (i < 6)  return RIGHT_X + (5 - i) * PT_W + PT_W / 2;
  if (i < 12) return BX + (11 - i) * PT_W + PT_W / 2;
  if (i < 18) return BX + (i - 12) * PT_W + PT_W / 2;
  return RIGHT_X + (i - 18) * PT_W + PT_W / 2;
}

function isTop(i: number) { return i >= 12; }

function checkerY(i: number, stack: number, total: number): number {
  const spacing = Math.min(CR * 2 + 2, (PT_H - CR) / Math.max(total - 1, 1));
  if (isTop(i)) return BY + CR + 2 + stack * spacing;
  return BY + BH - CR - 2 - stack * spacing;
}

// Convert SVG coords → point index (or 'bar' / 'bearoff')
function svgPtToIndex(x: number, y: number): number | 'bar' | 'bearoff' | null {
  if (x > BEAROFF_X) return 'bearoff';
  if (x >= BAR_X && x <= BAR_X + BAR_W) return 'bar';
  const top = y < MID_Y;
  const inLeft = x >= BX && x < BAR_X;
  const inRight = x >= RIGHT_X;
  if (!inLeft && !inRight) return null;
  if (top) {
    if (inLeft) {
      const col = Math.floor((x - BX) / PT_W);
      return 12 + col;
    } else {
      const col = Math.floor((x - RIGHT_X) / PT_W);
      return 18 + col;
    }
  } else {
    if (inLeft) {
      const col = Math.floor((x - BX) / PT_W);
      return 11 - col;
    } else {
      const col = Math.floor((x - RIGHT_X) / PT_W);
      return 5 - col;
    }
  }
}

// ── Pip SVG ─────────────────────────────────────────────────────
function DiePips({ val, x, y, s }: { val: number; x: number; y: number; s: number }) {
  const pad = s * 0.22;
  const half = s / 2;
  const pos: Record<number, [number, number][]> = {
    1: [[half, half]],
    2: [[pad, pad], [s - pad, s - pad]],
    3: [[pad, pad], [half, half], [s - pad, s - pad]],
    4: [[pad, pad], [s - pad, pad], [pad, s - pad], [s - pad, s - pad]],
    5: [[pad, pad], [s - pad, pad], [half, half], [pad, s - pad], [s - pad, s - pad]],
    6: [[pad, s * 0.2], [s - pad, s * 0.2], [pad, half], [s - pad, half], [pad, s * 0.8], [s - pad, s * 0.8]],
  };
  return (
    <>
      {(pos[val] || []).map(([px, py], i) => (
        <circle key={i} cx={x + px} cy={y + py} r={s * 0.075} fill="#1A0A04" />
      ))}
    </>
  );
}

// ── Main component ───────────────────────────────────────────────
interface Props {
  overridePoints?: number[];
  overrideBar?: [number, number];
  overrideCurrentPlayer?: 0 | 1;
  overrideDice?: [number, number];
  overrideLegalMoves?: Move[];
  interactive?: boolean;
  highlightPoints?: number[];
  compact?: boolean;
  showPipCount?: boolean;
}

export default function BackgammonBoard({
  overridePoints,
  overrideBar,
  overrideCurrentPlayer,
  overrideDice,
  overrideLegalMoves,
  interactive = true,
  highlightPoints = [],
  compact = false,
  showPipCount: _sp = false,
}: Props) {
  const store = useGameStore();

  const points  = overridePoints        ?? store.points;
  const bar     = overrideBar           ?? store.bar;
  const player  = overrideCurrentPlayer ?? store.currentPlayer;
  const dice    = overrideDice          ?? store.dice;
  const legal   = overrideLegalMoves    ?? store.legalMoves;
  const phase   = store.phase;
  const sel     = store.selectedPoint;
  const movesLeft = store.movesLeft;
  const isActive = interactive && !overridePoints;

  // ── Drag state ─────────────────────────────────────────────────
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{
    from: number | 'bar';
    owner: 0 | 1;
    svgX: number;
    svgY: number;
  } | null>(null);

  const clientToSvg = useCallback((cx: number, cy: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = VW / rect.width;
    const scaleY = VH / rect.height;
    return { x: (cx - rect.left) * scaleX, y: (cy - rect.top) * scaleY };
  }, []);

  function onPointerDown(e: React.PointerEvent<SVGElement>, fromIdx: number | 'bar') {
    if (!isActive || phase !== 'moving') return;
    const hasLegal = legal.some(m => m.from === fromIdx);
    if (!hasLegal) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    store.selectPoint(fromIdx === 'bar' ? -1 : fromIdx as number);
    const { x, y } = clientToSvg(e.clientX, e.clientY);
    setDrag({ from: fromIdx, owner: player, svgX: x, svgY: y });
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drag) return;
    const { x, y } = clientToSvg(e.clientX, e.clientY);
    setDrag(d => d ? { ...d, svgX: x, svgY: y } : null);
  }

  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (!drag) return;
    const { x, y } = clientToSvg(e.clientX, e.clientY);
    const dest = svgPtToIndex(x, y);
    if (dest !== null && dest !== 'bar') {
      const move = legal.find(m => m.from === drag.from && m.to === dest);
      if (move) { store.makeMove(move); }
    }
    setDrag(null);
    if (!drag) store.selectPoint(null);
  }

  // Legal destinations for selected piece
  const legalDests = new Set<number | 'bearoff'>();
  if (sel !== null) {
    const from = sel === -1 ? 'bar' : sel;
    legal.filter(m => m.from === from).forEach(m => legalDests.add(m.to));
  }
  if (drag) {
    legal.filter(m => m.from === drag.from).forEach(m => legalDests.add(m.to));
  }

  const scale = compact ? 0.55 : 1;

  return (
    <div className="relative select-none touch-none" style={{ lineHeight: 0 }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        width={VW * scale}
        height={VH * scale}
        style={{ display: 'block', maxWidth: '100%', height: 'auto', touchAction: 'none' }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <defs>
          {/* Wooden frame gradient */}
          <linearGradient id="bgFrame" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#7B4A1E" />
            <stop offset="40%"  stopColor="#5C3210" />
            <stop offset="100%" stopColor="#3D1C06" />
          </linearGradient>
          {/* Green felt */}
          <linearGradient id="bgFelt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#1E5C1E" />
            <stop offset="50%" stopColor="#194F19" />
            <stop offset="100%" stopColor="#1E5C1E" />
          </linearGradient>
          {/* Bar wood */}
          <linearGradient id="bgBar" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#4A2507" />
            <stop offset="50%"  stopColor="#6B3A1F" />
            <stop offset="100%" stopColor="#4A2507" />
          </linearGradient>
          {/* Spine */}
          <linearGradient id="bgSpine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#3D1C06" />
            <stop offset="50%"  stopColor="#6B3A1F" />
            <stop offset="100%" stopColor="#3D1C06" />
          </linearGradient>
          {/* Checker light (ivory/marble) */}
          <radialGradient id="ckLight" cx="35%" cy="30%" r="70%">
            <stop offset="0%"   stopColor="#FFFDF0" />
            <stop offset="55%"  stopColor="#EFE0C0" />
            <stop offset="100%" stopColor="#C8A96A" />
          </radialGradient>
          {/* Checker dark (espresso/marble) */}
          <radialGradient id="ckDark" cx="35%" cy="30%" r="70%">
            <stop offset="0%"   stopColor="#6B4A30" />
            <stop offset="55%"  stopColor="#3A1E0A" />
            <stop offset="100%" stopColor="#1A0804" />
          </radialGradient>
          {/* Bearoff tray */}
          <linearGradient id="bgBearoff" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#2C1A06" />
            <stop offset="100%" stopColor="#3D2510" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.5" />
          </filter>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* ── Outer frame ── */}
        <rect x={0} y={0} width={VW} height={VH} rx={14} fill="url(#bgFrame)" />

        {/* ── Felt surface ── */}
        <rect x={BX} y={BY} width={BW} height={BH} fill="url(#bgFelt)" />

        {/* ── Triangular points ── */}
        {Array.from({ length: 24 }, (_, i) => {
          const cx = ptX(i);
          const top = isTop(i);
          const baseY = top ? BY : BY + BH;
          const tipY  = top ? BY + PT_H : BY + BH - PT_H;
          const hw = PT_W / 2 - 1.5;
          // Alternate brown / ivory
          const isBrown = i % 2 === 0;
          const fill = isBrown ? '#7B3A18' : '#E8D8B0';
          const isHighlighted = highlightPoints.includes(i);
          const isDest = legalDests.has(i);
          const isSel = sel === i;

          return (
            <g key={i}
              onClick={() => {
                if (!isActive || phase !== 'moving') return;
                if (drag) return;
                if (sel !== null) {
                  const from = sel === -1 ? 'bar' : sel;
                  const mv = legal.find(m => m.from === from && m.to === i);
                  if (mv) { store.makeMove(mv); return; }
                }
                store.selectPoint(i);
              }}
              style={{ cursor: isActive ? 'pointer' : 'default' }}
            >
              <polygon
                points={`${cx - hw},${baseY} ${cx + hw},${baseY} ${cx},${tipY}`}
                fill={fill}
                opacity={0.88}
              />
              {/* Destination highlight */}
              {(isDest || isHighlighted) && (
                <polygon
                  points={`${cx - hw},${baseY} ${cx + hw},${baseY} ${cx},${tipY}`}
                  fill="#FFD700"
                  opacity={0.38}
                  style={{ pointerEvents: 'none' }}
                  filter="url(#glow)"
                />
              )}
              {isSel && (
                <polygon
                  points={`${cx - hw},${baseY} ${cx + hw},${baseY} ${cx},${tipY}`}
                  fill="#FFD700"
                  opacity={0.55}
                  style={{ pointerEvents: 'none' }}
                />
              )}
              {/* Point number */}
              <text
                x={cx}
                y={top ? BY + BH - 5 : BY + 12}
                textAnchor="middle"
                fontSize={9}
                fill="#C8D8B0"
                opacity={0.6}
                fontFamily="Georgia, serif"
                style={{ pointerEvents: 'none' }}
              >{i + 1}</text>
            </g>
          );
        })}

        {/* ── Spine (horizontal divider) ── */}
        <rect x={BX} y={MID_Y - SPINE / 2} width={BW} height={SPINE}
          fill="url(#bgSpine)" />
        {/* Spine decorative hinges */}
        {[BX + BW * 0.28, BX + BW * 0.72].map((hx, hi) => (
          <g key={hi}>
            <rect x={hx - 10} y={MID_Y - 8} width={20} height={16} rx={3}
              fill="#C8960C" opacity={0.85} />
            <circle cx={hx} cy={MID_Y} r={4} fill="#8B6914" />
          </g>
        ))}

        {/* ── Bar ── */}
        <rect x={BAR_X} y={BY} width={BAR_W} height={BH}
          fill="url(#bgBar)"
          style={{ cursor: isActive && bar[player] > 0 ? 'pointer' : 'default' }}
          onClick={() => {
            if (!isActive || phase !== 'moving') return;
            store.selectPoint(-1);
          }}
        />

        {/* ── Checkers on points ── */}
        {points.map((cnt, i) => {
          if (cnt === 0) return null;
          const owner = cnt > 0 ? 0 : 1;
          const abs = Math.abs(cnt);
          const cx = ptX(i);
          const isDraggingFrom = drag?.from === i;

          return Array.from({ length: abs }, (_, s) => {
            const cy = checkerY(i, s, abs);
            const isTopChecker = s === abs - 1;
            const isSrcSelected = sel === i && isTopChecker;
            const isBeingDragged = isDraggingFrom && isTopChecker;

            return (
              <g key={`${i}-${s}`}
                onPointerDown={isTopChecker ? (e) => onPointerDown(e, i) : undefined}
                onClick={() => {
                  if (!isActive || phase !== 'moving' || drag) return;
                  if (sel !== null && sel !== i) {
                    const from = sel === -1 ? 'bar' : sel;
                    const mv = legal.find(m => m.from === from && m.to === i);
                    if (mv) { store.makeMove(mv); return; }
                  }
                  store.selectPoint(i);
                }}
                style={{ cursor: isActive ? (isTopChecker ? 'grab' : 'default') : 'default', touchAction: 'none' }}
                opacity={isBeingDragged ? 0.35 : 1}
              >
                <circle cx={cx} cy={cy} r={CR}
                  fill={owner === 0 ? 'url(#ckLight)' : 'url(#ckDark)'}
                  stroke={owner === 0 ? '#9B7830' : '#6B4030'}
                  strokeWidth={isSrcSelected ? 2.5 : 1.5}
                  filter={isSrcSelected ? 'url(#glow)' : 'url(#shadow)'}
                />
                {/* Inner ring detail */}
                <circle cx={cx} cy={cy} r={CR - 5}
                  fill="none"
                  stroke={owner === 0 ? '#C8A060' : '#8B5030'}
                  strokeWidth={1}
                  opacity={0.55}
                  style={{ pointerEvents: 'none' }}
                />
                {abs > 5 && isTopChecker && (
                  <text x={cx} y={cy + 5} textAnchor="middle"
                    fontSize={12} fontWeight="bold"
                    fill={owner === 0 ? '#5C3010' : '#F5DEB3'}
                    style={{ pointerEvents: 'none' }}>
                    {abs}
                  </text>
                )}
              </g>
            );
          });
        })}

        {/* ── Bar checkers ── */}
        {/* Player 0 top half of bar */}
        {Array.from({ length: bar[0] }, (_, i) => {
          const cy = MID_Y - SPINE / 2 - CR - 4 - i * (CR * 2 + 2);
          const isSel = sel === -1;
          return (
            <g key={`b0-${i}`}
              onPointerDown={i === bar[0] - 1 ? (e) => onPointerDown(e, 'bar') : undefined}
              onClick={() => { if (isActive && phase === 'moving') store.selectPoint(-1); }}
              style={{ cursor: isActive ? 'grab' : 'default', touchAction: 'none' }}>
              <circle cx={BAR_X + BAR_W / 2} cy={cy} r={CR}
                fill="url(#ckLight)" stroke="#9B7830"
                strokeWidth={isSel ? 2.5 : 1.5}
                filter={isSel ? 'url(#glow)' : 'url(#shadow)'} />
              <circle cx={BAR_X + BAR_W / 2} cy={cy} r={CR - 5}
                fill="none" stroke="#C8A060" strokeWidth={1} opacity={0.55}
                style={{ pointerEvents: 'none' }} />
            </g>
          );
        })}
        {/* Player 1 bottom half of bar */}
        {Array.from({ length: bar[1] }, (_, i) => {
          const cy = MID_Y + SPINE / 2 + CR + 4 + i * (CR * 2 + 2);
          return (
            <g key={`b1-${i}`} style={{ cursor: 'default' }}>
              <circle cx={BAR_X + BAR_W / 2} cy={cy} r={CR}
                fill="url(#ckDark)" stroke="#6B4030" strokeWidth={1.5}
                filter="url(#shadow)" />
              <circle cx={BAR_X + BAR_W / 2} cy={cy} r={CR - 5}
                fill="none" stroke="#8B5030" strokeWidth={1} opacity={0.55}
                style={{ pointerEvents: 'none' }} />
            </g>
          );
        })}

        {/* BAR label */}
        <text x={BAR_X + BAR_W / 2} y={MID_Y + 5} textAnchor="middle"
          fontSize={8} fill="#C8960C" opacity={0.7} fontFamily="Georgia, serif"
          style={{ pointerEvents: 'none' }}>BAR</text>

        {/* ── Bearoff tray ── */}
        <rect x={BEAROFF_X - 2} y={BY} width={BEAROFF_W} height={BH}
          fill="url(#bgBearoff)" rx={4} />
        <text x={BEAROFF_X + BEAROFF_W / 2 - 2} y={BY + BH / 2}
          textAnchor="middle" fontSize={8} fill="#C8960C" opacity={0.55}
          fontFamily="Georgia, serif" style={{ pointerEvents: 'none' }}>OFF</text>

        {/* Bearoff checkers player 0 (top) */}
        {store.bearOff[0] > 0 && (
          <>
            {Array.from({ length: Math.min(store.bearOff[0], 6) }, (_, i) => (
              <circle key={i} cx={BEAROFF_X + BEAROFF_W / 2 - 2} cy={BY + 18 + i * 20}
                r={14} fill="url(#ckLight)" stroke="#9B7830" strokeWidth={1} />
            ))}
            <text x={BEAROFF_X + BEAROFF_W / 2 - 2} y={BY + BH / 4}
              textAnchor="middle" fontSize={13} fontWeight="bold"
              fill="#F5DEB3" fontFamily="Georgia, serif"
              style={{ pointerEvents: 'none' }}>×{store.bearOff[0]}</text>
          </>
        )}

        {/* Bearoff checkers player 1 (bottom) */}
        {store.bearOff[1] > 0 && (
          <>
            {Array.from({ length: Math.min(store.bearOff[1], 6) }, (_, i) => (
              <circle key={i} cx={BEAROFF_X + BEAROFF_W / 2 - 2} cy={BY + BH - 18 - i * 20}
                r={14} fill="url(#ckDark)" stroke="#6B4030" strokeWidth={1} />
            ))}
            <text x={BEAROFF_X + BEAROFF_W / 2 - 2} y={BY + BH * 3 / 4}
              textAnchor="middle" fontSize={13} fontWeight="bold"
              fill="#F5DEB3" fontFamily="Georgia, serif"
              style={{ pointerEvents: 'none' }}>×{store.bearOff[1]}</text>
          </>
        )}

        {/* ── Dice ── */}
        {dice && (() => {
          const diceVals = dice[0] === dice[1]
            ? [dice[0], dice[0], dice[0], dice[0]]
            : [dice[0], dice[1]];
          const usedCount = diceVals.length - movesLeft.length;
          const dS = 38; const gap = 6;
          const totalW = diceVals.length * (dS + gap) - gap;
          const startX = BAR_X + BAR_W / 2 - totalW / 2;

          return diceVals.map((v, i) => {
            const used = i < usedCount;
            const dx = startX + i * (dS + gap);
            const dy = MID_Y - dS / 2;
            return (
              <g key={i} opacity={used ? 0.3 : 1}>
                <rect x={dx} y={dy} width={dS} height={dS} rx={6}
                  fill={player === 0 ? '#F5E8C8' : '#2C1A0E'}
                  stroke={player === 0 ? '#9B7830' : '#8B5030'}
                  strokeWidth={1.5} />
                <DiePips val={v} x={dx} y={dy} s={dS} />
              </g>
            );
          });
        })()}

        {/* ── Roll button ── */}
        {phase === 'rolling' && isActive && (
          <g onClick={() => store.rollDice()} style={{ cursor: 'pointer' }}>
            <rect x={BAR_X + 4} y={MID_Y - 24} width={BAR_W - 8} height={48}
              rx={8} fill="#C8960C" stroke="#8B6914" strokeWidth={1.5}
              filter="url(#shadow)" />
            <text x={BAR_X + BAR_W / 2} y={MID_Y - 6}
              textAnchor="middle" fontSize={9} fill="#3D1C06"
              fontFamily="Georgia, serif" fontWeight="bold">ROLL</text>
            <text x={BAR_X + BAR_W / 2} y={MID_Y + 10}
              textAnchor="middle" fontSize={14} fill="#3D1C06">🎲</text>
          </g>
        )}

        {/* ── Dragging ghost checker ── */}
        {drag && (
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={drag.svgX} cy={drag.svgY} r={CR + 2}
              fill={drag.owner === 0 ? 'url(#ckLight)' : 'url(#ckDark)'}
              stroke={drag.owner === 0 ? '#C8960C' : '#C8960C'}
              strokeWidth={2.5}
              opacity={0.9}
              filter="url(#glow)"
            />
            <circle cx={drag.svgX} cy={drag.svgY} r={CR - 4}
              fill="none" stroke="#FFD700" strokeWidth={1} opacity={0.6} />
          </g>
        )}

        {/* ── Game over overlay ── */}
        {phase === 'gameover' && (
          <g>
            <rect x={0} y={0} width={VW} height={VH} fill="#000" opacity={0.5} rx={14} />
            <rect x={VW / 2 - 140} y={VH / 2 - 52} width={280} height={104}
              rx={16} fill="#3D1C06" stroke="#C8960C" strokeWidth={2.5} />
            <text x={VW / 2} y={VH / 2 - 14} textAnchor="middle"
              fontSize={22} fontWeight="bold" fill="#C8960C" fontFamily="Georgia, serif">
              {store.winner === 0 ? '🏆 Cream Wins!' : '🏆 Dark Wins!'}
            </text>
            <text x={VW / 2} y={VH / 2 + 18} textAnchor="middle"
              fontSize={12} fill="#F5DEB3" fontFamily="Georgia, serif">
              Tap New Game to play again
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
