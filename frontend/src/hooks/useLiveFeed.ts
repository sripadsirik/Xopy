// import { useState, useEffect, useCallback, useRef } from 'react';
// import type { Equipment, AlertEvent, SimulationControls, SensorReading } from '../types';
// import { createInitialEquipment } from '../data/equipment';
// import { getRiskLevel } from '../engine/riskEngine';
// import toast from 'react-hot-toast';

// const DEFAULT_WS_URL = 'ws://127.0.0.1:8000/ws/live';

// type BackendEvent = {
//   machine_id: string;
//   ts: string;
//   telemetry: {
//     type: 'L' | 'M' | 'H';
//     air_temp_k: number;
//     process_temp_k: number;
//     rpm: number;
//     torque_nm: number;
//     tool_wear_min: number;
//   };
//   prediction: {
//     failure_prob: number; // 0..1
//     failure_type: string; // TWF/HDF/PWF/OSF/RNF
//     failure_type_probs: Record<string, number>;
//     confidence: number;
//   };
//   decision: {
//     action: 'BUY_NOW' | 'BUY_SUBSTITUTE' | 'MONITOR';
//     reason: string;
//     recommended_categories: string[];
//     substitutes: any[];
//   };
// };

// const FAILURE_LABEL: Record<string, string> = {
//   TWF: 'tool wear failure',
//   HDF: 'heat dissipation failure',
//   PWF: 'power failure',
//   OSF: 'overload failure',
//   RNF: 'random failure',
// };

// function mapMachineClassToEquipmentType(cls: 'L' | 'M' | 'H'): Equipment['type'] {
//   // you can tweak these; it’s just for UI categories
//   if (cls === 'H') return 'conveyor';
//   if (cls === 'M') return 'pump';
//   return 'motor';
// }

// function telemetryToSensor(t: BackendEvent['telemetry']): SensorReading {
//   // Convert process temp K → approx C for your chart
//   const tempC = t.process_temp_k - 273.15;

//   // Approx mappings (purely for dashboard visuals)
//   const vibration = Math.max(0.5, Math.min(12, t.torque_nm / 10));
//   const pressure = Math.max(60, Math.min(140, t.rpm / 20));

//   return {
//     timestamp: Date.now(),
//     temperature: Math.max(40, Math.min(120, tempC)),
//     vibration,
//     pressure,
//   };
// }

// export function useLiveFeed(wsUrl: string = DEFAULT_WS_URL) {
//   const [equipment, setEquipment] = useState<Equipment[]>(() => createInitialEquipment());
//   const [selectedId, setSelectedId] = useState<string>('M-01'); // align to backend IDs
//   const [alerts, setAlerts] = useState<AlertEvent[]>([]);
//   const [isPaused, setIsPaused] = useState(false);

//   // Keep this for UI compatibility (ControlPanel can stay)
//   const [controls, setControls] = useState<SimulationControls>({
//     runtimeHours: 0,
//     heat: 0,
//     dust: 0,
//     moisture: 0,
//     pastFailures: 0,
//   });

//   const prevRiskLevels = useRef<Record<string, string>>({});
//   const wsRef = useRef<WebSocket | null>(null);

