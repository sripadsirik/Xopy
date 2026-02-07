export default function TopBarWidgets({
  equipmentCount,
  attentionCount,
  criticalCount,
  avgRiskPct,
  isPaused,
  onTogglePause,
}: {
  equipmentCount: number;
  attentionCount: number;
  criticalCount: number;
  avgRiskPct: number;
  isPaused: boolean;
  onTogglePause: () => void;
}) {
  return (
    <header className="px-4 pt-4 pb-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-xl cinema-panel spotlight-gold">
          <span className="text-accent-gold text-[13px] font-bold">XO</span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-text-muted uppercase tracking-[0.18em]">
            Operations Theater
          </p>
          <p className="text-[14px] font-bold truncate">
            <span className="text-accent-gold">XOPY</span>
            <span className="text-text-primary">ops</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <MiniStat label="Units" value={equipmentCount} />
        <MiniStat label="Needs Attention" value={attentionCount} />
        <MiniStat label="Critical" value={criticalCount} />
        <MiniStat label="Avg Risk" value={`${avgRiskPct}%`} />

        <button
          onClick={onTogglePause}
          className={`cinema-panel rounded-xl px-3 py-2 text-[11px] font-semibold ${
            isPaused ? "text-accent-red" : "text-text-primary"
          }`}
        >
          {isPaused ? "Paused" : "Live"}
        </button>
      </div>
    </header>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="cinema-panel rounded-xl px-3 py-2 min-w-[96px]">
      <p className="text-[9px] text-text-muted uppercase tracking-[0.18em]">
        {label}
      </p>
      <p className="text-[13px] font-bold text-text-primary mt-0.5">{value}</p>
    </div>
  );
}
