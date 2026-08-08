const CATEGORY_STYLES = {
  Runtime: { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', icon: '💥' },
  Syntax:  { bg: 'rgba(249,115,22,0.15)',  color: '#f97316', icon: '📝' },
  Logic:   { bg: 'rgba(168,85,247,0.15)',  color: '#a855f7', icon: '🔍' },
  Timeout: { bg: 'rgba(234,179,8,0.15)',   color: '#eab308', icon: '⏱️' },
  Memory:  { bg: 'rgba(59,130,246,0.15)',  color: '#3b82f6', icon: '📦' },
};

export default function ErrorPanel({ analysis, rawError }) {
  if (!analysis && !rawError) return null;

  const style = CATEGORY_STYLES[analysis?.category] ?? CATEGORY_STYLES.Runtime;

  return (
    <div id="error-panel" className="animate-slide-up glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
      {/* Category header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: style.bg, borderBottom: '1px solid var(--color-surface-border)' }}>
        <span style={{ fontSize: '1.2rem' }}>{style.icon}</span>
        <div>
          <span className="badge" style={{ background: style.bg, color: style.color, border: `1px solid ${style.color}40` }}>
            {analysis?.category ?? 'Error'}
          </span>
          <span style={{ marginLeft: 8, color: 'var(--color-text-secondary)', fontSize: '0.78rem' }}>
            detected in your code
          </span>
        </div>
      </div>

      {/* Plain explanation */}
      {analysis?.plain_explanation && (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-surface-border)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            What went wrong
          </div>
          <p style={{ color: 'var(--color-text-primary)', fontSize: '0.88rem', lineHeight: 1.6 }}>
            {analysis.plain_explanation}
          </p>
        </div>
      )}

      {/* Concept hint */}
      {analysis?.concept_hint && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-surface-border)', background: 'rgba(59,130,246,0.05)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            💡 Concept hint
          </div>
          <p style={{ color: 'var(--color-brand-primary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
            {analysis.concept_hint}
          </p>
        </div>
      )}

      {/* Raw error collapsible */}
      {rawError && (
        <details style={{ padding: '10px 16px' }}>
          <summary style={{ cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.78rem', userSelect: 'none' }}>
            Raw error output ↓
          </summary>
          <pre style={{
            marginTop: 8,
            background: 'var(--color-surface-base)',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: '0.75rem',
            color: '#ef4444',
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowX: 'auto',
          }}>
            {rawError}
          </pre>
        </details>
      )}
    </div>
  );
}
