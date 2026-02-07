from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, SessionLocal, get_db
from models import Base, SensorData
import random
import pandas as pd
from app.ml.global_model_service import GlobalFleetModel, daily_aggregate_from_readings

# Create tables if not exists
Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Global Model
# Uses default path from service
global_model = GlobalFleetModel()
try:
    global_model.load()
    print("Global Fleet Model loaded successfully.")
except Exception as e:
    print(f"Warning: Could not load Global Fleet Model. {e}")

@app.get("/")
def read_root():
    return {"message": "Xopy Backend Simulation Running (Global Fleet Model)"}

@app.get("/status/{machine_id}")
async def get_machine_status(machine_id: str, db: Session = Depends(get_db)):
    # 1. Determine available range for this machine
    # We want to simulate a "current day"
    # Find min and max day_index for this machine
    
    # Check if machine exists
    first_reading = db.query(SensorData).filter(SensorData.machine_id == machine_id).first()
    if not first_reading:
        raise HTTPException(status_code=404, detail="Machine not found")

    # Get random day to simulate
    # Optimally, we'd cache the max day, but a quick query is fine for now
    # We pick a random day from the available history to simulate "now"
    # Note: In a real app, "now" is just the latest reading. 
    # But for demoing the full dataset, random access is fun.
    
    # Let's pick a random reading first to get a "current timestamp" anchor
    count = db.query(SensorData).filter(SensorData.machine_id == machine_id).count()
    offset = random.randint(0, count - 1)
    current_reading = db.query(SensorData).filter(SensorData.machine_id == machine_id).offset(offset).first()
    
    if not current_reading:
        raise HTTPException(status_code=404, detail="No data available")
        
    current_day = current_reading.day_index
    
    # 2. Fetch ALL readings for this specific day to build the daily aggregate
    # The model needs the full day's behavior (min, max, mean) to predict risk
    day_readings = db.query(SensorData).filter(
        SensorData.machine_id == machine_id,
        SensorData.day_index == current_day
    ).all()
    
    if not day_readings:
        # Should not happen given logic above
        raise HTTPException(status_code=404, detail="Daily data missing")

    # Convert to DataFrame for aggregation
    # We need specific columns: "Air temperature [K]", "Process temperature [K]", etc.
    # Map model keys to DB keys
    records = []
    for r in day_readings:
        records.append({
            "Air temperature [K]": r.air_temperature,
            "Process temperature [K]": r.process_temperature,
            "Rotational speed [rpm]": r.rotational_speed,
            "Torque [Nm]": r.torque,
            "Tool wear [min]": r.tool_wear
        })
    df_day = pd.DataFrame(records)
    
    # 3. Aggregate
    # ideally we'd fetch previous 7 days for trend features, but for this MVP iteration
    # we'll pass None to prev_7d (trends will be 0, which is acceptable)
    agg_row = daily_aggregate_from_readings(
        machine_id=machine_id,
        lifespan_class=current_reading.lifespan_class,
        Type=current_reading.type,
        day_index=current_day,
        readings=df_day,
        prev_7d=None 
    )
    
    # 4. Predict
    risk_score = 0.0
    predicted_label = "LOW"
    
    try:
        result = global_model.predict_from_daily_row(agg_row)
        risk_score = result.failure_prob
        predicted_label = result.label
    except Exception as e:
        print(f"Prediction error: {e}")
    
    return {
        "machine_id": machine_id,
        "timestamp": current_reading.timestamp,
        "sensor_data": {
            "air_temperature": current_reading.air_temperature,
            "process_temperature": current_reading.process_temperature,
            "rotational_speed": current_reading.rotational_speed,
            "torque": current_reading.torque,
            "tool_wear": current_reading.tool_wear
        },
        "ml_prediction": {
            "risk_score": float(risk_score),
            "predicted_failure_type": f"Risk: {predicted_label}" # Mapping label to old string field
        }
    }
