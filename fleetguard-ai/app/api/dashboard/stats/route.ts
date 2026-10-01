import { NextResponse } from "next/server";
import client from "@/src/lib/mongodb";

export async function GET() {
  await client.connect();

  const db = client.db("fleetguard");

  const telemetry = db.collection("telemetry");
  const alerts = db.collection("alerts");

  const totalTelemetry =
    await telemetry.countDocuments();

  const totalAlerts =
    await alerts.countDocuments();

  const speedStats = await telemetry.aggregate([
    {
      $group: {
        _id: null,
        avgSpeed: { $avg: "$speed" },
        avgFuel: { $avg: "$fuelLevel" }
      }
    }
  ]).toArray();

  return NextResponse.json({
    totalTelemetry,
    totalAlerts,
    avgSpeed:
      Math.round(speedStats[0]?.avgSpeed || 0),

    avgFuel:
      Math.round(speedStats[0]?.avgFuel || 0)
  });
}