//   // initialize prev levels once
//   useEffect(() => {
//     const levels: Record<string, string> = {};
//     equipment.forEach((eq) => { levels[eq.id] = eq.riskLevel; });
//     prevRiskLevels.current = levels;
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   const handleEvent = useCallback((ev: BackendEvent) => {
//     const id = ev.machine_id;
//     const risk = Math.round(ev.prediction.failure_prob * 1000) / 10; // percent w/ 1 decimal
//     const riskLevel = getRiskLevel(risk);

//     setEquipment((prev) => {
//       let found = false;

//       const updated = prev.map((eq) => {
//         if (eq.id !== id) return eq;
//         found = true;

//         const newSensor = telemetryToSensor(ev.telemetry);
//         const sensorData = [...eq.sensorData.slice(-49), newSensor];

//         return {
//           ...eq,
//           sensorData,
//           riskPercent: risk,
//           riskLevel,
//           failureMode: FAILURE_LABEL[ev.prediction.failure_type] ?? ev.prediction.failure_type,
//         };
//       });

//       // If backend emits IDs not in your seed list, add them on the fly
//       if (!found) {
//         const base = createInitialEquipment()[0];
//         const newSensor = telemetryToSensor(ev.telemetry);

//         updated.unshift({
//           ...base,
//           id,
//           name: `Equipment ${id}`,
//           type: mapMachineClassToEquipmentType(ev.telemetry.type),
//           sensorData: [...base.sensorData.slice(-49), newSensor],
//           riskPercent: risk,
//           riskLevel,
//           failureMode: FAILURE_LABEL[ev.prediction.failure_type] ?? ev.prediction.failure_type,
//         });
//       }

//       // Alerts (use backend action for better “judge” moments)
//       const prevLevel = prevRiskLevels.current[id];
//       const isBuyNow = ev.decision.action === 'BUY_NOW';

//       if (
//         prevLevel &&
//         prevLevel !== 'critical' &&
//         (riskLevel === 'critical' || isBuyNow)
//       ) {
//         const eqName = found ? (updated.find((x) => x.id === id)?.name ?? id) : `Equipment ${id}`;
//         const msg = isBuyNow
//           ? `🚨 BUY NOW: ${eqName} — ${Math.round(ev.prediction.failure_prob * 100)}% risk (${ev.prediction.failure_type})`
//           : `WARNING: ${eqName} entered ${riskLevel} risk at ${risk}%`;

//         const alert: AlertEvent = {
//           id: `alert-${Date.now()}-${id}`,
//           timestamp: Date.now(),
//           equipmentId: id,
//           equipmentName: eqName,
//           message: msg,
//           severity: isBuyNow || riskLevel === 'critical' ? 'critical' : 'warning',
//         };

//         setAlerts((a) => [alert, ...a].slice(0, 50));

//         if (isBuyNow) {
//           toast.error(msg, { duration: 5000 });
//         } else {
//           toast(msg, { duration: 4000, icon: '⚠️' });
//         }
//       }

//       prevRiskLevels.current[id] = riskLevel;
//       return updated;
//     });
//   }, []);

//   useEffect(() => {
//     if (isPaused) {
//       wsRef.current?.close();
//       wsRef.current = null;
//       return;
//     }

//     const ws = new WebSocket(wsUrl);
//     wsRef.current = ws;

//     ws.onopen = () => console.log(' WS connected:', wsUrl);
//     ws.onclose = () => console.log('WS closed');
//     ws.onerror = (e) => console.log('WS error:', e);

//     ws.onmessage = (msg) => {
//       try {
//         const data = JSON.parse(msg.data) as BackendEvent;
//         handleEvent(data);
//       } catch (e) {
//         console.log('Bad WS message', e);
//       }
//     };

//     return () => {
//       ws.close();
//       wsRef.current = null;
//     };
//   }, [wsUrl, isPaused, handleEvent]);

//   // Keep ControlPanel working (for now it just updates local state)
//   const applyControls = useCallback((newControls: SimulationControls) => {
//     setControls(newControls);
//     // Later we can call backend demo endpoints (oversample/interval/pause)
//   }, []);

//   const selectedEquipment = equipment.find((eq) => eq.id === selectedId) || equipment[0];

//   return {
//     equipment,
//     selectedEquipment,
//     selectedId,
//     setSelectedId,
//     alerts,
//     isPaused,
//     setIsPaused,
//     controls,
//     applyControls,
//   };
// }

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Equipment, AlertEvent, SimulationControls, SensorReading, PurchaseDecision } from '../types';
import { createInitialEquipment } from '../data/equipment';
import { getRiskLevel } from '../engine/riskEngine';
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

  // Keep controls for UI compatibility (ControlPanel still works visually)
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

  // Buffer incoming events; apply on a timer to throttle renders
  const latestEventRef = useRef<BackendEvent | null>(null);

  // Track equipment ID -> index so we can update only one element
  const idToIndexRef = useRef<Record<string, number>>({});

  // Init prev levels + id->index once and whenever equipment list changes
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

  // Apply one backend event (called from the throttled timer)
  const applyBackendEvent = useCallback((ev: BackendEvent) => {
    const id = ev.machine_id;

    const riskPercent = Math.round(ev.prediction.failure_prob * 1000) / 10; // 1 decimal percent
    const riskLevel = getRiskLevel(riskPercent);

    const newSensor = telemetryToSensor(ev.telemetry);
    const decision = toPurchaseDecision(ev);
    const failureMode = FAILURE_LABEL[ev.prediction.failure_type] ?? ev.prediction.failure_type;

    setEquipment((prev) => {
      const idx = idToIndexRef.current[id];

      // If machine not found, add it (but keep it cheap)
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

        // Update refs for new ID (so next ticks are O(1))
        idToIndexRef.current = { ...idToIndexRef.current, [id]: 0 };
        prevRiskLevels.current = { ...prevRiskLevels.current, [id]: riskLevel };

        return [newEq, ...prev];
      }

      // Update just one element (no full-array map)
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

      // --- alerts (based on backend action and risk escalation) ---
      const prevLevel = prevRiskLevels.current[id];
      const isBuyNow = ev.decision.action === 'BUY_NOW';

      if (prevLevel && prevLevel !== 'critical' && (riskLevel === 'critical' || isBuyNow)) {
        const eqName = eq.name ?? `Equipment ${id}`;
        const msg = isBuyNow
          ? `🚨 BUY NOW: ${eqName} — ${Math.round(ev.prediction.failure_prob * 100)}% risk (${ev.prediction.failure_type})`
          : `WARNING: ${eqName} entered ${riskLevel} risk at ${riskPercent}%`;

        const alert: AlertEvent = {
          id: `alert-${Date.now()}-${id}`,
          timestamp: Date.now(),
          equipmentId: id,
          equipmentName: eqName,
          message: msg,
          severity: isBuyNow || riskLevel === 'critical' ? 'critical' : 'warning',
        };

        // alerts update is separate state; OK but keep bounded
        setAlerts((a) => [alert, ...a].slice(0, 50));

        if (isBuyNow) toast.error(msg, { duration: 5000 });
        else toast(msg, { duration: 3500, icon: '⚠️' });
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

  // WebSocket connection: just store the latest event
  useEffect(() => {
    if (isPaused) {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => console.log('✅ WS connected:', wsUrl);
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
    // Later: call backend demo endpoints (oversample/interval) if you add them
  }, []);

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

