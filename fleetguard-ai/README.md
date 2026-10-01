# FleetGuard AI

FleetGuard AI is a real-time fleet intelligence platform for monitoring vehicle telemetry, predicting maintenance risk, and turning AI signals into operational playbooks.

The application combines a premium Next.js command center with MongoDB telemetry, PostgreSQL fleet metadata, RabbitMQ event transport, and a FastAPI machine-learning inference service.

## What It Does

- Displays live fleet health and operational KPIs.
- Streams vehicle telemetry from MongoDB.
- Shows recent high-risk alerts.
- Calculates risk distribution and fleet health from current vehicle records.
- Displays vehicle positions on an interactive Leaflet map.
- Animates vehicle movement as GPS telemetry changes.
- Clusters map markers for larger fleets.
- Provides vehicle detail popups with speed, fuel, temperature, risk, and prediction data.
- Converts current telemetry into maintenance playbooks.
- Provides command center, fleet graph, prediction, and playbook views.
- Runs an AI risk classifier through FastAPI.

## Architecture

```text
Python simulator
      |
      v
RabbitMQ:5672
      |
      v
Node consumer.js -----> FastAPI /predict:8001
      |                         |
      |                         v
      +--------------------> Prediction and risk score
      |
      v
MongoDB fleetguard
  - telemetry
  - alerts
      |
      v
Next.js dashboard and API routes:3000

PostgreSQL <---- Prisma fleet metadata
```

### Data flow

1. `simulator/simulator.py` creates vehicle telemetry containing speed, fuel, engine temperature, RPM, trip data, GPS coordinates, and a timestamp.
2. RabbitMQ receives the telemetry message on the `vehicle_telemetry` queue.
3. `consumer.js` reads the message and calls the FastAPI `/predict` endpoint.
4. FastAPI loads `risk_model.pkl` and returns `prediction` and `riskScore`.
5. The consumer writes enriched telemetry to MongoDB.
6. The consumer writes a separate alert document when the risk score is above `0.8`.
7. Next.js API routes read MongoDB and provide the dashboard with live data.
8. The dashboard refreshes its data every five seconds.

## Technology Stack

### Frontend and web server

- Next.js `16.3.8`
- React `19`
- TypeScript
- Tailwind CSS `4`
- Lucide React icons
- Leaflet
- React Leaflet
- React Leaflet Cluster
- Recharts dependency for charting support

### Backend and data

- Next.js App Router API routes
- MongoDB for telemetry and alerts
- PostgreSQL through Prisma for vehicles, drivers, and relational alerts
- RabbitMQ for telemetry transport
- Node.js consumer for enrichment and persistence

### Machine learning

- Python
- FastAPI
- scikit-learn Random Forest classifier
- pandas
- joblib

## Repository Layout

```text
fleetguard-ai/
├── app/
│   ├── api/
│   │   └── dashboard/
│   │       ├── page.tsx                 Dashboard command center
│   │       ├── LeafletVehicleMap.tsx    Live Leaflet map
│   │       ├── alerts/route.ts          Recent alert API
│   │       ├── locations/route.ts       Latest GPS record per vehicle
│   │       ├── stats/route.ts           Aggregate telemetry statistics
│   │       └── telemetry/route.ts       Latest telemetry per vehicle
│   ├── globals.css                       FleetGuard design system
│   ├── layout.tsx                        Root layout and metadata
│   └── page.tsx                          Redirects to the dashboard
├── consumer.js                           RabbitMQ to AI to MongoDB consumer
├── docker-compose.yml                    RabbitMQ service definition
├── ml/
│   ├── ai_engine.py                      FastAPI prediction service
│   ├── dataset_genrator.py               Training dataset generator
│   └── train_model.py                    Random Forest training script
├── prisma/
│   ├── schema.prisma                     PostgreSQL data model
│   ├── migrations/                       Prisma migrations
│   ├── seed.js                           Vehicle seed script
│   └── seedDrivers.js                    Driver seed script
├── simulator/simulator.py                 Telemetry publisher
├── src/lib/mongodb.js                     MongoDB client
├── src/lib/prisma.ts                     Prisma client singleton
├── training_data.csv                      Model training dataset
├── risk_model.pkl                         Generated model artifact
├── package.json                           Node scripts and dependencies
└── tsconfig.json                          TypeScript configuration
```

## Prerequisites

Install the following before starting the project:

- Node.js 20 or newer
- npm
- Python 3.10 or newer
- MongoDB running on `mongodb://localhost:27017`
- PostgreSQL running locally or remotely
- Docker Desktop, recommended for RabbitMQ
- RabbitMQ management access on port `15672`

