import { Pause, Play } from "lucide-react";

export default function Header({
  isPaused,
  onTogglePause,
  equipmentCount,
  criticalCount,
  attentionCount,
}: {
  isPaused: boolean;
  onTogglePause: () => void;
  equipmentCount: number;
  criticalCount: number;
  attentionCount: number;
}) {
  return (
    <header className="shrink-0 px-4 pt-3 pb-3">
      <div className="cinema-panel rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
        {/* Left: brand + title */}
        <div className="min-w-0 flex items-center gap-3">
          <div className="p-2 rounded-xl spotlight-gold bg-white/5 border border-white/10">
            <span className="text-accent-gold text-[12px] font-bold tracking-wider">XOPYops</span>
          </div>
          <div className="min-w-0 leading-tight">
            <div className="text-[12px] uppercase tracking-[0.18em] text-text-muted">Operations</div>
            <div className="text-[14px] font-semibold text-text-primary truncate">Live Fleet Monitor</div>
          </div>
        </div>

        {/* Middle: minimal metrics */}
        <div className="hidden md:flex items-center gap-2">
          <Pill label="Units" value={equipmentCount} />
          <Pill label="Critical" value={criticalCount} danger />
          <Pill label="Attention" value={attentionCount} warn />
        </div>

        {/* Right: one control */}
        <button
          onClick={onTogglePause}
          className={`px-3 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-2 ${
            isPaused
              ? "bg-accent-green/10 text-accent-green border-accent-green/25 hover:bg-accent-green/15"
              : "bg-accent-red/10 text-accent-red border-accent-red/25 hover:bg-accent-red/15"
          }`}
        >
          {isPaused ? <Play size={14} /> : <Pause size={14} />}
          {isPaused ? "Resume" : "Pause"}
        </button>
      </div>
    </header>
  );
}

function Pill({
  label,
  value,
  danger,
  warn,
}: {
  label: string;
  value: number;
  danger?: boolean;
  warn?: boolean;
}) {
  const cls = danger
    ? "bg-accent-red/10 text-accent-red border-accent-red/20"
    : warn
    ? "bg-accent-gold/10 text-accent-gold border-accent-gold/20"
    : "bg-white/5 text-text-secondary border-white/10";

  return (
    <div className={`px-3 py-2 rounded-xl border ${cls} flex items-center gap-2`}>
      <span className="text-[10px] uppercase tracking-wider opacity-80">{label}</span>
      <span className="text-[12px] font-bold">{value}</span>
    </div>
  );
}
