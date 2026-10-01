import pika
import json
import random
import time
from datetime import datetime

credentials = pika.PlainCredentials(
    "admin",
    "admin"
)

connection = pika.BlockingConnection(
    pika.ConnectionParameters(
        host="localhost",
        credentials=credentials
    )
)

channel = connection.channel()

channel.queue_declare(
    queue="vehicle_telemetry",
    durable=True
)

print("Simulator Started...")

while True:

    vehicle_id = f"V{random.randint(1,100):05d}"

    data = {
        "vehicleId": vehicle_id,

        "speed": random.randint(30, 140),
        "fuelLevel": random.randint(5, 100),
        "engineTemp": random.randint(70, 120),

        "batteryHealth": random.randint(40, 100),
        "rpm": random.randint(1000, 6000),
        "tripDuration": random.randint(5, 300),
        "distanceTravelled": random.randint(1, 500),

        "latitude": round(random.uniform(12.8, 13.2), 6),
        "longitude": round(random.uniform(80.1, 80.3), 6),

        "timestamp": datetime.now().isoformat()
    }

    channel.basic_publish(
        exchange="",
        routing_key="vehicle_telemetry",
        body=json.dumps(data),
        properties=pika.BasicProperties(
            delivery_mode=2
        )
    )

    print("Sent:", data)

    time.sleep(2)