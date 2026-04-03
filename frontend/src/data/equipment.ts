import type { Equipment, EquipmentType } from '../types';
import { calculateRisk, getRiskLevel, getFailureMode } from '../engine/riskEngine';

interface EquipmentSeed {
  id: string;
  name: string;
  type: EquipmentType;
  runtimeHours: number;
  heat: number;
  dust: number;
  moisture: number;
  pastFailures: number;
  lastMaintenance: string;
}

const EQUIPMENT_SEEDS: EquipmentSeed[] = [
  { id: 'M-01', name: 'Main Drive Motor A',     type: 'motor',    runtimeHours: 4200, heat: 72, dust: 45, moisture: 30, pastFailures: 2, lastMaintenance: '2026-01-15' },
  { id: 'M-02', name: 'Coolant Pump P-12',      type: 'pump',     runtimeHours: 3800, heat: 55, dust: 20, moisture: 80, pastFailures: 1, lastMaintenance: '2026-01-28' },
  { id: 'M-03', name: 'HVAC Unit - Zone 3',     type: 'hvac',     runtimeHours: 8500, heat: 40, dust: 60, moisture: 50, pastFailures: 3, lastMaintenance: '2025-12-10' },
  { id: 'M-04', name: 'Assembly Conveyor C-1',  type: 'conveyor', runtimeHours: 6200, heat: 65, dust: 75, moisture: 25, pastFailures: 4, lastMaintenance: '2026-01-05' },
  { id: 'M-05', name: 'Aux Motor B-7',          type: 'motor',    runtimeHours: 1200, heat: 30, dust: 15, moisture: 10, pastFailures: 0, lastMaintenance: '2026-02-01' },
  { id: 'M-06', name: 'Hydraulic Pump HP-3',    type: 'pump',     runtimeHours: 5500, heat: 68, dust: 40, moisture: 55, pastFailures: 2, lastMaintenance: '2025-12-20' },
  { id: 'M-07', name: 'Rooftop HVAC-R1',        type: 'hvac',     runtimeHours: 2800, heat: 35, dust: 25, moisture: 40, pastFailures: 0, lastMaintenance: '2026-01-20' },
  { id: 'M-08', name: 'Packaging Line Conv-2',  type: 'conveyor', runtimeHours: 7800, heat: 50, dust: 85, moisture: 30, pastFailures: 5, lastMaintenance: '2025-11-30' },
  { id: 'M-09', name: 'Compressor Unit 9',      type: 'motor',    runtimeHours: 3100, heat: 60, dust: 30, moisture: 45, pastFailures: 1, lastMaintenance: '2026-03-01' },
  { id: 'M-10', name: 'Ventilation Fan F-10',   type: 'hvac',     runtimeHours: 9200, heat: 45, dust: 55, moisture: 60, pastFailures: 2, lastMaintenance: '2025-12-05' },
  { id: 'M-11', name: 'Feed Pump FP-4',         type: 'pump',     runtimeHours: 4100, heat: 58, dust: 35, moisture: 65, pastFailures: 1, lastMaintenance: '2026-01-10' },
  { id: 'M-12', name: 'Sorting Conveyor C-3',   type: 'conveyor', runtimeHours: 5800, heat: 48, dust: 70, moisture: 20, pastFailures: 3, lastMaintenance: '2025-12-28' },
  { id: 'M-13', name: 'Exhaust Fan EF-2',       type: 'hvac',     runtimeHours: 6700, heat: 42, dust: 50, moisture: 55, pastFailures: 2, lastMaintenance: '2026-01-03' },
  { id: 'M-14', name: 'Spindle Motor SM-1',     type: 'motor',    runtimeHours: 3500, heat: 75, dust: 28, moisture: 15, pastFailures: 1, lastMaintenance: '2026-01-22' },
  { id: 'M-15', name: 'Chiller Unit CH-5',      type: 'hvac',     runtimeHours: 7200, heat: 38, dust: 32, moisture: 70, pastFailures: 3, lastMaintenance: '2025-12-15' },
];

export function createInitialEquipment(): Equipment[] {
  return EQUIPMENT_SEEDS.map((seed) => {
    const risk = calculateRisk(seed.type, seed.runtimeHours, seed.heat, seed.dust, seed.moisture, seed.pastFailures);
    return {
      id: seed.id,
      name: seed.name,
      type: seed.type,
      riskPercent: Math.round(risk * 10) / 10,
      riskLevel: getRiskLevel(risk),
      runtimeHours: seed.runtimeHours,
      environmentSeverity: { heat: seed.heat, dust: seed.dust, moisture: seed.moisture },
      pastFailures: seed.pastFailures,
      sensorData: generateInitialSensorData(),
      failureMode: getFailureMode(seed.type),
      lastMaintenance: seed.lastMaintenance,
    };
  });
}

function generateInitialSensorData() {
  const now = Date.now();
  const data = [];
  for (let i = 30; i >= 0; i--) {
    data.push({
      timestamp: now - i * 2000,
      temperature: 65 + Math.random() * 20,
      vibration: 2 + Math.random() * 3,
      pressure: 95 + Math.random() * 15,
    });
  }
  return data;
}
