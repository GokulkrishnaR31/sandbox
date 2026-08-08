const { OpenAI } = require('openai');
const { GoogleGenAI } = require('@google/genai');

function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !key.trim() || !key.startsWith('sk-')) return null;
  return new OpenAI({ apiKey: key.trim() });
}

function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !key.trim() || key.includes('your_gemini_api_key')) return null;
  return new GoogleGenAI({ apiKey: key.trim() });
}

// ── System Prompts ──────────────────────────────────────────────────────────

const ERROR_TRANSLATION_PROMPT = `You are a code analysis assistant for a programming education platform.
You will receive a raw error message/traceback and the student's code.

Rules:
- Do NOT fix the code or provide the corrected version.
- Do NOT reveal the exact line fix — only explain WHAT went wrong and WHY, in concept-level terms.
- Keep it to 2-3 sentences maximum.
- Name the error type in plain words before giving the technical term.
- If ambiguous, mention the most likely cause based on the code shown.
- Be encouraging, never condescending.

Output strict JSON (no markdown fences, raw JSON only):
{
  "category": "Runtime" | "Syntax" | "Logic" | "Timeout" | "Memory",
  "plain_explanation": "...",
  "concept_hint": "..."
}`;

const COMPLEXITY_EXPLANATION_PROMPT = `You are a code complexity analysis assistant. You will receive:
1. The student's code
2. Static complexity estimates (AST-based) for both time AND space
3. Empirical benchmark data (execution time at increasing input sizes)

Rules:
- Confirm or gently correct the static estimates using empirical data if they disagree.
- Explain BOTH time complexity and space complexity separately.
- Point to the SPECIFIC line(s) causing each.
- Do NOT suggest the optimized solution unless explicitly asked.
- Keep each explanation under 3 sentences. Use simple analogies where helpful.

Output strict JSON (no markdown fences, raw JSON only):
{
  "confirmed_time_complexity": "O(n²)",
  "confirmed_space_complexity": "O(n)",
  "time_explanation": "...",
  "space_explanation": "...",
  "contributing_lines": [4, 5, 6],
  "empirical_match": true
}`;

const QUALITY_PROMPT = `You are a code quality reviewer for a student learning platform. You will
receive the student's code and linter output (if available).

Rules:
- Point out at most 3 issues, prioritized by impact.
- Never rewrite their code — describe improvements conceptually.
- Acknowledge one thing they did well before listing issues.
- Keep total response under 100 words.

Output strict JSON (no markdown fences, raw JSON only):
{
  "positive_note": "...",
  "suggestions": [{ "issue": "...", "why_it_matters": "..." }]
}`;

const TESTCASES_PROMPT = `You are an expert test case generator for a programming education platform.
Given a problem statement or code snippet, generate 3 to 4 test cases including typical inputs, edge cases (e.g. 0, 1, negative, boundary), and standard inputs.

Rules:
- Output clean strings for input and expectedOutput suitable for stdin and stdout.
- Ensure the expectedOutput matches what a correct implementation would print.

Output strict JSON (no markdown fences, raw JSON only):
{
  "testCases": [
    { "input": "5", "expectedOutput": "10" },
    { "input": "0", "expectedOutput": "0" }
  ]
}`;

// ── Fallback responses ──────────────────────────────────────────────────────
const FALLBACKS = {
  error: {
    category: 'Runtime',
    plain_explanation: 'There was an error in your code. Please review your logic carefully.',
    concept_hint: 'Check for typos, off-by-one errors, or incorrect assumptions about data types.',
  },
  complexity: {
    confirmed_time_complexity:  'Unknown',
    confirmed_space_complexity: 'Unknown',
    time_explanation:  'We were unable to analyze the time complexity of your code at this time.',
    space_explanation: 'We were unable to analyze the space complexity of your code at this time.',
    contributing_lines: [],
    empirical_match: false,
  },
  quality: {
    positive_note: 'Your code shows effort and structure.',
    suggestions: [{ issue: 'Analysis unavailable', why_it_matters: 'Please try again later.' }],
  },
  testcases: {
    testCases: [
      { input: '5', expectedOutput: '10' },
      { input: '10', expectedOutput: '45' }
    ]
  }
};

const SYSTEM_PROMPTS = {
  error:      ERROR_TRANSLATION_PROMPT,
  complexity: COMPLEXITY_EXPLANATION_PROMPT,
  quality:    QUALITY_PROMPT,
  testcases:  TESTCASES_PROMPT,
};

