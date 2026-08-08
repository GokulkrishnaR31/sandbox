export default function DiffView({ testCase, index, onClose }) {
  const expectedLines = (testCase.expected ?? '').split('\n');
  const actualLines   = (testCase.actual   ?? '').split('\n');
  const maxLen        = Math.max(expectedLines.length, actualLines.length);

  return (
    <div className="animate-slide-up glass" style={{ borderRadius: 10, overflow: 'hidden', marginTop: 4 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--color-surface-border)', background: 'rgba(239,68,68,0.08)' }}>
        <span style={{ color: 'var(--color-brand-danger)', fontWeight: 600, fontSize: '0.82rem' }}>
          ✗ Test {index + 1} — Output Mismatch
        </span>
        <button
          id={`diff-close-${index}`}
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      {/* Input section */}
      {testCase.input && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--color-surface-border)', background: 'rgba(0,0,0,0.2)' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Input</span>
          <pre style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>
            {testCase.input}
          </pre>
        </div>
      )}

      {/* Side-by-side diff */}
      <div className="grid grid-cols-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
        {/* Expected */}
        <div style={{ borderRight: '1px solid var(--color-surface-border)' }}>
          <div style={{ padding: '6px 14px', background: 'rgba(34,197,94,0.08)', fontSize: '0.7rem', color: 'var(--color-brand-success)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Expected
          </div>
          <div style={{ padding: '8px 14px', minHeight: 60 }}>
            {Array.from({ length: maxLen }, (_, i) => (
              <div
                key={i}
                style={{
                  padding: '1px 0',
                  color: expectedLines[i] !== actualLines[i]
                    ? 'var(--color-brand-success)'
                    : 'var(--color-text-secondary)',
                  background: expectedLines[i] !== actualLines[i]
                    ? 'rgba(34,197,94,0.1)'
                    : 'transparent',
                }}
              >
                <span style={{ color: 'var(--color-text-muted)', marginRight: 8, userSelect: 'none' }}>{i + 1}</span>
                {expectedLines[i] ?? ''}
              </div>
            ))}
          </div>
        </div>

        {/* Actual */}
        <div>
          <div style={{ padding: '6px 14px', background: 'rgba(239,68,68,0.08)', fontSize: '0.7rem', color: 'var(--color-brand-danger)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Your Output
          </div>
          <div style={{ padding: '8px 14px', minHeight: 60 }}>
            {Array.from({ length: maxLen }, (_, i) => (
              <div
                key={i}
                style={{
                  padding: '1px 0',
                  color: actualLines[i] !== expectedLines[i]
                    ? 'var(--color-brand-danger)'
                    : 'var(--color-text-secondary)',
                  background: actualLines[i] !== expectedLines[i]
                    ? 'rgba(239,68,68,0.1)'
                    : 'transparent',
                }}
              >
                <span style={{ color: 'var(--color-text-muted)', marginRight: 8, userSelect: 'none' }}>{i + 1}</span>
                {actualLines[i] ?? <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>(empty)</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
