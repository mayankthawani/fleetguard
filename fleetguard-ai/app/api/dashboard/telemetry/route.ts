import { NextResponse } from "next/server";
import client from "@/src/lib/mongodb";

export async function GET() {
  await client.connect();

  const db = client.db("fleetguard");

  const telemetry = await db.collection("telemetry").aggregate([
    { $match: { vehicleId: { $exists: true, $ne: "" } } },
    { $sort: { timestamp: -1, _id: -1 } },
    { $group: { _id: "$vehicleId", telemetry: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$telemetry" } },
    { $sort: { vehicleId: 1 } },
  ]).toArray();

  return NextResponse.json(telemetry);
}