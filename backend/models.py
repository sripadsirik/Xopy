from sqlalchemy import Column, Integer, String, Float, DateTime
from database import Base

class SensorData(Base):
    __tablename__ = "sensor_data"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String, index=True)
    type = Column(String) # L/M/H type for ML model
    timestamp = Column(DateTime)
    air_temperature = Column(Float)
    process_temperature = Column(Float)
    rotational_speed = Column(Float)
    torque = Column(Float)
    tool_wear = Column(Float)
    target = Column(Integer)  # 0 or 1 for failure
