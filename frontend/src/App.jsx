import { useState, useEffect, useCallback } from 'react';
import CodeEditorPanel from './components/CodeEditorPanel';
import TestResultGrid from './components/TestResultGrid';
import DiffView from './components/DiffView';
import ErrorPanel from './components/ErrorPanel';
import RuntimeChart from './components/RuntimeChart';
import ComplexityBadge from './components/ComplexityBadge';
import ErrorBreakdownChart from './components/ErrorBreakdownChart';
import ComplexityDistChart from './components/ComplexityDistChart';
import QualityFeedbackCard from './components/QualityFeedbackCard';
import {
  executeCode, runTests, analyzeError,
  analyzeComplexity, analyzeQuality, generateTestCases,
  getStudentHistory,
} from './api/client';

const STUDENT_ID = 'student_001';

const DEFAULT_TEST_CASES = [
  { input: '5', expectedOutput: '5' },
  { input: 'Hello', expectedOutput: 'Hello' },
];

const DEFAULT_STUBS = {
  python: `def main():\n    # Write your code here\n    print("Hello, World!")\n\nif __name__ == "__main__":\n    main()\n`,
  javascript: `// Write your code here\nconsole.log("Hello, World!");\n`,
  java: `public class Main {\n    public static void main(String[] args) {\n        // Write your code here\n        System.out.println("Hello, World!");\n    }\n}\n`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n`,
  c: `#include <stdio.h>\n\nint main() {\n    // Write your code here\n    printf("Hello, World!\\n");\n    return 0;\n}\n`,
};

const TABS = ['Output', 'Tests', 'Analysis', 'History'];

// ── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ height = 80, lines = 1 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="animate-pulse" style={{
          height, borderRadius: 8,
          background: 'var(--color-surface-card)',
          opacity: 0.6 - i * 0.1,
        }} />
      ))}
    </div>
  );
}

// ── Status notification ──────────────────────────────────────────────────────
function Toast({ message, type }) {
  if (!message) return null;
  const colors = { success: '#22c55e', error: '#ef4444', info: '#3b82f6' };
  return (
    <div className="animate-slide-up" style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 999,
      background: 'var(--color-surface-card)',
      border: `1px solid ${colors[type] ?? '#3b82f6'}`,
      borderRadius: 10, padding: '10px 18px',
      color: colors[type] ?? '#3b82f6',
      fontWeight: 600, fontSize: '0.85rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {message}
    </div>
  );
}

