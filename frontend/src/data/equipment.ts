// equipment.ts
// Equipment model and initial state for the Simulation page ONLY

export type EquipmentType = "motor" | "pump" | "hvac" | "conveyor";

export type MachineStatus =
  | "Healthy"
  | "Warning"
  | "NeedsFix"
  | "Failed";

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;

  // Simulation-controlled wear (0-100)
  usagePercent: number;

  // Current lifecycle state
  status: MachineStatus;

  // Downtime accumulated once failed
  downtimeHours: number;

  // Used to detect transitions for alerts
  lastStatus: MachineStatus;
}

/**
 * All machines start identical in the simulation:
 * 0% usage, Healthy, no downtime.
 * Differences emerge over simulated time.
 */
export function createInitialEquipment(): Equipment[] {
  const SEEDS: Array<Pick<Equipment, "id" | "name" | "type">> = [
    { id: "M-01", name: "Main Motor",     type: "motor" },
    { id: "M-02", name: "Water Pump",     type: "pump" },
    { id: "M-03", name: "Air Cooler",     type: "hvac" },
    { id: "M-04", name: "Conveyor Belt",  type: "conveyor" },
    { id: "M-05", name: "Backup Motor",   type: "motor" },
    { id: "M-06", name: "Oil Pump",       type: "pump" },
    { id: "M-07", name: "Roof Cooler",    type: "hvac" },
    { id: "M-08", name: "Package Mover",  type: "conveyor" },
  ];

  return SEEDS.map((m) => ({
    ...m,
    usagePercent: 0,
    status: "Healthy" as MachineStatus,
    lastStatus: "Healthy" as MachineStatus,
    downtimeHours: 0,
  }));
}
