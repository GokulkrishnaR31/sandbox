export default function QualityFeedbackCard({ quality }) {
  if (!quality) return null;

  return (
    <div id="quality-feedback-card" className="animate-slide-up glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
      {/* Positive note */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-surface-border)', background: 'rgba(34,197,94,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: '1.1rem', marginTop: 1 }}>✨</span>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-brand-success)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              What you did well
            </div>
            <p style={{ color: 'var(--color-text-primary)', fontSize: '0.88rem', lineHeight: 1.6 }}>
              {quality.positive_note}
            </p>
          </div>
        </div>
      </div>

      {/* Suggestions */}
      {quality.suggestions?.length > 0 && (
        <div style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Areas to improve
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quality.suggestions.slice(0, 3).map((s, i) => (
              <div
                key={i}
                className="animate-slide-up"
                style={{
                  background: 'var(--color-surface-base)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  borderLeft: '3px solid var(--color-brand-warning)',
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <div style={{ color: 'var(--color-brand-warning)', fontWeight: 600, fontSize: '0.83rem', marginBottom: 3 }}>
                  {i + 1}. {s.issue}
                </div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                  {s.why_it_matters}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
