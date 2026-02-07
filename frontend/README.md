# Downtime Radar — Industrial Reliability Dashboard

> Predict equipment failure risk. Decide whether to reorder parts now.
> **Prevent downtime before it happens.**

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## How the Simulation Works

The dashboard simulates a **live industrial sensor feed** entirely in the browser:

- A `setInterval` tick runs every **2 seconds**, updating all equipment simultaneously
- Each tick applies a **random walk** to sensor values (temperature, vibration, pressure) with slight upward bias to simulate gradual degradation
- Runtime hours, environment severity, and failure history drift naturally over time
- Risk scores are **recalculated every tick** based on the updated sensor environment
- **Toast notifications** fire automatically when equipment transitions from safe to high/critical risk zones
- A **2% chance per tick** of a "sensor spike" alert on any equipment above 40% risk

## How Risk Is Calculated

The risk engine uses a **heuristic model** combining four factors:

```
Risk = BaseRate x RuntimeMultiplier x EnvironmentMultiplier x HistoryPenalty
```

| Factor | Formula |
|--------|---------|
| **Base failure rate** | Motor: 2.0%, Pump: 2.5%, HVAC: 1.5%, Conveyor: 3.0% per day |
| **Runtime multiplier** | `1 + (hours / 2000)` — more hours = higher risk |
| **Environment multiplier** | `1 + (heat + dust + moisture) / 300` |
| **History penalty** | `1 + pastFailures x 0.18` |

The **72-hour probability curve** uses exponential CDF projection with a confidence band that widens over time.

## How to Demo It Live

1. **Start the app** — the dashboard immediately begins streaming live data
2. **Click equipment** in the left panel — sorted by risk (highest first)
3. **Watch the center chart** update in real-time with the failure probability curve
4. **Adjust scenario sliders** at the bottom to simulate "what-if" scenarios (crank up heat/runtime to see risk spike)
5. **Check the right panel** for purchase recommendations — it shifts from "Monitor" to "Buy Now" as risk climbs
6. **Wait for toast alerts** — they fire when equipment crosses risk thresholds
7. **Pause/Resume** simulation with the header button to freeze the frame during discussion

## Architecture

```
src/
├── types/          TypeScript interfaces
├── engine/         Risk calculation heuristic model
├── data/           Equipment seed data and mock generator
├── hooks/          useSimulation — real-time state management
└── components/
    ├── Header          Top bar with live status + pause control
    ├── EquipmentList   Left panel — sortable, filterable fleet
    ├── RiskChart       Center panel — 72h probability + live sensors
    ├── PurchaseEngine  Right panel — decision cards + substitute parts
    ├── ControlPanel    Scenario sliders (runtime, environment, failures)
    ├── AlertLog        Alert history feed
    └── Dashboard       Main layout compositor
```

## Tech Stack

- **React 19** + TypeScript
- **Vite 7** for blazing-fast HMR
- **Tailwind CSS v4** for dark-mode enterprise styling
- **Recharts** for interactive area/line charts
- **Lucide React** for consistent iconography
- **React Hot Toast** for real-time alert notifications
