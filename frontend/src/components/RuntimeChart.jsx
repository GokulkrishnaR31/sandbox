import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass" style={{ borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem' }}>
      <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>n = {label}</div>
      <div style={{ color: 'var(--color-brand-primary)', fontWeight: 600 }}>
        {payload[0].value} ms
      </div>
    </div>
  );
};

export default function RuntimeChart({ data, staticComplexity }) {
  if (!data || data.length === 0) return null;

  const validData = data.filter(d => d.timeMs !== null);

  return (
    <div id="runtime-chart" className="animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', fontWeight: 500 }}>
          Runtime vs Input Size
        </div>
        {staticComplexity && (
          <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--color-brand-primary)', border: '1px solid rgba(59,130,246,0.3)' }}>
            Static: {staticComplexity}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={validData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="inputSize"
            stroke="var(--color-text-muted)"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            label={{ value: 'Input size (n)', position: 'insideBottom', offset: -2, fill: 'var(--color-text-muted)', fontSize: 11 }}
          />
          <YAxis
            stroke="var(--color-text-muted)"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted)', fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="timeMs"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={{ r: 5, fill: '#3b82f6', strokeWidth: 0 }}
            activeDot={{ r: 7, fill: '#60a5fa' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
