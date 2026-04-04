import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GameState } from './backgammon';
import { boardToString } from './backgammon';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const COACH_SYSTEM = `You are Magnus, a world-class backgammon coach with decades of tournament experience. You teach players at all levels, from complete beginners to advanced competitors.

Your coaching style:
- Clear, encouraging, and precise
- Always explain the WHY behind strategic decisions
- Use proper backgammon terminology but explain terms when needed
- Reference specific pip counts and probability when relevant
- Keep answers focused and practical (2-4 paragraphs max unless asked for more)
- Tailor complexity to the player's stated skill level

When analyzing board positions, always consider:
1. The race (pip count differential)
2. Checker distribution and flexibility
3. Blot safety and defensive structure
4. Doubling cube implications`;

let genAI: GoogleGenerativeAI | null = null;

export function initGemini(apiKey: string) {
  genAI = new GoogleGenerativeAI(apiKey);
}

export function isGeminiReady(): boolean {
  return genAI !== null;
}

async function getModel() {
  if (!genAI) throw new Error('Gemini API not initialized. Please provide an API key.');
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

export async function analyzePosition(
  state: GameState,
  userLevel: string
): Promise<string> {
  const model = await getModel();
  const boardDesc = boardToString(state);
  const diceStr = state.dice ? `${state.dice[0]} and ${state.dice[1]}` : 'not yet rolled';

  const prompt = `${COACH_SYSTEM}

Player level: ${userLevel}

${boardDesc}
Dice rolled: ${diceStr}
Moves remaining: ${state.movesLeft.join(', ') || 'none'}

Please analyze this position and recommend the best move(s), explaining the strategic reasoning.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function explainQuizAnswer(
  question: string,
  correctAnswer: string,
  playerAnswer: string,
  explanation: string,
  userLevel: string
): Promise<string> {
  const model = await getModel();

  const prompt = `${COACH_SYSTEM}

Player level: ${userLevel}

Quiz scenario: ${question}
The player chose: ${playerAnswer}
The correct answer: ${correctAnswer}
Base explanation: ${explanation}

Please provide personalized coaching feedback explaining why the correct answer is best, and if the player was wrong, explain what the chosen move's drawback is. Be encouraging.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function coachChat(
  history: ChatMessage[],
  newMessage: string,
  userLevel: string,
  boardContext?: GameState
): Promise<string> {
  const model = await getModel();

  const contextParts: string[] = [COACH_SYSTEM, `\nPlayer level: ${userLevel}`];
  if (boardContext) {
    contextParts.push(`\nCurrent board context:\n${boardToString(boardContext)}`);
  }

  const chat = model.startChat({
    history: history.map(m => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
    systemInstruction: contextParts.join('\n'),
  });

  const result = await chat.sendMessage(newMessage);
  return result.response.text();
}

export async function getLessonExplanation(
  topic: string,
  userLevel: string
): Promise<string> {
  const model = await getModel();

  const prompt = `${COACH_SYSTEM}

Player level: ${userLevel}

Please give a focused, practical explanation of the following backgammon concept for a ${userLevel} player: "${topic}"

Include a concrete example if helpful. Keep it to 2-3 paragraphs.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
