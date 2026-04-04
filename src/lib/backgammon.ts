// Backgammon game logic
// Board: points[0..23]
// points[i] > 0 = player 0 (cream/light) has that many checkers
// points[i] < 0 = player 1 (dark/espresso) has that many checkers
// Player 0 moves from point 23 → 0 (bearing off at index -1)
// Player 1 moves from point 0 → 23 (bearing off at index 24)

export interface GameState {
  points: number[];        // length 24
  bar: [number, number];   // checkers on bar [p0, p1]
  bearOff: [number, number]; // borne off [p0, p1]
  dice: [number, number] | null;
  movesLeft: number[];
  currentPlayer: 0 | 1;
  selectedPoint: number | null; // -1 = bar selected
  legalMoves: Move[];
  phase: 'rolling' | 'moving' | 'gameover';
  winner: 0 | 1 | null;
}

export interface Move {
  from: number | 'bar';
  to: number | 'bearoff';
  using: number;
}

export const INITIAL_BOARD: number[] = (() => {
  const b = new Array(24).fill(0);
  // Standard backgammon setup
  // Player 0 (positive): moves 23→0
  b[23] = 2;   // 2 on point 24 (player's 1-point)
  b[12] = 5;   // 5 on point 13 (midpoint)
  b[7] = 3;    // 3 on point 8
  b[5] = 5;    // 5 on point 6
  // Player 1 (negative): moves 0→23
  b[0] = -2;
  b[11] = -5;
  b[16] = -3;
  b[18] = -5;
  return b;
})();

export function createInitialState(): GameState {
  return {
    points: [...INITIAL_BOARD],
    bar: [0, 0],
    bearOff: [0, 0],
    dice: null,
    movesLeft: [],
    currentPlayer: 0,
    selectedPoint: null,
    legalMoves: [],
    phase: 'rolling',
    winner: null,
  };
}

export function rollDice(): [number, number] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
}

export function expandDice(dice: [number, number]): number[] {
  if (dice[0] === dice[1]) {
    return [dice[0], dice[0], dice[0], dice[0]];
  }
  return [dice[0], dice[1]];
}

function homeBoard(player: 0 | 1): number[] {
  // Player 0's home board: points 0-5
  // Player 1's home board: points 18-23
  if (player === 0) return [0, 1, 2, 3, 4, 5];
  return [18, 19, 20, 21, 22, 23];
}

function allCheckersHome(state: GameState, player: 0 | 1): boolean {
  if (state.bar[player] > 0) return false;
  const home = homeBoard(player);
  let outsideHome = 0;
  for (let i = 0; i < 24; i++) {
    if (!home.includes(i)) {
      if (player === 0 && state.points[i] > 0) outsideHome += state.points[i];
      if (player === 1 && state.points[i] < 0) outsideHome += Math.abs(state.points[i]);
    }
  }
  return outsideHome === 0;
}

function isBlocked(state: GameState, point: number, player: 0 | 1): boolean {
  const opponent = 1 - player as 0 | 1;
  const count = state.points[point];
  if (player === 0) return count <= -2;
  return count >= 2;
}

function getCheckerCount(state: GameState, point: number, player: 0 | 1): number {
  if (player === 0) return Math.max(0, state.points[point]);
  return Math.max(0, -state.points[point]);
}

