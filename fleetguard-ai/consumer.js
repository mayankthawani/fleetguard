const amqp = require("amqplib");
const axios = require("axios");
const client = require("./src/lib/mongodb");

async function start() {
  try {
    // MongoDB Connection
    await client.connect();

    const db = client.db("fleetguard");

    const telemetryCollection =
      db.collection("telemetry");

    const alertsCollection =
      db.collection("alerts");

    // RabbitMQ Connection
    const connection =
      await amqp.connect(
        "amqp://admin:admin@localhost"
      );

    const channel =
      await connection.createChannel();

    await channel.assertQueue(
      "vehicle_telemetry",
      {
        durable: true,
      }
    );

    console.log(
      "Consumer started."
    );

    channel.consume(
      "vehicle_telemetry",
      async (msg) => {
        try {
          const data = JSON.parse(
            msg.content.toString()
          );

          // AI Prediction
          const aiResponse =
            await axios.post(
              "http://127.0.0.1:8001/predict",
              {
                speed: data.speed,
                fuelLevel: data.fuelLevel,
                engineTemp:
                  data.engineTemp,
                batteryHealth:
                  data.batteryHealth,
                rpm: data.rpm,
                tripDuration:
                  data.tripDuration,
                distanceTravelled:
                  data.distanceTravelled,
              }
            );

          data.prediction =
            aiResponse.data.prediction;

          data.riskScore =
            aiResponse.data.riskScore;

          // Store Full Telemetry
          await telemetryCollection.insertOne(
            data
          );

          // Store Alerts Separately
          if (data.riskScore > 0.8) {
            await alertsCollection.insertOne({
              vehicleId: data.vehicleId,

              riskScore:
                data.riskScore,

              prediction:
                data.prediction,

              speed: data.speed,

              fuelLevel:
                data.fuelLevel,

              engineTemp:
                data.engineTemp,

              batteryHealth:
                data.batteryHealth,

              rpm: data.rpm,

              timestamp:
                data.timestamp,

              status:
                "HIGH_RISK",
            });

            console.log(
                `Critical alert generated for ${data.vehicleId}`
            );
          }

          console.log(
            `Vehicle ${
              data.vehicleId
            } | Risk Score: ${data.riskScore.toFixed(
              2
            )} | Prediction: ${
              data.prediction
            }`
          );

          channel.ack(msg);
        } catch (error) {
          console.error(
            "Processing error:",
            error.message
          );

          channel.nack(
            msg,
            false,
            false
          );
        }
      }
    );
  } catch (error) {
    console.error(error);
  }
}

start();