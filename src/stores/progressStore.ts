import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

interface ProgressStore {
  level: Difficulty;
  completedLessons: string[];
  quizScores: Record<string, { correct: boolean; attempts: number }>;
  streak: number;
  lastActiveDate: string;
  totalXP: number;

  completeLesson: (lessonId: string) => void;
  recordQuizAttempt: (quizId: string, correct: boolean) => void;
  updateStreak: () => void;
  setLevel: (level: Difficulty) => void;
  getCompletionPercent: (difficulty: Difficulty) => number;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      level: 'beginner',
      completedLessons: [],
      quizScores: {},
      streak: 0,
      lastActiveDate: '',
      totalXP: 0,

      completeLesson: (lessonId) => set((state) => {
        if (state.completedLessons.includes(lessonId)) return state;
        return {
          completedLessons: [...state.completedLessons, lessonId],
          totalXP: state.totalXP + 50,
        };
      }),

      recordQuizAttempt: (quizId, correct) => set((state) => {
        const existing = state.quizScores[quizId];
        return {
          quizScores: {
            ...state.quizScores,
            [quizId]: {
              correct: correct || (existing?.correct ?? false),
              attempts: (existing?.attempts ?? 0) + 1,
            },
          },
          totalXP: state.totalXP + (correct ? 30 : 5),
        };
      }),

      updateStreak: () => set((state) => {
        const today = new Date().toDateString();
        if (state.lastActiveDate === today) return state;
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const newStreak = state.lastActiveDate === yesterday ? state.streak + 1 : 1;
        return { streak: newStreak, lastActiveDate: today };
      }),

      setLevel: (level) => set({ level }),

      getCompletionPercent: (difficulty) => {
        // Calculated outside set using get()
        return 0; // will be computed in component
      },
    }),
    {
      name: 'backgammon-progress',
    }
  )
);