export default function App() {
  // ── Editor & Language state ───────────────────────────────────────────────
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem('cognito_lang') || 'python'; } catch { return 'python'; }
  });

  const [codeByLang, setCodeByLang] = useState(() => {
    try {
      const saved = localStorage.getItem('cognito_codeByLang');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_STUBS;
  });

  const [code, setCode] = useState(() => {
    try {
      const saved = localStorage.getItem('cognito_codeByLang');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[language]) return parsed[language];
      }
    } catch {}
    return DEFAULT_STUBS[language] || DEFAULT_STUBS.python;
  });

  const [testCases, setTestCases] = useState(() => {
    try {
      const saved = localStorage.getItem('cognito_testCases');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_TEST_CASES;
  });

  const [activeTab, setActiveTab] = useState('Output');

  // ── Sync to localStorage for stability across page refreshes ─────────────
  useEffect(() => {
    try {
      localStorage.setItem('cognito_lang', language);
      localStorage.setItem('cognito_testCases', JSON.stringify(testCases));
      localStorage.setItem('cognito_codeByLang', JSON.stringify({ ...codeByLang, [language]: code }));
    } catch (e) {
      console.warn('localStorage sync failed:', e.message);
    }
  }, [language, code, testCases, codeByLang]);

  // ── Language Change Handler — preserves code per language ──────────────────
  const handleLanguageChange = (newLang) => {
    if (newLang === language) return;

    const updatedCodeByLang = { ...codeByLang, [language]: code };
    setCodeByLang(updatedCodeByLang);

    let newCode = updatedCodeByLang[newLang] || DEFAULT_STUBS[newLang] || '';
    setLanguage(newLang);
    setCode(newCode);
    showToast(`Switched to ${newLang}`, 'info', 1500);
  };

  // ── Execution results ─────────────────────────────────────────────────────
  const [output, setOutput]           = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [errorAnalysis, setErrorAnalysis] = useState(null);
  const [complexityData, setComplexityData] = useState(null);
  const [qualityData, setQualityData] = useState(null);
  const [history, setHistory]         = useState(null);

  // ── Loading states ────────────────────────────────────────────────────────
  const [isGeneratingTests, setIsGeneratingTests] = useState(false);
  const [isRunning, setIsRunning]         = useState(false);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [isAnalyzing, setIsAnalyzing]     = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info', ms = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), ms);
  };

  // Reset code to starter template
  const handleResetCode = () => {
    const stub = DEFAULT_STUBS[language] || '';
    setCode(stub);
    setCodeByLang(prev => ({ ...prev, [language]: stub }));
    showToast('↺ Code reset to template', 'info');
  };

  // ── Load history on mount ─────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const data = await getStudentHistory(STUDENT_ID);
      setHistory(data);
    } catch (err) {
      console.warn('History load failed:', err.message);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ── Run code ──────────────────────────────────────────────────────────────
  const handleRun = async () => {
    setIsRunning(true);
    setActiveTab('Output');
    setOutput(null);
    setErrorAnalysis(null);

    try {
      const result = await executeCode(code, language, '', STUDENT_ID);
      setOutput(result);

      // Auto-trigger error analysis if there's a stderr
      if (result.stderr) {
        const errAnalysis = await analyzeError(code, language, result.stderr, STUDENT_ID);
        setErrorAnalysis(errAnalysis);
      }
      showToast(result.stderr ? '⚠ Code ran with errors' : '✓ Code executed successfully', result.stderr ? 'error' : 'success');
    } catch (err) {
      showToast('Execution failed: ' + err.message, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  // ── Run tests ─────────────────────────────────────────────────────────────
  const handleRunTests = async () => {
    setIsTestRunning(true);
    setActiveTab('Tests');
    setTestResults(null);

    try {
      const result = await runTests(code, language, testCases, STUDENT_ID);
      setTestResults(result);
      showToast(
        result.summary.failed === 0
          ? `✓ All ${result.summary.total} tests passed!`
          : `${result.summary.failed} of ${result.summary.total} tests failed`,
        result.summary.failed === 0 ? 'success' : 'error',
      );
    } catch (err) {
      showToast('Test run failed: ' + err.message, 'error');
    } finally {
      setIsTestRunning(false);
      await loadHistory();
    }
  };

  // ── Analyze (complexity + quality) ────────────────────────────────────────
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setActiveTab('Analysis');
    setComplexityData(null);
    setQualityData(null);

    try {
      // Run complexity + quality in parallel
      const [complexity, quality] = await Promise.all([
        analyzeComplexity(code, language, STUDENT_ID),
        analyzeQuality(code, language, STUDENT_ID),
      ]);
      setComplexityData(complexity);
      setQualityData(quality);
      showToast('✓ Analysis complete', 'success');
      await loadHistory();
    } catch (err) {
      showToast('Analysis failed: ' + err.message, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Auto-generate test cases ──────────────────────────────────────────────
  const handleAutoGenerateTestCases = async () => {
    setIsGeneratingTests(true);
    try {
      const res = await generateTestCases(code, language, 'Generate test cases for current code');
      if (res.testCases && res.testCases.length > 0) {
        setTestCases(res.testCases);
        showToast(`✓ AI generated ${res.testCases.length} test cases!`, 'success');
      }
    } catch (err) {
      showToast('Test case generation failed: ' + err.message, 'error');
    } finally {
      setIsGeneratingTests(false);
    }
  };

  // ── Test case editor helper ───────────────────────────────────────────────
  const updateTestCase = (index, field, value) => {
    setTestCases(prev => prev.map((tc, i) => i === index ? { ...tc, [field]: value } : tc));
  };
  const addTestCase    = () => setTestCases(prev => [...prev, { input: '', expectedOutput: '' }]);
  const removeTestCase = (i) => setTestCases(prev => prev.filter((_, idx) => idx !== i));

  const handleClearAll = () => {
    try {
      localStorage.removeItem('cognito_lang');
      localStorage.removeItem('cognito_codeByLang');
      localStorage.removeItem('cognito_testCases');
    } catch {}

    setLanguage('python');
    setCode(DEFAULT_STUBS.python);
    setCodeByLang(DEFAULT_STUBS);
    setTestCases(DEFAULT_TEST_CASES);
    setOutput(null);
    setTestResults(null);
    setErrorAnalysis(null);
    setComplexityData(null);
    setQualityData(null);
    showToast('🧹 Workspace reset!', 'info');
  };

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 52,
        background: 'var(--color-surface-raised)',
        borderBottom: '1px solid var(--color-surface-border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.3rem' }}>🧠</span>
          <span style={{ fontWeight: 700, fontSize: '1.05rem', background: 'linear-gradient(135deg, #3b82f6, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Cognito
          </span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', marginLeft: 4 }}>
            AI Coding Tutor
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
          {history && (
            <span>
              {history.totalSubmissions} submission{history.totalSubmissions !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={handleClearAll}
            title="Clear all stored state for fresh testing"
            style={{
              background: 'rgba(239,68,68,0.12)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🧹 Clear All
          </button>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} title="Connected" />
        </div>
      </header>

      {/* ── Main 2-column layout ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '14px', gap: 14 }}>

        {/* LEFT — Editor ─────────────────────────────────────────────────── */}
        <div style={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <CodeEditorPanel
            code={code} setCode={setCode}
            language={language} setLanguage={setLanguage}
            onLanguageChange={handleLanguageChange}
            onResetCode={handleResetCode}
            onRun={handleRun}
            onRunTests={handleRunTests}
            onAnalyze={handleAnalyze}
            isRunning={isRunning}
            isTestRunning={isTestRunning}
            isAnalyzing={isAnalyzing}
          />
        </div>

        {/* RIGHT — Results panel ──────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--color-surface-raised)', borderRadius: 12, border: '1px solid var(--color-surface-border)', overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-surface-border)', flexShrink: 0 }}>
            {TABS.map(tab => (
              <button
                key={tab}
                id={`tab-${tab.toLowerCase()}`}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid var(--color-brand-primary)' : '2px solid transparent',
                  color: activeTab === tab ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
                  fontWeight: activeTab === tab ? 600 : 400,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

            {/* ── OUTPUT TAB ─────────────────────────────────────────────── */}
            {activeTab === 'Output' && (
              <div>
                {isRunning && <Skeleton height={100} lines={3} />}

                {!isRunning && output && (
                  <div className="animate-fade-in">
                    {/* Runtime info badges */}
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      {output.runtimeMs !== null && (
                        <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--color-brand-primary)' }}>
                          ⏱ {output.runtimeMs} ms
                        </span>
                      )}
                      {output.memoryKb && (
                        <span className="badge" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
                          📦 {Math.round(output.memoryKb / 1024)} MB
                        </span>
                      )}
                      <span className="badge" style={{
                        background: output.exitCode === 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: output.exitCode === 0 ? 'var(--color-brand-success)' : 'var(--color-brand-danger)',
                      }}>
                        Exit {output.exitCode}
                      </span>
                    </div>

                    {/* stdout */}
                    {output.stdout && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>📤 Output (stdout)</div>
                        <pre style={{ background: 'var(--color-surface-card)', borderRadius: 8, padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.83rem', color: 'var(--color-brand-success)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {output.stdout}
                        </pre>
                      </div>
                    )}

                    {/* Error panel */}
                    {(output.stderr || errorAnalysis) && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>error output</div>
                        <ErrorPanel analysis={errorAnalysis} rawError={output.stderr} />
                      </div>
                    )}

                    {/* Empty output */}
                    {!output.stdout && !output.stderr && (
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                        No output produced.
                      </div>
                    )}
                  </div>
                )}

                {!isRunning && !output && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>▶</div>
                    <div style={{ fontSize: '0.88rem' }}>Click <strong>Run</strong> to execute your code</div>
                  </div>
                )}
              </div>
            )}

            {/* ── TESTS TAB ──────────────────────────────────────────────── */}
            {activeTab === 'Tests' && (
              <div>
                {/* Test case editor */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Test Cases
                      </div>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }}>
                        Custom Mode
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        id="btn-auto-gen-tests"
                        onClick={handleAutoGenerateTestCases}
                        disabled={isGeneratingTests}
                        style={{
                          background: 'rgba(168,85,247,0.15)',
                          color: '#a855f7',
                          border: '1px solid rgba(168,85,247,0.3)',
                          borderRadius: 6,
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: isGeneratingTests ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        {isGeneratingTests ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Generating...</> : '⚡ Auto-Generate'}
                      </button>
                      <button
                        id="btn-add-test"
                        onClick={addTestCase}
                        style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--color-brand-primary)', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {testCases.map((tc, i) => (
                    <div key={i} className="glass" style={{ borderRadius: 8, padding: '10px 12px', marginBottom: 8, display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Input</div>
                        <textarea
                          value={tc.input}
                          onChange={e => updateTestCase(i, 'input', e.target.value)}
                          rows={2}
                          style={{ width: '100%', background: 'var(--color-surface-base)', color: 'var(--color-text-primary)', border: '1px solid var(--color-surface-border)', borderRadius: 6, padding: '5px 8px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', resize: 'vertical', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Expected Output</div>
                        <textarea
                          value={tc.expectedOutput}
                          onChange={e => updateTestCase(i, 'expectedOutput', e.target.value)}
                          rows={2}
                          style={{ width: '100%', background: 'var(--color-surface-base)', color: 'var(--color-text-primary)', border: '1px solid var(--color-surface-border)', borderRadius: 6, padding: '5px 8px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', resize: 'vertical', outline: 'none' }}
                        />
                      </div>
                      <button
                        onClick={() => removeTestCase(i)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-brand-danger)', cursor: 'pointer', fontSize: '1rem', paddingTop: 16 }}
                        title="Remove test case"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                {isTestRunning && <Skeleton height={60} lines={3} />}

                {!isTestRunning && testResults && (
                  <div className="animate-slide-up">
                    {/* Summary bar */}
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', fontWeight: 500 }}>Results</span>
                      <span className="badge" style={{ background: 'rgba(34,197,94,0.18)', color: 'var(--color-brand-success)' }}>
                        ✓ {testResults.summary.passed} passed
                      </span>
                      <span className="badge" style={{ background: 'rgba(239,68,68,0.18)', color: 'var(--color-brand-danger)' }}>
                        ✗ {testResults.summary.failed} failed
                      </span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', marginLeft: 'auto' }}>
                        {Math.round((testResults.summary.passed / testResults.summary.total) * 100)}% pass rate
                      </span>
                    </div>

                    {/* Detailed results table */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {testResults.results.map((r, i) => (
                        <div key={i} className="glass" style={{
                          borderRadius: 10,
                          overflow: 'hidden',
                          border: `1px solid ${r.passed ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        }}>
                          {/* Test header */}
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 14px',
                            background: r.passed ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                            borderBottom: '1px solid var(--color-surface-border)',
                          }}>
                            <span style={{ fontWeight: 700, color: r.passed ? 'var(--color-brand-success)' : 'var(--color-brand-danger)', fontSize: '0.9rem' }}>
                              {r.passed ? '✓' : '✗'}
                            </span>
                            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '0.82rem' }}>Test {i + 1}</span>
                            {r.runtimeMs && (
                              <span style={{ marginLeft: 'auto', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>⏱ {r.runtimeMs}ms</span>
                            )}
                          </div>

                          {/* 3-column grid: Input | Expected | Actual */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                            <div style={{ padding: '10px 12px', borderRight: '1px solid var(--color-surface-border)' }}>
                              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Input</div>
                              <pre style={{ color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{r.input || '(none)'}</pre>
                            </div>
                            <div style={{ padding: '10px 12px', borderRight: '1px solid var(--color-surface-border)' }}>
                              <div style={{ color: 'var(--color-brand-success)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Expected</div>
                              <pre style={{ color: 'var(--color-brand-success)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{r.expected || '(empty)'}</pre>
                            </div>
                            <div style={{ padding: '10px 12px' }}>
                              <div style={{ color: r.passed ? 'var(--color-brand-success)' : 'var(--color-brand-danger)', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Your Output</div>
                              <pre style={{ color: r.passed ? 'var(--color-brand-success)' : 'var(--color-brand-danger)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{r.actual || (r.stderr ? '(error)' : '(empty)')}</pre>
                              {r.stderr && !r.passed && (
                                <pre style={{ color: '#f97316', fontSize: '0.7rem', marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.stderr.slice(0, 120)}</pre>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!isTestRunning && !testResults && (
                  <div style={{ textAlign: 'center', padding: '24px 20px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    Click <strong>Run Tests</strong> to evaluate your code against the test cases above.
                  </div>
                )}
              </div>
            )}

            {/* ── ANALYSIS TAB ───────────────────────────────────────────── */}
            {activeTab === 'Analysis' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {isAnalyzing && <Skeleton height={80} lines={4} />}

                {!isAnalyzing && complexityData && (
                  <div className="glass animate-slide-up" style={{ borderRadius: 12, padding: '16px' }}>
                    {/* Time + Space badges side by side */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>⏱ Time Complexity</div>
                        <ComplexityBadge
                          align="left"
                          complexity={complexityData.explanation?.confirmed_time_complexity || complexityData.staticTimeComplexity}
                          explanation={complexityData.explanation ? {
                            confirmed_complexity: complexityData.explanation.confirmed_time_complexity,
                            explanation: complexityData.explanation.time_explanation,
                            contributing_lines: complexityData.explanation.contributing_lines,
                            empirical_match: complexityData.explanation.empirical_match,
                          } : null}
                        />
                      </div>
                      <div style={{ width: 1, height: 40, background: 'var(--color-surface-border)' }} />
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>📦 Space Complexity</div>
                        <ComplexityBadge
                          align="right"
                          complexity={complexityData.explanation?.confirmed_space_complexity || complexityData.staticSpaceComplexity}
                          explanation={complexityData.explanation ? {
                            confirmed_complexity: complexityData.explanation.confirmed_space_complexity,
                            explanation: complexityData.explanation.space_explanation,
                            contributing_lines: [],
                            empirical_match: null,
                          } : null}
                        />
                      </div>
                    </div>

                    {/* Empirical match indicator */}
                    {complexityData.explanation?.empirical_match !== undefined && (
                      <div style={{ fontSize: '0.75rem', color: complexityData.explanation.empirical_match ? 'var(--color-brand-success)' : '#f97316', marginBottom: 12 }}>
                        {complexityData.explanation.empirical_match ? '✓ Time complexity confirmed by benchmark' : 'ℹ️ Benchmark analyzed across 5 input sizes'}
                      </div>
                    )}

                    <RuntimeChart
                      data={complexityData.empiricalData}
                      staticComplexity={complexityData.staticTimeComplexity}
                    />
                  </div>
                )}

                {!isAnalyzing && qualityData && (
                  <div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: 8 }}>Code Quality</div>
                    <QualityFeedbackCard quality={qualityData} />
                  </div>
                )}

                {!isAnalyzing && !complexityData && !qualityData && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>⚡</div>
                    <div style={{ fontSize: '0.88rem' }}>Click <strong>Analyze</strong> to get time + space complexity and quality insights</div>
                  </div>
                )}
              </div>
            )}



            {/* ── HISTORY TAB ────────────────────────────────────────────── */}
            {activeTab === 'History' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {isLoadingHistory && <Skeleton height={220} lines={2} />}

                {!isLoadingHistory && history && (
                  <>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <StatCard label="Total Submissions" value={history.totalSubmissions} color="#3b82f6" />
                    </div>

                    <div className="glass" style={{ borderRadius: 12, padding: '16px' }}>
                      <ErrorBreakdownChart data={history.errorBreakdown} />
                    </div>

                    <div className="glass" style={{ borderRadius: 12, padding: '16px' }}>
                      <ComplexityDistChart data={history.complexityDist} />
                    </div>

                    {/* Recent submissions */}
                    {history.recentSubmissions?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: 8 }}>Recent Submissions</div>
                        {history.recentSubmissions.map((s, i) => (
                          <div key={i} className="glass" style={{ borderRadius: 8, padding: '8px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem' }}>
                            <span style={{ color: s.passed ? 'var(--color-brand-success)' : s.passed === false ? 'var(--color-brand-danger)' : 'var(--color-text-muted)' }}>
                              {s.passed ? '✓' : s.passed === false ? '✗' : '—'}
                            </span>
                            <span className="badge" style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--color-brand-primary)', fontFamily: 'var(--font-mono)' }}>
                              {s.language}
                            </span>
                            <span style={{ color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                              {new Date(s.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      id="btn-refresh-history"
                      onClick={loadHistory}
                      style={{ background: 'var(--color-surface-card)', border: '1px solid var(--color-surface-border)', color: 'var(--color-text-muted)', borderRadius: 8, padding: '7px 16px', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      ↻ Refresh
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Toast message={toast?.message} type={toast?.type} />
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="glass" style={{ borderRadius: 10, padding: '12px 18px', minWidth: 120 }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  );
}
