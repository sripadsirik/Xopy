import { useState, useEffect, useCallback } from 'react';
import type { Equipment, AlertEvent, SimulationControls, SensorReading } from '../types';
import { createInitialEquipment } from '../data/equipment';
import { getRiskLevel } from '../engine/riskEngine';
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

  const fetchMachineStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8000/status/${id}`);
      if (!response.ok) throw new Error('Failed to fetch status');
      const data = await response.json();

      const machineRisk = data.ml_prediction.risk_score * 100; // Convert 0-1 to 0-100

      setEquipment(prev => prev.map(eq => {
        if (eq.id !== id) return eq;

        // Append new sensor reading
        const newSensor: SensorReading = {
          timestamp: Date.now(),
          temperature: data.sensor_data.process_temperature, // Mapping Process Temp to "temperature"
          vibration: data.sensor_data.rotational_speed / 100, // Scaling down RPM for visualization consistency
          pressure: data.sensor_data.torque // Mapping Torque to "Pressure" roughly
        };

        const sensorData = [...eq.sensorData.slice(-49), newSensor];

        return {
          ...eq,
          sensorData,
          riskPercent: Math.round(machineRisk * 10) / 10,
          riskLevel: getRiskLevel(machineRisk),
          // We could also update runtimeHours etc if the backend provided it
        };
      }));

    } catch (error) {
      // console.error("Error fetching machine status:", error); 
      // Squelch errors for now to avoid console spam if backend is offline
    }
  }, []);

  const tick = useCallback(() => {
    // Poll for ALL active equipment in our list to simulate the dashboard
    equipment.forEach(eq => {
      fetchMachineStatus(eq.id);
    });
  }, [equipment, fetchMachineStatus]);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(tick, TICK_INTERVAL);
    return () => clearInterval(interval);
  }, [isPaused, tick]);

  const applyControls = useCallback((newControls: SimulationControls) => {
    setControls(newControls);
    // In a real app, we would send these controls to the backend
    // await fetch('http://localhost:8000/controls', { method: 'POST', body: JSON.stringify(newControls) });
    toast("Controls applied (Simulation UI only)", { icon: '🎛️' });
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
