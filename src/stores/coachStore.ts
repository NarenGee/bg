import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from '../lib/gemini';
import { initGemini, isGeminiReady } from '../lib/gemini';

interface CoachStore {
  apiKey: string;
  isApiKeySet: boolean;
  chatHistory: ChatMessage[];
  isLoading: boolean;
  error: string | null;

  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  addMessage: (msg: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  setError: (err: string | null) => void;
  clearHistory: () => void;
}

export const useCoachStore = create<CoachStore>()(
  persist(
    (set) => ({
      apiKey: '',
      isApiKeySet: false,
      chatHistory: [],
      isLoading: false,
      error: null,

      setApiKey: (key) => {
        initGemini(key);
        set({ apiKey: key, isApiKeySet: true, error: null });
      },

      clearApiKey: () => set({ apiKey: '', isApiKeySet: false }),

      addMessage: (msg) => set((state) => ({
        chatHistory: [...state.chatHistory, msg],
      })),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (err) => set({ error: err }),

      clearHistory: () => set({ chatHistory: [] }),
    }),
    {
      name: 'backgammon-coach',
      partialize: (state) => ({ apiKey: state.apiKey, isApiKeySet: state.isApiKeySet }),
      onRehydrateStorage: () => (state) => {
        if (state?.apiKey) initGemini(state.apiKey);
      },
    }
  )
);