export function getLegalMoves(state: GameState, player: 0 | 1): Move[] {
  const moves: Move[] = [];
  const movesLeft = [...new Set(state.movesLeft)]; // unique die values to try

  const canBearOff = allCheckersHome(state, player);

  for (const die of movesLeft) {
    // If player has checkers on bar, must enter first
    if (state.bar[player] > 0) {
      // Player 0 enters at points 18-23 (24-die from opponent's home)
      // Player 1 enters at points 0-5
      let enterPoint: number;
      if (player === 0) {
        enterPoint = 24 - die; // enters opponent's home board
      } else {
        enterPoint = die - 1;
      }
      if (enterPoint >= 0 && enterPoint < 24 && !isBlocked(state, enterPoint, player)) {
        moves.push({ from: 'bar', to: enterPoint, using: die });
      }
      continue;
    }

    // Normal moves
    for (let i = 0; i < 24; i++) {
      if (getCheckerCount(state, i, player) === 0) continue;

      let target: number;
      if (player === 0) {
        target = i - die;
      } else {
        target = i + die;
      }

      // Bearing off
      if (canBearOff) {
        if (player === 0 && target < 0) {
          // Check if exact or highest point
          const exactOrHighest = target === -1 ||
            !state.points.slice(0, 6).some((v, j) => v > 0 && j > i);
          if (exactOrHighest) {
            moves.push({ from: i, to: 'bearoff', using: die });
          }
          continue;
        }
        if (player === 1 && target > 23) {
          const exactOrHighest = target === 24 ||
            !state.points.slice(18, 24).some((v, j) => v < 0 && (j + 18) < i);
          if (exactOrHighest) {
            moves.push({ from: i, to: 'bearoff', using: die });
          }
          continue;
        }
      }

      if (target >= 0 && target < 24 && !isBlocked(state, target, player)) {
        moves.push({ from: i, to: target, using: die });
      }
    }
  }

  return moves;
}

export function applyMove(state: GameState, move: Move): GameState {
  const s = {
    ...state,
    points: [...state.points],
    bar: [...state.bar] as [number, number],
    bearOff: [...state.bearOff] as [number, number],
    movesLeft: [...state.movesLeft],
  };

  const player = s.currentPlayer;
  const opponent = 1 - player as 0 | 1;

  // Remove checker from source
  if (move.from === 'bar') {
    s.bar[player]--;
  } else {
    if (player === 0) s.points[move.from]--;
    else s.points[move.from]++;
  }

  if (move.to === 'bearoff') {
    s.bearOff[player]++;
  } else {
    const target = move.to as number;
    // Check if hitting a blot
    if (player === 0 && s.points[target] === -1) {
      s.points[target] = 0;
      s.bar[opponent]++;
    } else if (player === 1 && s.points[target] === 1) {
      s.points[target] = 0;
      s.bar[opponent]++;
    }
    if (player === 0) s.points[target]++;
    else s.points[target]--;
  }

  // Remove used die
  const dieIdx = s.movesLeft.indexOf(move.using);
  if (dieIdx !== -1) s.movesLeft.splice(dieIdx, 1);

  // Check win
  if (s.bearOff[player] === 15) {
    s.winner = player;
    s.phase = 'gameover';
    return s;
  }

  // Recalculate legal moves
  if (s.movesLeft.length === 0) {
    // End of turn - switch player
    s.currentPlayer = opponent;
    s.phase = 'rolling';
    s.selectedPoint = null;
    s.legalMoves = [];
  } else {
    s.legalMoves = getLegalMoves(s, player);
    if (s.legalMoves.length === 0) {
      // No moves left even with dice remaining - forfeit remaining dice
      s.currentPlayer = opponent;
      s.phase = 'rolling';
      s.selectedPoint = null;
      s.legalMoves = [];
    }
  }

  return s;
}

export function getPipCount(state: GameState, player: 0 | 1): number {
  let pips = 0;
  if (player === 0) {
    for (let i = 0; i < 24; i++) {
      if (state.points[i] > 0) pips += state.points[i] * (i + 1);
    }
    pips += state.bar[0] * 25;
  } else {
    for (let i = 0; i < 24; i++) {
      if (state.points[i] < 0) pips += Math.abs(state.points[i]) * (24 - i);
    }
    pips += state.bar[1] * 25;
  }
  return pips;
}

export function boardToString(state: GameState): string {
  let desc = `Board position:\n`;
  desc += `Player 0 (cream) pip count: ${getPipCount(state, 0)}\n`;
  desc += `Player 1 (dark) pip count: ${getPipCount(state, 1)}\n`;
  desc += `Bar: P0=${state.bar[0]}, P1=${state.bar[1]}\n`;
  desc += `Borne off: P0=${state.bearOff[0]}, P1=${state.bearOff[1]}\n`;
  desc += `Current player: ${state.currentPlayer === 0 ? 'Cream' : 'Dark'}\n`;
  if (state.dice) desc += `Dice: ${state.dice[0]}, ${state.dice[1]}\n`;
  return desc;
}
