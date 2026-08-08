const express = require('express');
const router  = express.Router();
const path    = require('path');
const { exec } = require('child_process');

const { executeCode }      = require('../services/judge0');
const { callLLM }          = require('../services/llm');
const {
  getStaticComplexity,
  getEmpiricalComplexity,
}                          = require('../services/complexityAnalyzer');
const Submission           = require('../models/Submission');
const Student              = require('../models/Student');

const TRACE_SCRIPT = path.join(__dirname, '..', 'scripts', 'trace_runner.py');

// ── Helper: try to save submission to DB (fail silently if DB is down) ──────
async function saveSubmission(data) {
  try {
    const sub = new Submission(data);
    await sub.save();
    return sub;
  } catch (err) {
    console.warn('[DB] Could not save submission:', err.message);
    return null;
  }
}

// ── Helper: ensure a student doc exists ─────────────────────────────────────
async function upsertStudent(studentId) {
  try {
    await Student.findByIdAndUpdate(
      studentId,
      { $setOnInsert: { name: studentId, preferredLanguage: 'python' } },
      { upsert: true, new: true },
    );
  } catch { /* ignore */ }
}

// ── Helper: wrap LeetCode stubs with driver code before sending to Judge0 ──────
function wrapCodeIfNeeded(code, language) {
  if (!code) return code;
  const lang = (language || '').toLowerCase();

  if (lang === 'python') {
    if ((code.includes('class Solution') || code.includes('def twoSum') || code.includes('def two_sum') || code.includes('def isPalindrome') || code.includes('def fib') || code.includes('def solve')) && !code.includes('if __name__')) {
      return `${code}

# ── Driver Execution Harness ───────────────────────────────────
if __name__ == "__main__":
    import sys, json, inspect
    raw = sys.stdin.read().strip()
    if raw:
        sol = Solution() if 'Solution' in globals() else None
        fn = None
        if sol:
            methods = [m for m in dir(sol) if not m.startswith('_') and callable(getattr(sol, m))]
            if methods: fn = getattr(sol, methods[0])
        if not fn:
            fn = globals().get('twoSum') or globals().get('two_sum') or globals().get('isPalindrome') or globals().get('fib') or globals().get('solve')
        
        if fn:
            sig = inspect.signature(fn)
            p_count = len(sig.parameters)
            lines = [l.strip() for l in raw.split('\\n') if l.strip()]
            try:
                if p_count == 2 and len(lines) >= 2:
                    nums = [int(x) for x in lines[0].replace('[','').replace(']','').replace(',', ' ').split()]
                    target = int(lines[1])
                    res = fn(nums, target)
                    print(json.dumps(res))
                elif p_count == 1:
                    line = lines[0] if lines else raw
                    if line.lstrip('-').isdigit():
                        res = fn(int(line))
                    elif line.startswith('[') or ' ' in line:
                        try:
                            nums = [int(x) for x in line.replace('[','').replace(']','').replace(',', ' ').split()]
                            res = fn(nums)
                        except:
                            res = fn(line)
                    else:
                        res = fn(line)
                    print("true" if res is True else ("false" if res is False else (json.dumps(res) if isinstance(res, (list, dict)) else res)))
            except Exception as e:
                print(e)
`;
    }
  }

  if (lang === 'javascript') {
    if ((code.includes('twoSum') || code.includes('isPalindrome') || code.includes('fib') || code.includes('solve')) && !code.includes('readFileSync')) {
      return `${code}

// ── Driver Execution Harness ───────────────────────────────────
try {
  const fs = require('fs');
  const raw = fs.readFileSync('/dev/stdin', 'utf8').trim();
  if (raw) {
    let fn = null;
    if (typeof Solution !== 'undefined') {
      const solObj = new Solution();
      const proto = Object.getPrototypeOf(solObj);
      const methods = Object.getOwnPropertyNames(proto).filter(m => m !== 'constructor' && typeof solObj[m] === 'function');
      if (methods.length > 0) fn = solObj[methods[0]].bind(solObj);
    }
    if (!fn) {
      fn = typeof twoSum !== 'undefined' ? twoSum : (typeof isPalindrome !== 'undefined' ? isPalindrome : (typeof fib !== 'undefined' ? fib : (typeof solve !== 'undefined' ? solve : null)));
    }
    if (fn) {
      const lines = raw.split('\\n').filter(Boolean);
      if (lines.length >= 2) {
        const nums = lines[0].replace(/[\\[\\],]/g, ' ').trim().split(/\\s+/).map(Number);
        const target = parseInt(lines[1]);
        const res = fn(nums, target);
        console.log(JSON.stringify(res));
      } else if (lines.length === 1) {
        const line = lines[0].trim();
        if (!isNaN(line) && line !== '') {
          const res = fn(parseInt(line));
          console.log(typeof res === 'boolean' ? (res ? 'true' : 'false') : res);
        } else {
          const res = fn(line);
          console.log(typeof res === 'boolean' ? (res ? 'true' : 'false') : res);
        }
      }
    }
  }
} catch (e) {}
`;
    }
  }

  if (lang === 'java') {
    if (code.includes('class Solution') && !code.includes('public static void main')) {
      return `${code}

public class Main {
    public static void main(String[] args) {
        try {
            java.util.Scanner sc = new java.util.Scanner(System.in);
            if (!sc.hasNextLine()) return;
            StringBuilder sb = new StringBuilder();
            while (sc.hasNextLine()) {
                sb.append(sc.nextLine()).append("\\n");
            }
            String raw = sb.toString().trim();
            if (raw.isEmpty()) return;

            Solution sol = new Solution();
            java.lang.reflect.Method targetMethod = null;
            for (java.lang.reflect.Method m : sol.getClass().getDeclaredMethods()) {
                if (!m.getName().contains("$") && !java.lang.reflect.Modifier.isStatic(m.getModifiers())) {
                    targetMethod = m;
                    break;
                }
            }
            if (targetMethod == null) return;
            targetMethod.setAccessible(true);
            Class<?>[] pTypes = targetMethod.getParameterTypes();
            String[] lines = raw.split("\\n");

            if (pTypes.length == 2 && pTypes[0] == int[].class && pTypes[1] == int.class) {
                String[] parts = lines[0].replace("[","").replace("]","").replace(","," ").trim().split("\\\\s+");
                int[] nums = new int[parts.length];
                for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
                int target = Integer.parseInt((lines.length > 1 ? lines[1] : lines[0]).trim());
                Object res = targetMethod.invoke(sol, nums, target);
                if (res instanceof int[]) {
                    System.out.println(java.util.Arrays.toString((int[]) res));
                } else {
                    System.out.println(res);
                }
            } else if (pTypes.length == 1 && (pTypes[0] == int.class || pTypes[0] == Integer.class)) {
                int n = Integer.parseInt(lines[0].trim());
                Object res = targetMethod.invoke(sol, n);
                System.out.println(res);
            } else if (pTypes.length == 1 && pTypes[0] == String.class) {
                Object res = targetMethod.invoke(sol, raw);
                System.out.println(res);
            } else if (pTypes.length == 1 && pTypes[0] == int[].class) {
                String[] parts = raw.replace("[","").replace("]","").replace(","," ").trim().split("\\\\s+");
                int[] nums = new int[parts.length];
                for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);
                Object res = targetMethod.invoke(sol, (Object) nums);
                if (res instanceof int[]) {
                    System.out.println(java.util.Arrays.toString((int[]) res));
                } else {
                    System.out.println(res);
                }
            } else {
                System.out.println(targetMethod.invoke(sol, raw));
            }
        } catch (Exception e) {
            System.err.println(e.getMessage());
        }
    }
}
`;
    }
  }

  if (lang === 'cpp') {
    if (code.includes('class Solution') && !code.includes('int main')) {
      const hasTwoSum = code.includes('twoSum');
      const hasPalindrome = code.includes('isPalindrome');
      const hasFib = code.includes('fib');

      return `${code}

#include <iostream>
#include <vector>
#include <string>
#include <sstream>
using namespace std;

int main() {
    Solution sol;
    string l1;
    if (!getline(cin, l1)) return 0;
    string l2;
    getline(cin, l2);

${hasTwoSum ? `
    stringstream ss(l1);
    vector<int> nums;
    int val;
    while (ss >> val) nums.push_back(val);
    int target = l2.empty() ? 0 : stoi(l2);
    vector<int> res = sol.twoSum(nums, target);
    cout << "[";
    for (size_t i = 0; i < res.size(); i++) {
        cout << res[i] << (i + 1 < res.size() ? ", " : "");
    }
    cout << "]" << endl;
` : hasPalindrome ? `
    bool res = sol.isPalindrome(l1);
    cout << (res ? "true" : "false") << endl;
` : hasFib ? `
    int n = stoi(l1);
    cout << sol.fib(n) << endl;
` : `
    int n = stoi(l1);
    cout << sol.solve(n) << endl;
`}
    return 0;
}
`;
    }
  }

  return code;
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/execute
// Body: { code, language, stdinInput, studentId? }
// ────────────────────────────────────────────────────────────────────────────
router.post('/execute', async (req, res) => {
  const { code, language, stdinInput = '', studentId = 'anonymous' } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'code and language are required' });
  }

  try {
    const executableCode = wrapCodeIfNeeded(code, language);
    const result = await executeCode(executableCode, language, stdinInput);

    // Persist submission
    await upsertStudent(studentId);
    await saveSubmission({
      studentId,
      code,
      language,
      stdout:       result.stdout,
      stderr:       result.stderr,
      exitCode:     result.exitCode,
      runtimeMs:    result.runtimeMs,
      memoryUsedKb: result.memoryKb,
      errorCategory: result.errorCategory,
    });

    return res.json(result);
  } catch (err) {
    console.error('[/execute]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/run-tests
// Body: { code, language, testCases: [{input, expectedOutput}], studentId? }
// ────────────────────────────────────────────────────────────────────────────
router.post('/run-tests', async (req, res) => {
  const { code, language, testCases = [], studentId = 'anonymous' } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'code and language are required' });
  }
  if (!Array.isArray(testCases) || testCases.length === 0) {
    return res.status(400).json({ error: 'testCases must be a non-empty array' });
  }

  try {
    const executableCode = wrapCodeIfNeeded(code, language);
    const results = await Promise.all(
      testCases.map(async (tc) => {
        try {
          const result = await executeCode(executableCode, language, tc.input ?? '');
          const actual   = (result.stdout ?? '').trim();
          const expected = (tc.expectedOutput ?? '').trim();
          const passed   = actual === expected;
          return {
            input:    tc.input ?? '',
            expected,
            actual,
            passed,
            stderr:   result.stderr,
            runtimeMs: result.runtimeMs,
          };
        } catch (err) {
          return {
            input:    tc.input ?? '',
            expected: (tc.expectedOutput ?? '').trim(),
            actual:   '',
            passed:   false,
            stderr:   err.message,
            runtimeMs: null,
          };
        }
      }),
    );

    const passedCount = results.filter(r => r.passed).length;

    // Persist
    await upsertStudent(studentId);
    await saveSubmission({
      studentId,
      code,
      language,
      testResults: results.map(r => ({
        input: r.input, expected: r.expected, actual: r.actual, passed: r.passed,
      })),
    });

    return res.json({ results, summary: { total: results.length, passed: passedCount, failed: results.length - passedCount } });
  } catch (err) {
    console.error('[/run-tests]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/generate-testcases
// Body: { code, language, problemStatement? }
// Generates 3-4 problem-matched test cases dynamically using Gemini LLM
// ────────────────────────────────────────────────────────────────────────────
router.post('/generate-testcases', async (req, res) => {
  const { code, language, problemStatement = '' } = req.body;

  if (!code && !problemStatement) {
    return res.status(400).json({ error: 'code or problemStatement is required' });
  }

  const userMessage = `Language: ${language || 'python'}

${problemStatement ? `Problem Statement:\n${problemStatement}\n\n` : ''}Student Code:\n\`\`\`\n${code || ''}\n\`\`\``;

  const result = await callLLM('testcases', userMessage);
  const testCases = Array.isArray(result?.testCases) ? result.testCases : [
    { input: '5', expectedOutput: '10' },
    { input: '10', expectedOutput: '45' }
  ];

  return res.json({ testCases });
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/analyze-error
// Body: { code, language, rawError, studentId? }
// ────────────────────────────────────────────────────────────────────────────
router.post('/analyze-error', async (req, res) => {
  const { code, language, rawError, studentId = 'anonymous' } = req.body;

  if (!code || !rawError) {
    return res.status(400).json({ error: 'code and rawError are required' });
  }

  const userMessage = `Language: ${language}\n\nStudent Code:\n\`\`\`\n${code}\n\`\`\`\n\nRaw Error:\n\`\`\`\n${rawError}\n\`\`\``;
  const analysis = await callLLM('error', userMessage);

  // Update last submission's error category if possible
  try {
    await Submission.findOneAndUpdate(
      { studentId },
      { $set: { errorCategory: analysis.category, errorExplanation: { plain_explanation: analysis.plain_explanation, concept_hint: analysis.concept_hint } } },
      { sort: { timestamp: -1 } },
    );
  } catch { /* ignore */ }

  return res.json(analysis);
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/analyze-complexity
// Body: { code, language, studentId? }
// Works for ALL languages. Static AST only available for Python.
// LLM estimates complexity from code reading + empirical data for other languages.
// ────────────────────────────────────────────────────────────────────────────
router.post('/analyze-complexity', async (req, res) => {
  const { code, language, studentId = 'anonymous' } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'code and language are required' });
  }

  const isPython = language.toLowerCase() === 'python';

  // 1. Static AST — Python only. For other languages, LLM will estimate from code.
  let staticResult = null;
  if (isPython) {
    staticResult = await getStaticComplexity(code);
  }

  // 2. Empirical benchmark — works for ALL languages via Judge0
  const empirical = await getEmpiricalComplexity(code, language);

  // 3. Build context for LLM — works for all languages
  const staticSection = staticResult
    ? `Static AST Analysis (Python):
  Time Complexity:  ${staticResult.timeComplexity} (max loop depth: ${staticResult.maxLoopDepth})
  Space Complexity: ${staticResult.spaceComplexity}`
    : `Static AST Analysis: Not available for ${language}. Please estimate time and space complexity by reading the code directly.`;

  const userMessage = `Language: ${language}

Student Code:
\`\`\`
${code}
\`\`\`

${staticSection}

Empirical Benchmark Data (execution time at increasing input sizes):
${empirical.map(p => `  n=${p.inputSize}: ${p.timeMs !== null ? p.timeMs + 'ms' : 'failed/skipped'}`).join('\n')}`;

  const explanation = await callLLM('complexity', userMessage);

  const responseData = {
    staticTimeComplexity:  staticResult?.timeComplexity  ?? null,
    staticSpaceComplexity: staticResult?.spaceComplexity ?? null,
    empiricalData:  empirical,
    explanation,
    language,
  };

  // Persist
  try {
    await Submission.findOneAndUpdate(
      { studentId },
      { $set: {
        staticComplexity:    explanation?.confirmed_time_complexity ?? staticResult?.timeComplexity,
        empiricalComplexity: empirical,
        complexityExplanation: explanation,
      }},
      { sort: { timestamp: -1 } },
    );
  } catch { /* ignore */ }

  return res.json(responseData);
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/analyze-quality
// Body: { code, language, studentId? }
// ────────────────────────────────────────────────────────────────────────────
router.post('/analyze-quality', async (req, res) => {
  const { code, language, studentId = 'anonymous' } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'code and language are required' });
  }

  // Linter stub — could run pylint/flake8 via child_process for Python
  // For non-Python or when linter unavailable, we pass an empty linter note
  let linterOutput = 'Linter not available for this language.';

  if (language.toLowerCase() === 'python') {
    linterOutput = await runPylint(code).catch(() => 'Linter unavailable');
  }

  const userMessage = `Language: ${language}

Student Code:
\`\`\`
${code}
\`\`\`

Linter Output:
\`\`\`
${linterOutput}
\`\`\``;

  const quality = await callLLM('quality', userMessage);

  // Persist
  try {
    await Submission.findOneAndUpdate(
      { studentId },
      { $set: { qualityFeedback: quality } },
      { sort: { timestamp: -1 } },
    );
  } catch { /* ignore */ }

  return res.json(quality);
});

// ── Pylint helper ────────────────────────────────────────────────────────────
function runPylint(code) {
  return new Promise((resolve, reject) => {
    const child = exec(
      'python -c "import pylint; print(\'ok\')" 2>&1 && python -m pylint --from-stdin main.py 2>&1',
      { timeout: 8000 },
      (err, stdout) => {
        // pylint exits non-zero for warnings too — that's expected
        resolve(stdout || '');
      },
    );
    child.stdin?.write(code);
    child.stdin?.end();
  });
}

// Helper: find a working Python command on Windows/Linux/Mac
async function findPythonCmd() {
  for (const cmd of ['python', 'python3', 'py']) {
    const works = await new Promise(resolve =>
      exec(`${cmd} --version`, { timeout: 3000 }, err => resolve(!err))
    );
    if (works) return cmd;
  }
  return null;
}

const SCRIPTS_DIR = path.join(__dirname, '..', 'scripts');

// ────────────────────────────────────────────────────────────────────────────
// POST /api/trace-execution
// Body: { code }  — Python ONLY
// ────────────────────────────────────────────────────────────────────────────
router.post('/trace-execution', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code is required' });

  const pythonCmd = await findPythonCmd();
  if (!pythonCmd) {
    return res.json({
      steps: [], output: '',
      error: 'Python not found on PATH. Install Python 3 and restart the server.',
    });
  }

  const result = await new Promise((resolve) => {
    const child = exec(
      `${pythonCmd} trace_runner.py`,
      { cwd: SCRIPTS_DIR, timeout: 12000 },
      (err, stdout, stderr) => {
        if (err && !stdout) {
          console.error('[TRACE] stderr:', stderr);
          return resolve({ steps: [], output: '', error: stderr || err.message });
        }
        try {
          resolve(JSON.parse(stdout));
        } catch {
          console.error('[TRACE] bad JSON, raw stdout:', stdout?.slice(0, 300));
          resolve({ steps: [], output: stdout || '', error: 'Failed to parse trace output' });
        }
      },
    );
    if (child.stdin) { child.stdin.write(code); child.stdin.end(); }
  });

  return res.json(result);
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/student/:id/history
// Returns aggregated data for the history charts
// ────────────────────────────────────────────────────────────────────────────
router.get('/student/:id/history', async (req, res) => {
  const { id } = req.params;

  try {
    const submissions = await Submission.find({ studentId: id })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    if (!submissions.length) {
      return res.json({
        totalSubmissions: 0,
        errorBreakdown:   [],
        complexityDist:   [],
        testPassRates:    [],
        recentSubmissions: [],
      });
    }

    // Error category breakdown
    const errorCounts = {};
    for (const s of submissions) {
      if (s.errorCategory) {
        errorCounts[s.errorCategory] = (errorCounts[s.errorCategory] || 0) + 1;
      }
    }
    const errorBreakdown = Object.entries(errorCounts).map(([name, value]) => ({ name, value }));

    // Complexity distribution
    const complexityCounts = {};
    for (const s of submissions) {
      if (s.staticComplexity) {
        complexityCounts[s.staticComplexity] = (complexityCounts[s.staticComplexity] || 0) + 1;
      }
    }
    const complexityDist = Object.entries(complexityCounts).map(([name, count]) => ({ name, count }));

    // Test pass rates over last 20 submissions (with test results)
    const withTests = submissions.filter(s => s.testResults?.length > 0).slice(0, 20).reverse();
    const testPassRates = withTests.map((s, i) => {
      const passed = s.testResults.filter(t => t.passed).length;
      return {
        index: i + 1,
        date:  s.timestamp,
        passRate: Math.round((passed / s.testResults.length) * 100),
      };
    });

    return res.json({
      totalSubmissions: submissions.length,
      errorBreakdown,
      complexityDist,
      testPassRates,
      recentSubmissions: submissions.slice(0, 5).map(s => ({
        id:        s._id,
        language:  s.language,
        timestamp: s.timestamp,
        passed:    s.testResults?.every(t => t.passed) ?? null,
      })),
    });
  } catch (err) {
    console.error('[/history]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.wrapCodeIfNeeded = wrapCodeIfNeeded;
