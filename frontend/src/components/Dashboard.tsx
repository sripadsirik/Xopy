import { useLiveFeed } from "../hooks/useLiveFeed";
import EquipmentList from "./EquipmentList";
import WidgetBoard from "./WidgetBoard";
import TopBarWidgets from "./TopBarWidgets";

export default function Dashboard() {
  const {
    equipment,
    selectedEquipment,
    selectedId,
    setSelectedId,
    alerts,
    isPaused,
    setIsPaused,
    controls,
    applyControls,
  } = useLiveFeed();

  const criticalCount = equipment.filter((eq) => eq.riskLevel === "critical").length;
  const attentionCount = equipment.filter((eq) => eq.riskLevel === "critical" || eq.riskLevel === "high").length;

  // If you already have risk score numbers, swap this to use real data.
  // For now it's a stable placeholder derived from counts (keeps UI consistent).
  const avgRiskPct = equipment.length === 0 ? 0 : Math.min(99, Math.floor((attentionCount / equipment.length) * 100));

  return (
    <div className="h-screen flex relative overflow-hidden ops-shell">
      <div className="absolute inset-0 hud-grid pointer-events-none" style={{ zIndex: 1 }} />
      <div className="absolute inset-0 film-grain pointer-events-none" style={{ zIndex: 2 }} />
      <div className="absolute inset-0 scanlines pointer-events-none" style={{ zIndex: 3 }} />

      <div className="relative flex h-full w-full" style={{ zIndex: 10 }}>
        {/* Sidebar (still non-draggable) */}
        <aside className="ops-sidebar" aria-label="Equipment fleet">
          <div className="px-3 pt-4 pb-3">
            <div className="cinema-panel rounded-2xl overflow-hidden">
              <EquipmentList equipment={equipment} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          </div>
        </aside>

        {/* Main */}
        <section className="flex-1 flex flex-col min-w-0">
          <TopBarWidgets
            equipmentCount={equipment.length}
            attentionCount={attentionCount}
            criticalCount={criticalCount}
            avgRiskPct={avgRiskPct}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused((p) => !p)}
          />

          <main className="flex-1 min-h-0 p-4">
            <WidgetBoard
              selectedEquipment={selectedEquipment}
              alerts={alerts}
              controls={controls}
              applyControls={applyControls}
            />
          </main>
        </section>
      </div>
    </div>
  );
}
