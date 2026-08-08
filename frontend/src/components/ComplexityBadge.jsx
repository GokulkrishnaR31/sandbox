import { useState } from 'react';

const COMPLEXITY_COLORS = {
  'O(1)':      '#22c55e',
  'O(log n)':  '#3b82f6',
  'O(n)':      '#60a5fa',
  'O(n log n)':'#f97316',
  'O(n²)':     '#ef4444',
  'O(n^2)':    '#ef4444',
  'O(n³)':     '#dc2626',
  'O(2^n)':    '#7f1d1d',
};

function getColor(complexity) {
  return COMPLEXITY_COLORS[complexity] ?? '#94a3b8';
}

export default function ComplexityBadge({ complexity, explanation, align = 'left' }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const color = getColor(complexity);

  const tooltipPositionStyle = align === 'right'
    ? { right: 0 }
    : { left: 0 };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        id="complexity-badge"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px',
          borderRadius: 999,
          background: `${color}22`,
          border: `1px solid ${color}55`,
          cursor: explanation ? 'help' : 'default',
          transition: 'border-color 0.2s',
        }}
        onMouseOver={e => { e.currentTarget.style.borderColor = color; }}
        onMouseOut={e => { e.currentTarget.style.borderColor = `${color}55`; }}
      >
        <span style={{ fontSize: '1rem' }}>⚡</span>
        <span style={{ color, fontWeight: 700, fontSize: '0.95rem', fontFamily: 'var(--font-mono)' }}>
          {complexity ?? '—'}
        </span>
        {explanation && (
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>hover for details</span>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && explanation && (
        <div
          className="animate-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            ...tooltipPositionStyle,
            width: 320,
            maxWidth: 'calc(100vw - 40px)',
            borderRadius: 10,
            padding: '12px 16px',
            zIndex: 9999,
            pointerEvents: 'none',
            background: 'var(--color-surface-card)',
            border: '1px solid var(--color-surface-border)',
            boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ color, fontWeight: 600, fontSize: '0.85rem', marginBottom: 6 }}>
            {explanation.confirmed_complexity}
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', lineHeight: 1.6 }}>
            {explanation.explanation}
          </p>
          {explanation.contributing_lines?.length > 0 && (
            <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Key lines: {explanation.contributing_lines.join(', ')}
            </div>
          )}
          {explanation.empirical_match !== null && explanation.empirical_match !== undefined && (
            <div style={{ marginTop: 6, fontSize: '0.72rem', color: explanation.empirical_match ? '#22c55e' : '#f97316' }}>
              {explanation.empirical_match ? '✓ Confirmed by benchmark' : '⚠ Empirical benchmark shows variation'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
