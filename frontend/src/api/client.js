import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,   // 60s — complexity benchmarks can take a while
});

// ── Execute once ─────────────────────────────────────────────────────────────
export const executeCode = (code, language, stdinInput = '', studentId = 'student_001') =>
  api.post('/execute', { code, language, stdinInput, studentId }).then(r => r.data);

// ── Run test cases ────────────────────────────────────────────────────────────
export const runTests = (code, language, testCases, studentId = 'student_001') =>
  api.post('/run-tests', { code, language, testCases, studentId }).then(r => r.data);

// ── Auto-generate test cases ─────────────────────────────────────────────────
export const generateTestCases = (code, language, problemStatement = '') =>
  api.post('/generate-testcases', { code, language, problemStatement }).then(r => r.data);

// ── Analyze error ─────────────────────────────────────────────────────────────
export const analyzeError = (code, language, rawError, studentId = 'student_001') =>
  api.post('/analyze-error', { code, language, rawError, studentId }).then(r => r.data);

// ── Analyze complexity ────────────────────────────────────────────────────────
export const analyzeComplexity = (code, language, studentId = 'student_001') =>
  api.post('/analyze-complexity', { code, language, studentId }).then(r => r.data);

// ── Analyze quality ───────────────────────────────────────────────────────────
export const analyzeQuality = (code, language, studentId = 'student_001') =>
  api.post('/analyze-quality', { code, language, studentId }).then(r => r.data);

// ── Trace execution (Python only) ─────────────────────────────────────────────
export const traceExecution = (code) =>
  api.post('/trace-execution', { code }).then(r => r.data);

// ── Student history ───────────────────────────────────────────────────────────
export const getStudentHistory = (studentId = 'student_001') =>
  api.get(`/student/${studentId}/history`).then(r => r.data);