The current MongoDB client connects to:

```text
mongodb://localhost:27017
```

The MongoDB database used by the application is:

```text
fleetguard
```

RabbitMQ is configured by `docker-compose.yml` with:

```text
Host: localhost
AMQP port: 5672
Management UI: http://localhost:15672
Username: admin
Password: admin
Queue: vehicle_telemetry
```

## Environment Variables

Create local environment files from your deployment configuration. Do not commit secrets.

`.env` and `.env.local` are ignored by Git.

At minimum, Prisma requires:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fleetguard"
```

Use the correct username, password, host, port, and database name for your PostgreSQL installation.

The MongoDB client currently uses a local connection string in `src/lib/mongodb.js`. If MongoDB is hosted remotely, update that client configuration through your normal secret-management approach rather than committing credentials.

## Installation

From the repository root:

```bash
npm install
```

The post-install hook may run Prisma skill synchronization. This is optional for application runtime.

Create a Python virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Activate it on macOS or Linux:

```bash
source .venv/bin/activate
```

Install the Python services and model dependencies:

```bash
python -m pip install fastapi uvicorn pandas scikit-learn joblib pika
```

## First-Time Database Setup

### PostgreSQL and Prisma

Make sure `DATABASE_URL` is set, then generate the Prisma client:

```bash
npx prisma generate
```

Apply the existing migrations:

```bash
npx prisma migrate deploy
```

For local development where Prisma should create and apply migrations:

```bash
npx prisma migrate dev
```

Seed vehicles and drivers if the PostgreSQL database is empty:

```bash
node prisma/seed.js
node prisma/seedDrivers.js
```

The seed scripts create 100 vehicles and 100 drivers.

### MongoDB

MongoDB does not use the Prisma schema in this project. The telemetry and alert collections are created by MongoDB when the consumer first writes documents.

Test the MongoDB connection with:

```bash
node testMongo.js
```

## Machine-Learning Model Setup

The repository may contain `risk_model.pkl`. If it is missing or needs to be regenerated, run these commands from the project root:

Generate training data:

```bash
python ml/dataset_genrator.py
```

Train and save the Random Forest model:

```bash
python ml/train_model.py
```

The training script reads `training_data.csv` and writes `risk_model.pkl`.

Start the prediction API:

```bash
uvicorn ml.ai_engine:app --reload --port 8001
```

The prediction endpoint is:

```text
POST http://127.0.0.1:8001/predict
```

Example request:

```json
{
  "speed": 72,
  "fuelLevel": 65,
  "engineTemp": 84,
  "batteryHealth": 92,
  "rpm": 2200,
  "tripDuration": 45,
  "distanceTravelled": 120
}
```

Example response:

```json
{
  "prediction": 0,
  "riskScore": 0.12
}
```

## Start the Full System

Start RabbitMQ first:

```bash
docker compose up -d rabbitmq
```

Start the FastAPI prediction service in a terminal:

```bash
uvicorn ml.ai_engine:app --reload --port 8001
```

Start the Node consumer in another terminal:

```bash
node consumer.js
```

Start the telemetry simulator in another terminal:

```bash
python simulator/simulator.py
```

Start Next.js in another terminal:

```bash
npm run dev
```

Open the dashboard at:

```text
http://localhost:3000
```

The root route redirects to:

```text
http://localhost:3000/api/dashboard
```

For a production-style local run:

```bash
npm run build
npm run start
```

## Dashboard API Routes

### Dashboard page

```text
GET /api/dashboard
```

Renders the FleetGuard command center.

### Statistics

```text
GET /api/dashboard/stats
```

Returns aggregate telemetry statistics:

```json
{
  "totalTelemetry": 0,
  "totalAlerts": 0,
  "avgSpeed": 0,
  "avgFuel": 0
}
```

### Alerts

```text
GET /api/dashboard/alerts
```

Returns the latest alert records from the MongoDB `alerts` collection.

### Telemetry

```text
GET /api/dashboard/telemetry
```

Returns the latest telemetry document for each vehicle.

### Locations

```text
GET /api/dashboard/locations
```

Returns the latest telemetry document for each vehicle that has numeric latitude and longitude fields.

Each location includes:

- `vehicleId`
- `latitude`
- `longitude`
- `speed`
- `fuelLevel`
- `engineTemp`
- `riskScore`
- `prediction`
- `timestamp`

## Dashboard Views

### Command Center

The main view contains:

- Fleet status hero
- Live KPI strip
- Operational health chart
- Risk radar
- Interactive Leaflet fleet map
- AI copilot insights
- Alert queue
- Mission timeline
- Live telemetry table
- Intelligence architecture overview

### Fleet Graph

Displays current vehicle relationship and telemetry records from the live dashboard snapshot.

### Predictions

Displays vehicles with the highest current risk scores and prediction outputs.

### Playbooks

Converts telemetry conditions into operational actions:

- Engine Health
- Fuel Optimization
- High Risk Intervention

Affected vehicle counts are calculated from current telemetry. No demo records are used.

## Live Update Behavior

The dashboard refreshes statistics, alerts, and telemetry every five seconds.

The Leaflet map separately refreshes `/api/dashboard/locations` every five seconds and:

- Keeps one latest record per vehicle.
- Animates marker movement between coordinate updates.
- Uses stable vehicle IDs as marker keys.
- Clusters markers for dense fleets.
- Fits the viewport on initial data load.
- Shows real vehicle details in marker popups.

Requests are guarded against overlap and canceled when components unmount.

## MongoDB Collections

### telemetry

Telemetry documents are written by `consumer.js` and contain simulator fields plus AI output:

```text
vehicleId
speed
fuelLevel
engineTemp
batteryHealth
rpm
tripDuration
distanceTravelled
latitude
longitude
timestamp
prediction
riskScore
```

### alerts

An alert is written when `riskScore > 0.8`:

```text
vehicleId
riskScore
prediction
speed
fuelLevel
engineTemp
batteryHealth
rpm
timestamp
status
```

## Prisma Data Model

Prisma uses PostgreSQL for relational fleet metadata:

- `Vehicle`: fleet identity, model, manufacturer, type, fleet, and status.
- `Driver`: driver identity, license number, and safety score.
- `Alert`: relational alert records linked to a vehicle.

MongoDB telemetry and Prisma PostgreSQL data are separate persistence paths in the current implementation.

## NPM Scripts

```bash
npm run dev       # Start the Next.js development server
npm run build     # Build the production application
npm run start     # Start the production application
npm run lint      # Run ESLint
npm install       # Install Node dependencies
```

## Troubleshooting

### Dashboard keeps loading

Check each dependency separately:

```bash
curl http://localhost:3000/api/dashboard/stats
curl http://localhost:3000/api/dashboard/alerts
curl http://localhost:3000/api/dashboard/telemetry
curl http://localhost:3000/api/dashboard/locations
```

If an endpoint does not respond:

- Confirm MongoDB is running.
- Confirm Next.js is running on the expected port.
- Check the Next.js terminal for MongoDB errors.
- Wait for the client timeout and use the dashboard retry action.

### Consumer cannot connect to RabbitMQ

Start RabbitMQ:

```bash
docker compose up -d rabbitmq
```

Then verify the management UI at `http://localhost:15672` with `admin` / `admin`.

