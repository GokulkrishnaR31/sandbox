import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass" style={{ borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem' }}>
      <div style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{label}</div>
      <div style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>{payload[0].value} solution{payload[0].value !== 1 ? 's' : ''}</div>
    </div>
  );
};

export default function ComplexityDistChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>📈</div>
        No complexity data yet — run the Analyze feature to get started!
      </div>
    );
  }

  return (
    <div id="complexity-dist-chart" className="animate-slide-up">
      <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', fontWeight: 500, marginBottom: 12 }}>
        Complexity Classes Solved
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="var(--color-text-muted)"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          />
          <YAxis
            allowDecimals={false}
            stroke="var(--color-text-muted)"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={600}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={COMPLEXITY_COLORS[entry.name] ?? '#60a5fa'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
