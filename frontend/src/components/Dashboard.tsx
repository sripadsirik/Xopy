import { motion } from 'framer-motion';
import { useLiveFeed } from '../hooks/useLiveFeed';
import AnimatedBackground from './AnimatedBackground';
import Header from './Header';
import EquipmentList from './EquipmentList';
import RiskChart from './RiskChart';
import PurchaseEngine from './PurchaseEngine';
import ControlPanel from './ControlPanel';
import AlertLog from './AlertLog';

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

  const criticalCount = equipment.filter((eq) => eq.riskLevel === 'critical').length;
  const attentionCount = equipment.filter((eq) => eq.riskLevel === 'critical' || eq.riskLevel === 'high').length;
  const avgRisk = equipment.length
    ? Math.round(equipment.reduce((sum, eq) => sum + eq.riskPercent, 0) / equipment.length)
    : 0;

  return (
    <div className="h-screen flex relative overflow-hidden ops-shell">
      {/* Warm spotlight background */}
      <AnimatedBackground />

      {/* Film grain texture */}
      <div className="absolute inset-0 film-grain pointer-events-none" style={{ zIndex: 2 }} />

      {/* HUD grid + scanlines */}
      <div className="absolute inset-0 hud-grid pointer-events-none" style={{ zIndex: 1 }} />
      <div className="absolute inset-0 scanlines pointer-events-none" style={{ zIndex: 3 }} />

      {/* Warm ambient radial gradients */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(212,168,83,0.04) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, rgba(123,159,212,0.03) 0%, transparent 70%)' }} />
      </div>

      {/* Content Layer */}
      <div className="relative flex h-full w-full" style={{ zIndex: 10 }}>
        {/* Sidebar */}
        <aside className="ops-sidebar" aria-label="Primary navigation">
          <div className="px-4 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl cinema-panel spotlight-gold">
                <span className="text-accent-gold text-[14px] font-bold">XR</span>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Control Center</p>
                <p className="text-[14px] font-bold text-text-primary">Operations</p>
              </div>
            </div>
          </div>

          <div className="px-4 pb-3">
            <div className="ops-nav">
              {['Overview', 'Live Fleet', 'Alerts', 'Scenario Lab', 'Reports'].map((item) => (
                <button
                  key={item}
                  className={`ops-nav-button ${item === 'Live Fleet' ? 'active' : ''}`}
                >
                  <span className="nav-dot" />
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="px-3 pb-3 flex-1 min-h-0">
            <div className="cinema-panel rounded-2xl overflow-hidden h-full">
              <EquipmentList
                equipment={equipment}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
          </div>
        </aside>

        {/* Main */}
        <section className="flex-1 flex flex-col min-w-0">
          <Header
            isPaused={isPaused}
            onTogglePause={() => setIsPaused((p) => !p)}
            equipmentCount={equipment.length}
            criticalCount={criticalCount}
            attentionCount={attentionCount}
          />

          <main className="flex-1 min-h-0 p-4 grid grid-rows-[auto,1fr] gap-4" role="main">
            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Units monitored', value: equipment.length },
                { label: 'Critical alerts', value: criticalCount },
                { label: 'Needs attention', value: attentionCount },
                { label: 'Avg risk', value: `${avgRisk}%` },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="ops-card rounded-xl px-4 py-3"
                >
                  <p className="text-[10px] text-text-muted uppercase tracking-[0.12em]">{stat.label}</p>
                  <p className="text-[20px] font-bold text-text-primary mt-1">{stat.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Main content */}
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4 min-h-0">
              <div className="flex flex-col gap-4 min-h-0">
                <div className="flex-1 cinema-panel rounded-2xl overflow-hidden min-h-0">
                  <RiskChart equipment={selectedEquipment} />
                </div>
                <ControlPanel controls={controls} onChange={applyControls} />
              </div>

              <div className="flex flex-col gap-4 min-h-0">
                <div className="flex-1 cinema-panel rounded-2xl overflow-hidden min-h-0">
                  <PurchaseEngine equipment={selectedEquipment} />
                </div>
                <AlertLog alerts={alerts} />
              </div>
            </div>
          </main>
        </section>
      </div>
    </div>
  );
}
