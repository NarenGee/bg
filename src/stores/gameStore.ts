import { create } from 'zustand';
import {
  GameState,
  Move,
  createInitialState,
  rollDice,
  expandDice,
  getLegalMoves,
  applyMove,
} from '../lib/backgammon';

interface GameStore extends GameState {
  rollDice: () => void;
  selectPoint: (point: number | null) => void; // -1 for bar
  makeMove: (move: Move) => void;
  resetGame: () => void;
  setPosition: (points: number[], bar?: [number, number], player?: 0 | 1, dice?: [number, number]) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  ...createInitialState(),

  rollDice: () => set((state) => {
    if (state.phase !== 'rolling') return state;
    const dice = rollDice();
    const movesLeft = expandDice(dice);
    const legalMoves = getLegalMoves(
      { ...state, dice, movesLeft, phase: 'moving' },
      state.currentPlayer
    );

    if (legalMoves.length === 0) {
      // No legal moves, switch player
      return {
        ...state,
        dice,
        movesLeft: [],
        legalMoves: [],
        currentPlayer: (1 - state.currentPlayer) as 0 | 1,
        phase: 'rolling',
      };
    }

    return {
      ...state,
      dice,
      movesLeft,
      legalMoves,
      phase: 'moving',
    };
  }),

  selectPoint: (point) => set((state) => {
    if (state.phase !== 'moving') return state;

    // Clicking selected point deselects
    if (state.selectedPoint === point) {
      return { ...state, selectedPoint: null };
    }

    // Check if this is a legal destination for selected piece
    if (state.selectedPoint !== null) {
      const destMove = state.legalMoves.find(
        (m) => m.from === (state.selectedPoint === -1 ? 'bar' : state.selectedPoint) && m.to === point
      );
      if (destMove) {
        const newState = applyMove(state, destMove);
        return { ...newState };
      }
    }

    // Select a new source point
    const player = state.currentPlayer;
    const hasCheckers = point === -1
      ? state.bar[player] > 0
      : (player === 0 ? state.points[point] > 0 : state.points[point] < 0);

    if (!hasCheckers) return state;

    const hasLegalFrom = state.legalMoves.some(
      (m) => m.from === (point === -1 ? 'bar' : point)
    );

    if (!hasLegalFrom) return state;

    return { ...state, selectedPoint: point };
  }),

  makeMove: (move) => set((state) => {
    if (state.phase !== 'moving') return state;
    return applyMove(state, move);
  }),

  resetGame: () => set(createInitialState()),

  setPosition: (points, bar = [0, 0], player = 0, dice) => set((state) => {
    const movesLeft = dice ? expandDice(dice) : [];
    const newState = {
      ...state,
      points,
      bar,
      bearOff: [0, 0] as [number, number],
      dice: dice || null,
      movesLeft,
      currentPlayer: player,
      selectedPoint: null,
      phase: dice ? 'moving' as const : 'rolling' as const,
      winner: null,
    };
    newState.legalMoves = dice ? getLegalMoves(newState, player) : [];
    return newState;
  }),
}));
