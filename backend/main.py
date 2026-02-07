from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, SessionLocal, get_db
from models import Base, SensorData
import random
import datetime
import joblib
import pandas as pd
import numpy as np
import os

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

# Load Models
MODEL_DIR = "models"
try:
    fail_model = joblib.load(os.path.join(MODEL_DIR, "fail_model.joblib"))
    type_model = joblib.load(os.path.join(MODEL_DIR, "type_model.joblib"))
    print("ML Models loaded successfully.")
except Exception as e:
    print(f"Warning: Could not load ML models. {e}")
    fail_model = None
    type_model = None

@app.get("/")
def read_root():
    return {"message": "Xopy Backend Simulation Running"}

@app.get("/status/{machine_id}")
async def get_machine_status(machine_id: str, db: Session = Depends(get_db)):
    # Simulate a "live" stream by picking a random row for now
    
    # Get total count for this machine
    count = db.query(SensorData).filter(SensorData.machine_id == machine_id).count()
    if count == 0:
        # Fallback for new IDs not yet in DB - or if user requests ID not in CSV
        # Just return dummy data to prevent frontend crash while waiting for import
        raise HTTPException(status_code=404, detail="Machine not found")
    
    # Picking a random row to simulate "current time" simulation
    offset = random.randint(0, count - 1)
    reading = db.query(SensorData).filter(SensorData.machine_id == machine_id).offset(offset).first()
    
    if not reading:
        raise HTTPException(status_code=404, detail="No data available")

    # REAL ML PREDICTION
    risk_score = 0.0
    predicted_type = "None"
    
    if fail_model:
        # Construct DataFrame input matching training schema
        # Columns: Type, Air temperature [K], Process temperature [K], Rotational speed [rpm], Torque [Nm], Tool wear [min], Temp delta [K]
        input_data = {
            "Type": [reading.type],
            "Air temperature [K]": [reading.air_temperature],
            "Process temperature [K]": [reading.process_temperature],
            "Rotational speed [rpm]": [reading.rotational_speed],
            "Torque [Nm]": [reading.torque],
            "Tool wear [min]": [reading.tool_wear],
            # Calculated feature
            "Temp delta [K]": [reading.process_temperature - reading.air_temperature]
        }
        df = pd.DataFrame(input_data)
        
        try:
            # Predict Probability of Failure (Class 1)
            # predict_proba returns [[prob_0, prob_1]]
            probs = fail_model.predict_proba(df)
            risk_score = probs[0][1] # Probability of failure
            
            # If risk is high (e.g. > 0.5), predict failure type
            if risk_score > 0.5 and type_model:
                pred_type = type_model.predict(df)[0]
                predicted_type = pred_type
                
        except Exception as e:
            print(f"Prediction error: {e}")
            risk_score = 0.0 # Fallback

    return {
        "machine_id": reading.machine_id,
        "timestamp": reading.timestamp,
        "sensor_data": {
            "air_temperature": reading.air_temperature,
            "process_temperature": reading.process_temperature,
            "rotational_speed": reading.rotational_speed,
            "torque": reading.torque,
            "tool_wear": reading.tool_wear
        },
        "ml_prediction": {
            "risk_score": float(risk_score),
            "predicted_failure_type": predicted_type
        }
    }
