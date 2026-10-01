import { NextResponse } from "next/server";
import client from "@/src/lib/mongodb";

export async function GET() {
  try {
    await client.connect();

    const db = client.db("fleetguard");
    const locations = await db.collection("telemetry").aggregate([
      {
        $match: {
          vehicleId: { $exists: true, $ne: "" },
          latitude: { $type: "number" },
          longitude: { $type: "number" },
        },
      },
      { $sort: { timestamp: -1, _id: -1 } },
      {
        $group: {
          _id: "$vehicleId",
          vehicle: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$vehicle" } },
      {
        $project: {
          _id: 0,
          vehicleId: 1,
          latitude: 1,
          longitude: 1,
          speed: 1,
          fuelLevel: 1,
          engineTemp: 1,
          riskScore: 1,
          prediction: 1,
          timestamp: 1,
        },
      },
      { $sort: { vehicleId: 1 } },
    ]).toArray();

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Unable to load vehicle locations", error);
    return NextResponse.json({ error: "Unable to load vehicle locations." }, { status: 500 });
  }
}
