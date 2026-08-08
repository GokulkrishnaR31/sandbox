import Editor from '@monaco-editor/react';

const LANGUAGES = [
  { value: 'python',     label: 'Python 3' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java',       label: 'Java' },
  { value: 'cpp',        label: 'C++' },
  { value: 'c',          label: 'C' },
];

const DEFAULT_CODE = {
  python: `def main():
    # Write your code here
    print("Hello, World!")

if __name__ == "__main__":
    main()
`,
  javascript: `// Write your code here
console.log("Hello, World!");
`,
  java: `public class Main {
    public static void main(String[] args) {
        // Write your code here
        System.out.println("Hello, World!");
    }
}
`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    // Write your code here
    cout << "Hello, World!" << endl;
    return 0;
}
`,
  c: `#include <stdio.h>

int main() {
    // Write your code here
    printf("Hello, World!\\n");
    return 0;
}
`,
};

export default function CodeEditorPanel({
  code, setCode,
  language, setLanguage,
  onLanguageChange,
  onResetCode,
  stdin, setStdin,
  onRun, onRunTests, onAnalyze,
  isRunning, isTestRunning, isAnalyzing,
}) {
  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    if (onLanguageChange) {
      onLanguageChange(lang);
    } else {
      setLanguage(lang);
      setCode(DEFAULT_CODE[lang] || '');
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-surface-raised)', borderRadius: '12px', border: '1px solid var(--color-surface-border)' }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 opacity-80" />
            <span className="w-3 h-3 rounded-full bg-yellow-400 opacity-80" />
            <span className="w-3 h-3 rounded-full bg-green-500 opacity-80" />
          </div>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>code_solution</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Reset button */}
          {onResetCode && (
            <button
              id="btn-reset-code"
              onClick={onResetCode}
              title="Reset code to initial stub"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--color-text-muted)',
                border: '1px solid var(--color-surface-border)',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '0.73rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              ↺ Reset
            </button>
          )}

          {/* Language selector */}
          <select
            id="language-selector"
            value={language}
            onChange={handleLanguageChange}
            style={{
              background: 'var(--color-surface-card)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-surface-border)',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '0.8rem',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {LANGUAGES.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Monaco Editor ───────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 py-2">
        <Editor
          height="100%"
          language={language === 'c' || language === 'cpp' ? 'cpp' : language}
          value={code}
          onChange={val => setCode(val ?? '')}
          theme="vs-dark"
          options={{
            fontSize: 13,
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 8 },
            lineNumbersMinChars: 3,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>

      {/* ── Action Buttons ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 p-3" style={{ borderTop: '1px solid var(--color-surface-border)', background: 'var(--color-surface-raised)' }}>
        <button
          id="btn-run"
          onClick={onRun}
          disabled={isRunning || isTestRunning || isAnalyzing}
          style={{
            flex: 1,
            background: isRunning ? 'var(--color-surface-border)' : 'var(--color-brand-primary)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 0',
            fontWeight: 600,
            fontSize: '0.83rem',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {isRunning ? (
            <><span className="spinner" style={{ width: 14, height: 14 }} /> Running...</>
          ) : (
            <>▶ Run</>
          )}
        </button>

        <button
          id="btn-run-tests"
          onClick={onRunTests}
          disabled={isRunning || isTestRunning || isAnalyzing}
          style={{
            flex: 1,
            background: isTestRunning ? 'var(--color-surface-border)' : 'var(--color-brand-success)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 0',
            fontWeight: 600,
            fontSize: '0.83rem',
            cursor: isTestRunning ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {isTestRunning ? (
            <><span className="spinner" style={{ width: 14, height: 14 }} /> Running Tests...</>
          ) : (
            <>✓ Run Tests</>
          )}
        </button>

        <button
          id="btn-analyze"
          onClick={onAnalyze}
          disabled={isRunning || isTestRunning || isAnalyzing}
          style={{
            flex: 1,
            background: isAnalyzing ? 'var(--color-surface-border)' : 'linear-gradient(135deg, #a855f7, #ec4899)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 0',
            fontWeight: 600,
            fontSize: '0.83rem',
            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {isAnalyzing ? (
            <><span className="spinner" style={{ width: 14, height: 14 }} /> Analyzing...</>
          ) : (
            <>⚡ Analyze</>
          )}
        </button>
      </div>
    </div>
  );
}
