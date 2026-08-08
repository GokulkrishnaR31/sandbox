import { useState } from 'react';
import DiffView from './DiffView';

export default function TestResultGrid({ results, summary }) {
  const [selected, setSelected] = useState(null);

  if (!results || results.length === 0) return null;

  return (
    <div className="animate-slide-up">
      {/* ── Summary bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>
          Test Results
        </span>
        <span className="badge" style={{ background: 'rgba(34,197,94,0.18)', color: 'var(--color-brand-success)' }}>
          {summary.passed} passed
        </span>
        <span className="badge" style={{ background: 'rgba(239,68,68,0.18)', color: 'var(--color-brand-danger)' }}>
          {summary.failed} failed
        </span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', marginLeft: 'auto' }}>
          {Math.round((summary.passed / summary.total) * 100)}% pass rate
        </span>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {results.map((r, i) => (
          <button
            key={i}
            id={`test-case-${i}`}
            onClick={() => setSelected(selected === i ? null : i)}
            className="test-box"
            title={r.passed ? `Test ${i + 1}: Passed` : `Test ${i + 1}: Failed — click to see diff`}
            style={{
              width: 40, height: 40,
              borderRadius: '8px',
              border: selected === i
                ? '2px solid var(--color-brand-primary)'
                : '2px solid transparent',
              background: r.passed
                ? 'rgba(34,197,94,0.20)'
                : 'rgba(239,68,68,0.20)',
              color: r.passed ? 'var(--color-brand-success)' : 'var(--color-brand-danger)',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {r.passed ? '✓' : '✗'}
          </button>
        ))}
      </div>

      {/* ── DiffView for selected failed test ────────────────────────────── */}
      {selected !== null && !results[selected].passed && (
        <DiffView
          testCase={results[selected]}
          index={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {selected !== null && results[selected].passed && (
        <div className="animate-slide-up glass" style={{ borderRadius: 10, padding: '12px 16px', color: 'var(--color-brand-success)', fontSize: '0.85rem' }}>
          ✓ Test {selected + 1} passed — output matches expected.
        </div>
      )}
    </div>
  );
}
