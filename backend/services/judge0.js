const axios = require('axios');

// ── Judge0 CE — FREE public instance, no API key required ──────────────────
// https://ce.judge0.com  (community edition, open access)
const JUDGE0_BASE = 'https://ce.judge0.com';

// Language IDs — https://ce.judge0.com/languages
const LANGUAGE_IDS = {
  python:     71,   // Python 3.8.1
  javascript: 63,   // Node.js 12.14.0
  java:       62,   // Java (OpenJDK 13.0.1)
  cpp:        54,   // C++ (GCC 9.2.0)
  c:          50,   // C (GCC 9.2.0)
};

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS        = 8;

/**
 * Map Judge0 status ID → error category
 */
function categorizeStatus(statusId) {
  switch (statusId) {
    case 3:  return null;        // Accepted
    case 5:  return 'Timeout';   // Time Limit Exceeded
    case 6:  return 'Syntax';    // Compilation Error
    case 14: return 'Runtime';   // Exec Format Error
    default: return statusId >= 7 && statusId <= 13 ? 'Runtime' : null;
  }
}

function decodeB64(str) {
  if (!str) return '';
  try { return Buffer.from(str, 'base64').toString('utf-8'); } catch { return str; }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Submit + poll Judge0 CE (no API key needed).
 */
async function executeCode(code, language, stdin = '') {
  const languageId = LANGUAGE_IDS[language?.toLowerCase()];
  if (!languageId) throw new Error(`Unsupported language: ${language}`);

  // Submit with wait=true first (synchronous for fast executions)
  try {
    const resp = await axios.post(
      `${JUDGE0_BASE}/submissions?base64_encoded=true&wait=true`,
      {
        source_code:     Buffer.from(code).toString('base64'),
        language_id:     languageId,
        stdin:           Buffer.from(stdin).toString('base64'),
        cpu_time_limit:  5,
        memory_limit:    128000,
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 20000 },
    );

    const d = resp.data;

    // If status is still queued/processing, fall through to polling
    if (d.status?.id >= 3) {
      return buildResult(d);
    }

    // Poll for result
    const token = d.token;
    for (let i = 0; i < MAX_POLLS; i++) {
      await delay(POLL_INTERVAL_MS);
      const poll = await axios.get(
        `${JUDGE0_BASE}/submissions/${token}?base64_encoded=true`,
        { timeout: 10000 },
      );
      if (poll.data.status?.id >= 3) return buildResult(poll.data);
    }

    throw new Error('Execution timed out waiting for result');
  } catch (err) {
    if (err.response?.status === 429) {
      throw new Error('Rate limit hit — please wait a moment and try again.');
    }
    throw err;
  }
}

function buildResult(d) {
  const stdout      = decodeB64(d.stdout);
  const stderr      = decodeB64(d.stderr) || decodeB64(d.compile_output);
  const exitCode    = d.exit_code ?? (d.status?.id === 3 ? 0 : 1);
  const runtimeMs   = d.time ? Math.round(parseFloat(d.time) * 1000) : null;
  const memoryKb    = d.memory ?? null;
  const errorCategory = categorizeStatus(d.status?.id);
  return { stdout, stderr, exitCode, runtimeMs, memoryKb, errorCategory };
}

module.exports = { executeCode, LANGUAGE_IDS };
