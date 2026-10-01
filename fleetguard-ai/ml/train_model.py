import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

# Load Dataset
df = pd.read_csv("training_data.csv")

# Features
X = df[
    [
        "speed",
        "fuelLevel",
        "engineTemp",
        "batteryHealth",
        "rpm",
        "tripDuration",
        "distanceTravelled"
    ]
]

# Target
y = df["risk"]

# Train Test Split
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

# Model
model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)

model.fit(X_train, y_train)

# Predictions
predictions = model.predict(X_test)

accuracy = accuracy_score(y_test, predictions)

print("Accuracy:", accuracy)

# Save Model
joblib.dump(model, "risk_model.pkl")

print("Model Saved")