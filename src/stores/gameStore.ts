import { create } from 'zustand';
import type { Move } from '../lib/backgammon';
import {
  type GameState,
  createInitialState,
  rollDice,
  expandDice,
  getLegalMoves,
  applyMove,
} from '../lib/backgammon';

interface GameStore extends GameState {
  turnHistory: GameState[]; // states before each move this turn, for undo
  rollDice: () => void;
  selectPoint: (point: number | null) => void;
  makeMove: (move: Move) => void;
  undoMove: () => void;
  resetGame: () => void;
  setPosition: (points: number[], bar?: [number, number], player?: 0 | 1, dice?: [number, number]) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  ...createInitialState(),
  turnHistory: [],

  rollDice: () => set((state) => {
    if (state.phase !== 'rolling') return state;
    const dice = rollDice();
    const movesLeft = expandDice(dice);
    const next = { ...state, dice, movesLeft, phase: 'moving' as const };
    const legalMoves = getLegalMoves(next, state.currentPlayer);

    if (legalMoves.length === 0) {
      return {
        ...state,
        dice,
        movesLeft: [],
        legalMoves: [],
        currentPlayer: (1 - state.currentPlayer) as 0 | 1,
        phase: 'rolling' as const,
        turnHistory: [],
      };
    }

    return { ...state, dice, movesLeft, legalMoves, phase: 'moving', turnHistory: [] };
  }),

  selectPoint: (point) => set((state) => {
    if (state.phase !== 'moving') return state;
    if (state.selectedPoint === point) return { ...state, selectedPoint: null };

    // If something already selected, try to move there
    if (state.selectedPoint !== null) {
      const sel = state.selectedPoint;
      const destMove = state.legalMoves.find(
        (m) => m.from === (sel === -1 ? 'bar' : sel) && m.to === point
      );
      if (destMove) {
        const newState = applyMove(state, destMove);
        return { ...newState, turnHistory: [...state.turnHistory, state] };
      }
    }

    // Select source
    const player = state.currentPlayer;
    const hasCheckers = point === -1
      ? state.bar[player] > 0
      : point !== null && (player === 0 ? state.points[point] > 0 : state.points[point] < 0);

    if (!hasCheckers) return state;
    const hasLegal = state.legalMoves.some(m => m.from === (point === -1 ? 'bar' : point));
    if (!hasLegal) return state;

    return { ...state, selectedPoint: point };
  }),

  makeMove: (move) => set((state) => {
    if (state.phase !== 'moving') return state;
    const newState = applyMove(state, move);
    return { ...newState, turnHistory: [...state.turnHistory, state] };
  }),

  undoMove: () => set((state) => {
    if (state.turnHistory.length === 0) return state;
    const prev = state.turnHistory[state.turnHistory.length - 1];
    return {
      ...prev,
      turnHistory: state.turnHistory.slice(0, -1),
    };
  }),

  resetGame: () => set({ ...createInitialState(), turnHistory: [] }),

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
      turnHistory: [],
    };
    newState.legalMoves = dice ? getLegalMoves(newState, player) : [];
    return newState;
  }),
}));
