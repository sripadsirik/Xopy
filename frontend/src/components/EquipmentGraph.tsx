import type { Equipment } from "../types";
import RiskChart from "./RiskChart";

export default function EquipmentGraph({ equipment }: { equipment: Equipment }) {
  return (
    <div className="h-full w-full flex flex-col min-h-[520px]">
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-[0.18em]">
            Selected Equipment
          </p>
          <p className="text-[15px] font-bold text-text-primary mt-1">
            {equipment?.name ?? "—"}
          </p>
          <p className="text-[11px] text-text-muted mt-1">
            Big graph view (pinned)
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] text-text-muted uppercase tracking-[0.18em]">
            Risk Level
          </p>
          <p className="text-[13px] font-semibold text-text-primary mt-1">
            {equipment?.riskLevel ?? "—"}
          </p>
        </div>
      </div>

      <div className="theater-divider mx-4" />

      <div className="flex-1 min-h-0 p-3">
        <div className="h-full w-full cinema-panel rounded-2xl overflow-hidden">
          <div className="h-full w-full">
            <RiskChart equipment={equipment} />
          </div>
        </div>
      </div>
    </div>
  );
}
