import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Equipment, AlertEvent, SimulationControls, SensorReading, PurchaseDecision } from '../types';
import { createInitialEquipment } from '../data/equipment';
import { calculateRisk, getRiskLevel } from '../engine/riskEngine';
import toast from 'react-hot-toast';

const DEFAULT_WS_URL = 'ws://127.0.0.1:8000/ws/live';

// UI tuning knobs
const UI_UPDATE_MS = 250;     // max 4 updates/sec
const SENSOR_HISTORY = 30;    // keep last N sensor points for charts

type BackendEvent = {
  machine_id: string;
  ts: string;
  telemetry: {
    type: 'L' | 'M' | 'H';
    air_temp_k: number;
    process_temp_k: number;
    rpm: number;
    torque_nm: number;
    tool_wear_min: number;
  };
  prediction: {
    failure_prob: number; // 0..1
    failure_type: string; // TWF/HDF/PWF/OSF/RNF
    failure_type_probs: Record<string, number>;
    confidence: number;
  };
  decision: {
    action: 'BUY_NOW' | 'BUY_SUBSTITUTE' | 'MONITOR';
    reason: string;
    recommended_categories: string[];
    substitutes: Array<{
      name: string;
      category: string;
      availability: string;
      lead_time_days: number;
      risk_reduction: number;
    }>;
  };
};

const FAILURE_LABEL: Record<string, string> = {
  TWF: 'tool wear failure',
  HDF: 'heat dissipation failure',
  PWF: 'power failure',
  OSF: 'overload failure',
  RNF: 'random failure',
};

function mapMachineClassToEquipmentType(cls: 'L' | 'M' | 'H'): Equipment['type'] {
  if (cls === 'H') return 'conveyor';
  if (cls === 'M') return 'pump';
  return 'motor';
}

function telemetryToSensor(t: BackendEvent['telemetry']): SensorReading {
  const tempC = t.process_temp_k - 273.15;
  const vibration = Math.max(0.5, Math.min(12, t.torque_nm / 10));
  const pressure = Math.max(60, Math.min(140, t.rpm / 20));

  return {
    timestamp: Date.now(),
    temperature: Math.max(40, Math.min(120, tempC)),
    vibration,
    pressure,
  };
}

function toPurchaseDecision(ev: BackendEvent): PurchaseDecision {
  return {
    action: ev.decision.action,
    reason: ev.decision.reason,
    recommendedCategories: ev.decision.recommended_categories ?? [],
    substitutes: ev.decision.substitutes ?? [],
  };
}

