import { cn } from '@/lib/utils';

/**
 * CircularProgress — half-circle (semicircle) gauge
 * Props:
 *   value       0–100
 *   size        px diameter (default 120)
 *   strokeWidth px (default 10)
 *   label       center label (default shows value%)
 *   sublabel    small text below label
 *   className
 */
export function CircularProgress({
  value = 0,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
  className,
}) {
  const r       = (size - strokeWidth) / 2;
  const cx      = size / 2;
  const cy      = size / 2;          // centre of full circle
  const half    = Math.PI * r;       // half-circumference = arc length of semicircle

  // SVG viewBox is a full circle but we only show the bottom half
  // We rotate -180deg so the arc goes left→right
  const pct     = Math.min(100, Math.max(0, value));
  const filled  = (pct / 100) * half;
  const empty   = half - filled;

  // Color stops matching existing palette
  const color =
    pct === 100 ? '#22c55e' :   // success green
    pct > 60    ? '#3b82f6' :   // primary blue
    pct > 30    ? '#f59e0b' :   // amber
                  '#94a3b8';    // muted

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div style={{ position: 'relative', width: size, height: size / 2 + strokeWidth, overflow: 'hidden' }}>
        <svg
          width={size}
          height={size}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {/* Track — grey semicircle */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={`${half} ${half}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            className="text-muted/40"
            style={{ transform: `rotate(180deg)`, transformOrigin: `${cx}px ${cy}px` }}
          />
          {/* Fill — coloured arc */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${filled} ${empty + half}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            style={{
              transform: `rotate(180deg)`,
              transformOrigin: `${cx}px ${cy}px`,
              transition: 'stroke-dasharray 0.6s cubic-bezier(.4,0,.2,1), stroke 0.4s',
            }}
          />
        </svg>

        {/* Center label — sits at bottom of the arc */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0, right: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingBottom: 2,
        }}>
          <span style={{ color, fontSize: size * 0.18, fontWeight: 700, lineHeight: 1, transition: 'color 0.4s' }}>
            {label ?? `${pct}%`}
          </span>
          {sublabel && (
            <span className="text-muted-foreground" style={{ fontSize: size * 0.1, marginTop: 1 }}>
              {sublabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}