'use client';

interface StepRowProps {
  number: string;
  label: string;
  sublabel?: string;
  status: 'pending' | 'active' | 'complete';
  disabled?: boolean;
}

export default function StepRow({ number, label, sublabel, status, disabled }: StepRowProps) {
  const statusColor = status === 'complete' ? '#C8FF00' : status === 'active' ? '#60a5fa' : 'rgba(255,255,255,0.25)';
  const statusLabel = status === 'pending' ? 'PENDING' : status === 'active' ? 'IN PROGRESS' : 'DONE';

  return (
    <div style={{ opacity: disabled ? 0.4 : 1 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
        borderRadius: 12,
        background: status === 'active' ? 'rgba(200,255,0,0.04)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${status === 'active' ? 'rgba(200,255,0,0.15)' : 'rgba(255,255,255,0.06)'}`,
      }}>
        <span style={{
          fontFamily: '"Fira Code","JetBrains Mono",monospace',
          fontSize: 12,
          color: statusColor,
          minWidth: 24,
          fontWeight: 700,
        }}>
          {number}
        </span>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#fff', flex: 1 }}>
          {label}
        </span>
        <span style={{
          fontFamily: '"Fira Code","JetBrains Mono",monospace',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: statusColor,
        }}>
          {statusLabel}
        </span>
      </div>
      {sublabel && (
        <p style={{
          fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.55,
          padding: '6px 16px 0', margin: 0,
        }}>
          {sublabel}
        </p>
      )}
    </div>
  );
}
