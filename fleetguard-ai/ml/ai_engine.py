from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib

app = FastAPI()

model = joblib.load("risk_model.pkl")

class Telemetry(BaseModel):
    speed: int
    fuelLevel: int
    engineTemp: int
    batteryHealth: int
    rpm: int
    tripDuration: int
    distanceTravelled: int

@app.post("/predict")
def predict(data: Telemetry):

    features = pd.DataFrame([{
        "speed": data.speed,
        "fuelLevel": data.fuelLevel,
        "engineTemp": data.engineTemp,
        "batteryHealth": data.batteryHealth,
        "rpm": data.rpm,
        "tripDuration": data.tripDuration,
        "distanceTravelled": data.distanceTravelled
    }])

    prediction = model.predict(features)[0]
    probability = model.predict_proba(features)[0][1]

    return {
        "prediction": int(prediction),
        "riskScore": float(probability)
    }