### Consumer cannot call FastAPI

Confirm the prediction service is running on port `8001`:

```bash
uvicorn ml.ai_engine:app --reload --port 8001
```

Confirm that `risk_model.pkl` exists in the repository root or regenerate it with the training commands.

### No telemetry appears

Start all services in this order:

1. MongoDB
2. RabbitMQ
3. FastAPI
4. Node consumer
5. Python simulator
6. Next.js

The simulator only publishes messages. The consumer must be running to call the model and persist telemetry.

### Port 3000 is already in use

Next.js may select another port automatically. Open the URL printed in the terminal, or stop the process using port 3000 before restarting the app.

### Prisma errors

Verify `DATABASE_URL`, then run:

```bash
npx prisma generate
npx prisma migrate deploy
```

Use `npx prisma studio` to inspect the PostgreSQL data.

## Security Notes

- Do not commit `.env` or `.env.local` files.
- Change the default RabbitMQ credentials before sharing or deploying the system.
- Do not expose MongoDB or PostgreSQL publicly without authentication and network controls.
- The simulator and seed scripts create random/demo-like records for development; production ingestion should use authenticated real sources.
- Review npm audit findings before production deployment.

## Development Notes

- The dashboard is intentionally client-rendered because it polls live APIs and controls Leaflet state.
- The map is dynamically loaded client-side because Leaflet requires browser APIs.
- The application currently uses MongoDB directly for dashboard telemetry routes and Prisma for PostgreSQL fleet metadata.
- The generated `.next` directory, Python caches, virtual environments, and trained model artifact are ignored by Git.

## License

No license is currently declared in `package.json`. Add a license before distributing the project outside its intended team or organization.
