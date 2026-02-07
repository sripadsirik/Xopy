// simEquipment.ts
// Self-contained equipment model for the Simulation view.
// Completely separate from the dashboard's Equipment type in ../types.

export type SimEquipmentType = 'motor' | 'pump' | 'hvac' | 'conveyor';

export type SimMachineStatus = 'Healthy' | 'Warning' | 'NeedsFix' | 'Failed';

export interface SimMachine {
  id: string;
  name: string;
  type: SimEquipmentType;
  usagePercent: number;
  status: SimMachineStatus;
  downtimeHours: number;
  lastStatus: SimMachineStatus;
}

export function createSimMachines(): SimMachine[] {
  const SEEDS: Array<Pick<SimMachine, 'id' | 'name' | 'type'>> = [
    { id: 'S-01', name: 'Main Drive Motor A',     type: 'motor' },
    { id: 'S-02', name: 'Coolant Pump P-12',      type: 'pump' },
    { id: 'S-03', name: 'HVAC Unit - Zone 3',     type: 'hvac' },
    { id: 'S-04', name: 'Assembly Conveyor C-1',  type: 'conveyor' },
    { id: 'S-05', name: 'Aux Motor B-7',          type: 'motor' },
    { id: 'S-06', name: 'Hydraulic Pump HP-3',    type: 'pump' },
    { id: 'S-07', name: 'Rooftop HVAC-R1',        type: 'hvac' },
    { id: 'S-08', name: 'Packaging Line Conv-2',  type: 'conveyor' },
    { id: 'S-09', name: 'Compressor Unit 9',      type: 'motor' },
    { id: 'S-10', name: 'Ventilation Fan F-10',   type: 'hvac' },
  ];

  return SEEDS.map((s) => ({
    ...s,
    usagePercent: 0,
    status: 'Healthy' as SimMachineStatus,
    lastStatus: 'Healthy' as SimMachineStatus,
    downtimeHours: 0,
  }));
}
