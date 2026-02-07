import { useState, useEffect, useCallback, useRef } from 'react';
import type { Equipment, AlertEvent, SimulationControls, SensorReading } from '../types';
import { createInitialEquipment } from '../data/equipment';
import { calculateRisk, getRiskLevel } from '../engine/riskEngine';
import toast from 'react-hot-toast';

const TICK_INTERVAL = 2000;

export function useSimulation() {
  const [equipment, setEquipment] = useState<Equipment[]>(() => createInitialEquipment());
  const [selectedId, setSelectedId] = useState<string>('EQ-001');
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [controls, setControls] = useState<SimulationControls>({
    runtimeHours: 0,
    heat: 0,
    dust: 0,
    moisture: 0,
    pastFailures: 0,
  });
  const prevRiskLevels = useRef<Record<string, string>>({});

  useEffect(() => {
    const levels: Record<string, string> = {};
    equipment.forEach((eq) => { levels[eq.id] = eq.riskLevel; });
    prevRiskLevels.current = levels;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tick = useCallback(() => {
    setEquipment((prev) => {
      const updated = prev.map((eq) => {
        const tempDelta = (Math.random() - 0.48) * 2.5;
        const vibDelta = (Math.random() - 0.48) * 0.4;
        const presDelta = (Math.random() - 0.48) * 1.5;

        const lastSensor = eq.sensorData[eq.sensorData.length - 1];
        const newSensor: SensorReading = {
          timestamp: Date.now(),
          temperature: Math.max(40, Math.min(120, lastSensor.temperature + tempDelta)),
          vibration: Math.max(0.5, Math.min(12, lastSensor.vibration + vibDelta)),
          pressure: Math.max(60, Math.min(140, lastSensor.pressure + presDelta)),
        };

        const sensorData = [...eq.sensorData.slice(-49), newSensor];

        const runtimeNoise = (Math.random() - 0.45) * 200;
        const envNoise = {
          heat: Math.max(0, Math.min(100, eq.environmentSeverity.heat + (Math.random() - 0.48) * 3)),
          dust: Math.max(0, Math.min(100, eq.environmentSeverity.dust + (Math.random() - 0.48) * 2)),
          moisture: Math.max(0, Math.min(100, eq.environmentSeverity.moisture + (Math.random() - 0.48) * 2)),
        };

        const effectiveRuntime = eq.runtimeHours + runtimeNoise;
        const risk = calculateRisk(eq.type, effectiveRuntime, envNoise.heat, envNoise.dust, envNoise.moisture, eq.pastFailures);
        const riskLevel = getRiskLevel(risk);

        return {
          ...eq,
          sensorData,
          riskPercent: Math.round(risk * 10) / 10,
          riskLevel,
          environmentSeverity: envNoise,
        };
      });

      updated.forEach((eq) => {
        const prevLevel = prevRiskLevels.current[eq.id];
        if (prevLevel && prevLevel !== 'critical' && prevLevel !== 'high' && (eq.riskLevel === 'critical' || eq.riskLevel === 'high')) {
          const alert: AlertEvent = {
            id: `alert-${Date.now()}-${eq.id}`,
            timestamp: Date.now(),
            equipmentId: eq.id,
            equipmentName: eq.name,
            message: eq.riskLevel === 'critical'
              ? `CRITICAL: ${eq.name} risk surged to ${eq.riskPercent}%`
              : `WARNING: ${eq.name} entered high-risk zone at ${eq.riskPercent}%`,
            severity: eq.riskLevel === 'critical' ? 'critical' : 'warning',
          };
          setAlerts((prev) => [alert, ...prev].slice(0, 50));

          if (eq.riskLevel === 'critical') {
            toast.error(`🚨 ${eq.name} — CRITICAL RISK ${eq.riskPercent}%`, { duration: 5000 });
          } else {
            toast(`⚠️ ${eq.name} — HIGH RISK ${eq.riskPercent}%`, { duration: 4000, icon: '⚠️' });
          }
        }

        if (Math.random() < 0.02 && eq.riskPercent > 40) {
          const spikeAlert: AlertEvent = {
            id: `spike-${Date.now()}-${eq.id}`,
            timestamp: Date.now(),
            equipmentId: eq.id,
            equipmentName: eq.name,
            message: `Sensor anomaly detected on ${eq.name} — vibration spike`,
            severity: 'warning',
          };
          setAlerts((prev) => [spikeAlert, ...prev].slice(0, 50));
          toast(`📡 Sensor spike on ${eq.name}`, { duration: 3000 });
        }
      });

      const newLevels: Record<string, string> = {};
      updated.forEach((eq) => { newLevels[eq.id] = eq.riskLevel; });
      prevRiskLevels.current = newLevels;

      return updated;
    });
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(tick, TICK_INTERVAL);
    return () => clearInterval(interval);
  }, [isPaused, tick]);

  const applyControls = useCallback((newControls: SimulationControls) => {
    setControls(newControls);
    setEquipment((prev) =>
      prev.map((eq) => {
        if (eq.id !== selectedId) return eq;
        const runtime = eq.runtimeHours + newControls.runtimeHours;
        const heat = Math.max(0, Math.min(100, eq.environmentSeverity.heat + newControls.heat));
        const dust = Math.max(0, Math.min(100, eq.environmentSeverity.dust + newControls.dust));
        const moisture = Math.max(0, Math.min(100, eq.environmentSeverity.moisture + newControls.moisture));
        const failures = eq.pastFailures + newControls.pastFailures;
        const risk = calculateRisk(eq.type, runtime, heat, dust, moisture, failures);
        return {
          ...eq,
          riskPercent: Math.round(risk * 10) / 10,
          riskLevel: getRiskLevel(risk),
          runtimeHours: runtime,
          environmentSeverity: { heat, dust, moisture },
          pastFailures: failures,
        };
      })
    );
  }, [selectedId]);

  const selectedEquipment = equipment.find((eq) => eq.id === selectedId) || equipment[0];

  return {
    equipment,
    selectedEquipment,
    selectedId,
    setSelectedId,
    alerts,
    isPaused,
    setIsPaused,
    controls,
    applyControls,
  };
}
