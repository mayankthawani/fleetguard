import { NextResponse } from "next/server";
import client from "@/src/lib/mongodb";

export async function GET() {
  await client.connect();

  const db = client.db("fleetguard");

  const alerts = await db
    .collection("alerts")
    .find({})
    .sort({ _id: -1 })
    .limit(20)
    .toArray();

  return NextResponse.json(alerts);
}