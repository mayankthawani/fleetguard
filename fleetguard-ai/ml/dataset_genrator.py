import pandas as pd
import random

data = []

for _ in range(50000):

    speed = random.randint(30, 140)
    fuelLevel = random.randint(5, 100)
    engineTemp = random.randint(70, 120)

    batteryHealth = random.randint(40, 100)
    rpm = random.randint(1000, 6000)
    tripDuration = random.randint(5, 300)
    distanceTravelled = random.randint(1, 500)

    risk = 0

    if speed > 100:
        risk += 1

    if engineTemp > 100:
        risk += 1

    if fuelLevel < 15:
        risk += 1

    if batteryHealth < 50:
        risk += 1

    if rpm > 4500:
        risk += 1

    label = 1 if risk >= 2 else 0

    data.append({
        "speed": speed,
        "fuelLevel": fuelLevel,
        "engineTemp": engineTemp,
        "batteryHealth": batteryHealth,
        "rpm": rpm,
        "tripDuration": tripDuration,
        "distanceTravelled": distanceTravelled,
        "risk": label
    })

df = pd.DataFrame(data)

df.to_csv("training_data.csv", index=False)

print("Dataset Generated")
print(df.head())