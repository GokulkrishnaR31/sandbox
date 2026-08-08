const { exec } = require('child_process');
const path = require('path');
const { executeCode } = require('./judge0');

const AST_SCRIPT = path.join(__dirname, '..', 'scripts', 'ast_analyzer.py');

async function findPythonCmd() {
  for (const cmd of ['python', 'python3', 'py']) {
    const works = await new Promise(resolve =>
      exec(`${cmd} --version`, { timeout: 3000 }, err => resolve(!err))
    );
    if (works) return cmd;
  }
  return null;
}

/**
 * Static complexity analysis via Python AST parser.
 * Returns { timeComplexity, spaceComplexity, maxLoopDepth }
 */

function getStaticComplexity(code) {
  return new Promise(async (resolve) => {
    const pyCmd = await findPythonCmd();
    if (!pyCmd) {
      return resolve({ timeComplexity: 'O(n)', spaceComplexity: 'O(1)', maxLoopDepth: 1 });
    }

    const child = exec(
      `${pyCmd} ast_analyzer.py`,
      { cwd: path.dirname(AST_SCRIPT), timeout: 8000 },
      (err, stdout, stderr) => {
        if (err) {
          console.warn('[COMPLEXITY] AST analysis failed:', err.message);
          return resolve({ timeComplexity: 'O(n)', spaceComplexity: 'O(1)', maxLoopDepth: 1 });
        }
        try {
          resolve(JSON.parse(stdout));
        } catch {
          console.warn('[COMPLEXITY] Failed to parse AST output:', stdout);
          resolve({ timeComplexity: 'O(n)', spaceComplexity: 'O(1)', maxLoopDepth: 1 });
        }
      },
    );
    child.stdin?.write(code);
    child.stdin?.end();
  });
}

function generateDefaultInput(n) {
  const nums = Array.from({ length: Math.min(n, 100) }, (_, i) => n - i);
  return nums.join('\n');
}

/**
 * Empirical complexity benchmark — runs code via Judge0 at multiple input sizes in parallel.
 */
async function getEmpiricalComplexity(code, language) {
  const inputSizes = [10, 100, 500, 1000, 5000];

  const results = await Promise.all(
    inputSizes.map(async (n) => {
      try {
        const stdin = generateDefaultInput(n);
        const start = Date.now();
        const res = await executeCode(code, language, stdin);
        const timeMs = res.runtimeMs !== null ? res.runtimeMs : (Date.now() - start);
        return { inputSize: n, timeMs };
      } catch (err) {
        console.warn(`[COMPLEXITY] Empirical run failed for n=${n}:`, err.message);
        return { inputSize: n, timeMs: null };
      }
    })
  );

  return results;
}

module.exports = { getStaticComplexity, getEmpiricalComplexity };
