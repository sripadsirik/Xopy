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
  { id: 'MCH-S-01', name: 'Main Drive Motor A', type: 'motor', runtimeHours: 4200, heat: 72, dust: 45, moisture: 30, pastFailures: 2, lastMaintenance: '2026-01-15' },
  { id: 'MCH-S-02', name: 'Coolant Pump P-12', type: 'pump', runtimeHours: 3800, heat: 55, dust: 20, moisture: 80, pastFailures: 1, lastMaintenance: '2026-01-28' },
  { id: 'MCH-S-03', name: 'HVAC Unit - Zone 3', type: 'hvac', runtimeHours: 8500, heat: 40, dust: 60, moisture: 50, pastFailures: 3, lastMaintenance: '2025-12-10' },
  { id: 'MCH-S-04', name: 'Assembly Conveyor C-1', type: 'conveyor', runtimeHours: 6200, heat: 65, dust: 75, moisture: 25, pastFailures: 4, lastMaintenance: '2026-01-05' },
  { id: 'MCH-S-05', name: 'Aux Motor B-7', type: 'motor', runtimeHours: 1200, heat: 30, dust: 15, moisture: 10, pastFailures: 0, lastMaintenance: '2026-02-01' },
  { id: 'MCH-S-06', name: 'Hydraulic Pump HP-3', type: 'pump', runtimeHours: 5500, heat: 68, dust: 40, moisture: 55, pastFailures: 2, lastMaintenance: '2025-12-20' },
  { id: 'MCH-S-07', name: 'Rooftop HVAC-R1', type: 'hvac', runtimeHours: 2800, heat: 35, dust: 25, moisture: 40, pastFailures: 0, lastMaintenance: '2026-01-20' },
  { id: 'MCH-S-08', name: 'Packaging Line Conv-2', type: 'conveyor', runtimeHours: 7800, heat: 50, dust: 85, moisture: 30, pastFailures: 5, lastMaintenance: '2025-11-30' },
  { id: 'MCH-S-09', name: 'Compressor Unit 9', type: 'motor', runtimeHours: 3100, heat: 60, dust: 30, moisture: 45, pastFailures: 1, lastMaintenance: '2026-03-01' },
  { id: 'MCH-S-10', name: 'Ventilation Fan F-10', type: 'hvac', runtimeHours: 9200, heat: 45, dust: 55, moisture: 60, pastFailures: 2, lastMaintenance: '2025-12-05' },
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
