import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#a855f7', '#eab308', '#3b82f6'];

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass" style={{ borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem' }}>
      <div style={{ color: payload[0].payload.fill ?? '#fff', fontWeight: 600 }}>{payload[0].name}</div>
      <div style={{ color: 'var(--color-text-secondary)' }}>{payload[0].value} occurrences</div>
    </div>
  );
};

export default function ErrorBreakdownChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <EmptyState message="No error history yet — run some code to build your profile!" />
    );
  }

  return (
    <div id="error-breakdown-chart" className="animate-slide-up">
      <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', fontWeight: 500, marginBottom: 12 }}>
        Error Category Breakdown
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={95}
            dataKey="value"
            animationBegin={0}
            animationDuration={600}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
      <div style={{ fontSize: '2rem', marginBottom: 8 }}>📊</div>
      {message}
    </div>
  );
}
