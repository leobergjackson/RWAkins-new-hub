interface ConfidenceMeterProps {
  value: number;
  size?: number;
}

export default function ConfidenceMeter({ value, size = 120 }: ConfidenceMeterProps) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="transform -rotate-90">
      <circle
        cx="50" cy="50" r={radius}
        fill="none"
        stroke="hsl(240, 4%, 16%)"
        strokeWidth="6"
      />
      <circle
        cx="50" cy="50" r={radius}
        fill="none"
        stroke="hsl(18, 100%, 50%)"
        strokeWidth="6"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
      <text
        x="50" y="50"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground font-bold"
        fontSize="18"
        transform="rotate(90, 50, 50)"
      >
        {value}%
      </text>
    </svg>
  );
}
