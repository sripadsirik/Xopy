import pandas as pd
from database import engine, Base, SessionLocal
from models import SensorData
from sqlalchemy.orm import Session
import datetime
import math

# Drops table so we can recreate it with new schema (if needed) and clean data
SensorData.__table__.drop(engine, checkfirst=True)
# Create tables
Base.metadata.create_all(bind=engine)

def import_csv_data(file_path):
    print(f"Reading {file_path}...")
    try:
        df = pd.read_csv(file_path)
    except FileNotFoundError:
        print(f"Error: File not found at {file_path}")
        return

    # Check for new column names in the synthetic dataset
    print("Columns:", df.columns.tolist())

    # Map columns from CSV to Model
    # CSV columns: machine_id, lifespan_class, is_future, Type, day_index, reading_index, date, timestamp, ...
    
    db = SessionLocal()
    
    try:
        print("Importing data...")
        
        objects = []
        for i, row in df.iterrows():
            
            # Parse timestamp properly
            ts_str = row['timestamp']
            # Assuming format: 2026-01-01T00:18:00
            try:
                timestamp = datetime.datetime.fromisoformat(ts_str)
            except ValueError:
                # Fallback or strict fail? 
                # Let's try pandas parser if basic iso fails
                timestamp = pd.to_datetime(ts_str)

            objects.append(SensorData(
                machine_id=row['machine_id'],
                type=row['Type'], 
                lifespan_class=row['lifespan_class'],
                day_index=row['day_index'],
                timestamp=timestamp,
                air_temperature=row['Air temperature [K]'],
                process_temperature=row['Process temperature [K]'],
                rotational_speed=row['Rotational speed [rpm]'],
                torque=row['Torque [Nm]'],
                tool_wear=row['Tool wear [min]'],
                target=row.get('Machine failure', 0) 
            ))

            # Batch insert
            if len(objects) >= 1000:
                db.bulk_save_objects(objects)
                db.commit()
                objects = []
                print(f"Imported {i+1} rows...")

        # Insert remaining
        if objects:
            db.bulk_save_objects(objects)
            db.commit()
            
        print("Import completed successfully!")

    except Exception as e:
        print(f"Error importing data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    csv_file = "data/synthetic_fleet_6mo_daily_10_machines.csv"
    import_csv_data(csv_file)
