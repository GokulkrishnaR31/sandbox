import { useState } from 'react';

export default function ExecutionTraceViewer({ traceData, language }) {
  const [step, setStep] = useState(0);

  // ── Disabled for non-Python ──────────────────────────────────────────────
  if (language !== 'python') {
    return (
      <div
        id="trace-viewer-disabled"
        title="Step-through tracing currently supports Python only."
        style={{
          borderRadius: 10,
          border: '1px dashed var(--color-surface-border)',
          padding: '20px 24px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: '0.85rem',
          background: 'rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🐍</div>
        <strong>Step-through tracing supports Python only.</strong>
        <br />
        <span style={{ fontSize: '0.78rem' }}>Switch to Python to enable execution tracing.</span>
      </div>
    );
  }

  if (!traceData || traceData.steps?.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🔍</div>
        {traceData?.error ? (
          <div>
            <div style={{ color: 'var(--color-brand-danger)', fontWeight: 600, marginBottom: 6 }}>Trace Error</div>
            <pre style={{ color: '#f97316', fontSize: '0.78rem', whiteSpace: 'pre-wrap', textAlign: 'left', background: 'var(--color-surface-card)', borderRadius: 8, padding: '10px 12px' }}>
              {traceData.error}
            </pre>
          </div>
        ) : (
          <span>Click <strong>Analyze</strong> to generate the execution trace.</span>
        )}
      </div>
    );
  }

  const steps   = traceData.steps;
  const current = steps[step];

  const localEntries = Object.entries(current.locals ?? {});

  return (
    <div id="execution-trace-viewer" className="animate-slide-up">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', fontWeight: 500 }}>
          Execution Trace
          <span className="badge" style={{ marginLeft: 8, background: 'rgba(59,130,246,0.15)', color: 'var(--color-brand-primary)' }}>
            {step + 1} / {steps.length}
          </span>
        </div>
        {traceData.error && (
          <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--color-brand-danger)' }}>
            Error on step {step + 1}
          </span>
        )}
      </div>

      {/* ── Current line indicator ──────────────────────────────────────── */}
      <div className="glass" style={{ borderRadius: 8, padding: '8px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Line</span>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-brand-primary)', fontWeight: 700, fontSize: '0.9rem' }}>
          {current.line}
        </span>
        <span className="badge" style={{
          background: current.event === 'exception'
            ? 'rgba(239,68,68,0.15)'
            : current.event === 'return'
            ? 'rgba(34,197,94,0.15)'
            : 'rgba(59,130,246,0.15)',
          color: current.event === 'exception'
            ? 'var(--color-brand-danger)'
            : current.event === 'return'
            ? 'var(--color-brand-success)'
            : 'var(--color-brand-primary)',
        }}>
          {current.event}
        </span>
        {current.exception && (
          <span style={{ color: 'var(--color-brand-danger)', fontSize: '0.78rem' }}>
            ⚠ {current.exception}
          </span>
        )}
      </div>

      {/* ── Variable state table ────────────────────────────────────────── */}
      <div className="glass" style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ padding: '6px 14px', borderBottom: '1px solid var(--color-surface-border)', fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Variables
        </div>
        {localEntries.length === 0 ? (
          <div style={{ padding: '10px 14px', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
            No local variables yet
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
            <tbody>
              {localEntries.map(([key, val]) => (
                <tr key={key} style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
                  <td style={{ padding: '6px 14px', color: '#60a5fa', fontWeight: 500, width: '35%' }}>{key}</td>
                  <td style={{ padding: '6px 14px', color: 'var(--color-text-secondary)' }}>
                    {typeof val === 'string' ? val : JSON.stringify(val)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Slider ──────────────────────────────────────────────────────── */}
      <div>
        <input
          id="trace-slider"
          type="range"
          min={0}
          max={steps.length - 1}
          value={step}
          onChange={e => setStep(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--color-brand-primary)', cursor: 'pointer' }}
        />
        <div className="flex justify-between" style={{ marginTop: 4, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
          <button
            id="trace-prev"
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            style={{ background: 'none', border: 'none', color: step === 0 ? 'var(--color-surface-border)' : 'var(--color-brand-primary)', cursor: step === 0 ? 'not-allowed' : 'pointer', fontWeight: 600 }}
          >
            ← Prev
          </button>
          <span>Step {step + 1} of {steps.length}</span>
          <button
            id="trace-next"
            onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}
            disabled={step === steps.length - 1}
            style={{ background: 'none', border: 'none', color: step === steps.length - 1 ? 'var(--color-surface-border)' : 'var(--color-brand-primary)', cursor: step === steps.length - 1 ? 'not-allowed' : 'pointer', fontWeight: 600 }}
          >
            Next →
          </button>
        </div>
      </div>

      {/* ── Captured output ─────────────────────────────────────────────── */}
      {traceData.output && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Program Output
          </div>
          <pre className="glass" style={{ borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
            {traceData.output}
          </pre>
        </div>
      )}
    </div>
  );
}