export function useLiveFeed(wsUrl: string = DEFAULT_WS_URL) {
  const [equipment, setEquipment] = useState<Equipment[]>(() => createInitialEquipment());
  const [selectedId, setSelectedId] = useState<string>('M-01');
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  const [controls, setControls] = useState<SimulationControls>({
    runtimeHours: 0,
    heat: 0,
    dust: 0,
    moisture: 0,
    pastFailures: 0,
  });

  // --- performance refs ---
  const prevRiskLevels = useRef<Record<string, string>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const latestEventRef = useRef<BackendEvent | null>(null);
  const idToIndexRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const levels: Record<string, string> = {};
    const idxMap: Record<string, number> = {};
    equipment.forEach((eq, i) => {
      levels[eq.id] = eq.riskLevel;
      idxMap[eq.id] = i;
    });
    prevRiskLevels.current = levels;
    idToIndexRef.current = idxMap;
  }, [equipment]);

  const applyBackendEvent = useCallback((ev: BackendEvent) => {
    const id = ev.machine_id;

    const riskPercent = Math.round(ev.prediction.failure_prob * 1000) / 10;
    const riskLevel = getRiskLevel(riskPercent);

    const newSensor = telemetryToSensor(ev.telemetry);
    const decision = toPurchaseDecision(ev);
    const failureMode = FAILURE_LABEL[ev.prediction.failure_type] ?? ev.prediction.failure_type;

    setEquipment((prev) => {
      const idx = idToIndexRef.current[id];

      if (idx === undefined) {
        const base = createInitialEquipment()[0];
        const newEq: Equipment = {
          ...base,
          id,
          name: `Equipment ${id}`,
          type: mapMachineClassToEquipmentType(ev.telemetry.type),
          sensorData: [...base.sensorData.slice(-(SENSOR_HISTORY - 1)), newSensor],
          riskPercent,
          riskLevel,
          failureMode,
          decision,
        };

        idToIndexRef.current = { ...idToIndexRef.current, [id]: 0 };
        prevRiskLevels.current = { ...prevRiskLevels.current, [id]: riskLevel };

        return [newEq, ...prev];
      }

      const next = prev.slice();
      const eq = next[idx];

      const sensorData = [...eq.sensorData.slice(-(SENSOR_HISTORY - 1)), newSensor];

      next[idx] = {
        ...eq,
        sensorData,
        riskPercent,
        riskLevel,
        failureMode,
        decision,
      };

      // --- alerts ---
      const prevLevel = prevRiskLevels.current[id];
      const isBuyNow = ev.decision.action === 'BUY_NOW';

      if (prevLevel && prevLevel !== 'critical' && (riskLevel === 'critical' || isBuyNow)) {
        const eqName = eq.name ?? `Equipment ${id}`;
        const msg = isBuyNow
          ? `${eqName} — ${Math.round(ev.prediction.failure_prob * 100)}% failure risk. Order parts now.`
          : `${eqName} entered critical risk at ${riskPercent}%. Immediate attention needed.`;

        const alert: AlertEvent = {
          id: `alert-${Date.now()}-${id}`,
          timestamp: Date.now(),
          equipmentId: id,
          equipmentName: eqName,
          message: msg,
          severity: isBuyNow || riskLevel === 'critical' ? 'critical' : 'warning',
        };

        setAlerts((a) => [alert, ...a].slice(0, 50));

        if (isBuyNow) toast.error(msg, { duration: 5000 });
        else toast(msg, { duration: 3500, icon: '\u26A0\uFE0F' });
      }

      prevRiskLevels.current[id] = riskLevel;
      return next;
    });
  }, []);

  // Throttle: apply at most 1 event per UI_UPDATE_MS
  useEffect(() => {
    if (isPaused) return;

    const interval = window.setInterval(() => {
      const ev = latestEventRef.current;
      if (ev) {
        latestEventRef.current = null;
        applyBackendEvent(ev);
      }
    }, UI_UPDATE_MS);

    return () => window.clearInterval(interval);
  }, [isPaused, applyBackendEvent]);

  // WebSocket connection
  useEffect(() => {
    if (isPaused) {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => console.log('WS connected:', wsUrl);
    ws.onclose = () => console.log('WS closed');
    ws.onerror = (e) => console.log('WS error:', e);

    ws.onmessage = (msg) => {
      try {
        latestEventRef.current = JSON.parse(msg.data) as BackendEvent;
      } catch (e) {
        console.log('Bad WS message', e);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [wsUrl, isPaused]);

  const applyControls = useCallback((newControls: SimulationControls) => {
    setControls(newControls);
  }, []);

  // Apply what-if control offsets to recalculate risk
  const adjustedEquipment = useMemo(() => {
    const hasOffset =
      controls.runtimeHours !== 0 ||
      controls.heat !== 0 ||
      controls.dust !== 0 ||
      controls.moisture !== 0 ||
      controls.pastFailures !== 0;

    if (!hasOffset) return equipment;

    return equipment.map((eq) => {
      const adjRuntime = Math.max(0, eq.runtimeHours + controls.runtimeHours);
      const adjHeat = Math.max(0, eq.environmentSeverity.heat + controls.heat);
      const adjDust = Math.max(0, eq.environmentSeverity.dust + controls.dust);
      const adjMoisture = Math.max(0, eq.environmentSeverity.moisture + controls.moisture);
      const adjFailures = Math.max(0, eq.pastFailures + controls.pastFailures);

      const riskPercent = Math.round(calculateRisk(eq.type, adjRuntime, adjHeat, adjDust, adjMoisture, adjFailures) * 10) / 10;
      const riskLevel = getRiskLevel(riskPercent);

      return { ...eq, riskPercent, riskLevel };
    });
  }, [equipment, controls]);

  const selectedEquipment = adjustedEquipment.find((eq) => eq.id === selectedId) || adjustedEquipment[0];

  return {
    equipment: adjustedEquipment,
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