function parseJSONOutput(rawText) {
  if (!rawText) return null;
  let clean = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  let cleanStr = jsonMatch ? jsonMatch[0] : clean;
  try {
    return JSON.parse(cleanStr);
  } catch (e) {
    try {
      cleanStr = cleanStr.replace(/,\s*$/, '');
      if (!cleanStr.endsWith('}')) cleanStr += '}';
      return JSON.parse(cleanStr);
    } catch {
      return null;
    }
  }
}

/**
 * Call OpenAI or Gemini depending on which API key is set in .env.
 * Defaults to OpenAI if sk-... key is set, or Gemini if AIzaSy... key is set.
 * Always returns a parsed JSON object. Never throws.
 */
async function callLLM(type, userMessage) {
  const systemPrompt = SYSTEM_PROMPTS[type];
  if (!systemPrompt) return FALLBACKS[type] ?? {};

  // 1. Try OpenAI if a valid sk-... key is provided
  const openai = getOpenAIClient();
  if (openai) {
    const openaiModels = [process.env.OPENAI_MODEL || 'gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];
    for (const model of openaiModels) {
      try {
        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.2,
          max_tokens: 2048,
          response_format: { type: 'json_object' },
        });

        const rawText = completion.choices[0]?.message?.content ?? '';
        const parsed = parseJSONOutput(rawText);
        if (parsed) {
          return type === 'complexity' ? normalizeComplexity(parsed) : parsed;
        }
      } catch (err) {
        console.warn(`[LLM] OpenAI model ${model} error:`, err.message);
      }
    }
  }

  // 2. Try Gemini if API key is provided
  const genai = getGeminiClient();
  if (genai) {
    const geminiModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-pro'];
    let lastError = null;

    for (const model of geminiModels) {
      try {
        const response = await genai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n---\n\n${userMessage}` }],
            },
          ],
          config: {
            temperature:      0.2,
            maxOutputTokens:  2048,
            responseMimeType: 'application/json',
          },
        });

        const rawText = response.text ?? '';
        const parsed = parseJSONOutput(rawText);
        if (parsed) {
          return type === 'complexity' ? normalizeComplexity(parsed) : parsed;
        }
      } catch (err) {
        lastError = err;
        if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
          console.warn(`[LLM] Gemini model ${model} hit rate limit (429), trying next model...`);
          continue;
        }
        console.error(`[LLM] ${type} call failed on Gemini ${model}:`, err.message);
        break;
      }
    }
    console.error(`[LLM] All Gemini models failed for ${type}:`, lastError?.message);
    return FALLBACKS[type] ?? {};
  }

  console.warn(`[LLM] No valid API key found in .env. (Gemini keys must start with 'AIzaSy...', OpenAI keys must start with 'sk-'). Using static fallback.`);
  return FALLBACKS[type] ?? {};
}

function normalizeComplexity(obj) {
  if (!obj || typeof obj !== 'object') return FALLBACKS.complexity;

  let timeComp = obj.confirmed_time_complexity || obj.time_complexity || obj.timeComplexity || obj.confirmed_complexity || obj.time || 'O(n)';
  let spaceComp = obj.confirmed_space_complexity || obj.space_complexity || obj.spaceComplexity || obj.confirmed_space || obj.space || 'O(1)';

  // Clean up if wrapped in quotes or extra text
  const matchTime = timeComp.match(/O\([^\)]+\)/i);
  if (matchTime) timeComp = matchTime[0];

  const matchSpace = spaceComp.match(/O\([^\)]+\)/i);
  if (matchSpace) spaceComp = matchSpace[0];

  return {
    confirmed_time_complexity:  timeComp !== 'Unknown' ? timeComp : 'O(n)',
    confirmed_space_complexity: spaceComp !== 'Unknown' ? spaceComp : 'O(1)',
    time_explanation:  obj.time_explanation || obj.explanation || 'Time complexity evaluated based on loop structure and recursion.',
    space_explanation: obj.space_explanation || 'Space complexity evaluated based on variable allocation and data structures.',
    contributing_lines: Array.isArray(obj.contributing_lines) ? obj.contributing_lines : [],
    empirical_match:   typeof obj.empirical_match === 'boolean' ? obj.empirical_match : true,
  };
}

module.exports = { callLLM };


