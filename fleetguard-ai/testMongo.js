const client = require("./src/lib/mongodb");

async function test() {
  try {
    await client.connect();

    console.log("MongoDB Connected");

    const db = client.db("fleetguard");

    console.log(await db.listCollections().toArray());

    await client.close();
  } catch (err) {
    console.log(err);
  }
}

test();