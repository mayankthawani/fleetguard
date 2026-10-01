const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const vehicles = [
  { model: "Tata Ace", manufacturer: "Tata", type: "Mini Truck" },
  { model: "Tata 407", manufacturer: "Tata", type: "Truck" },
  { model: "Ashok Leyland Dost", manufacturer: "Ashok Leyland", type: "LCV" },
  { model: "Ashok Leyland Partner", manufacturer: "Ashok Leyland", type: "Truck" },
  { model: "Eicher Pro 2049", manufacturer: "Eicher", type: "Truck" },
  { model: "Eicher Pro 3015", manufacturer: "Eicher", type: "Heavy Truck" },
  { model: "Mahindra Jeeto", manufacturer: "Mahindra", type: "Mini Truck" },
  { model: "Mahindra Supro", manufacturer: "Mahindra", type: "LCV" },
];

const fleetNames = [
  "North Fleet",
  "South Fleet",
  "East Fleet",
  "West Fleet",
  "Chennai Fleet",
  "Bangalore Fleet",
];

const statuses = [
  "Active",
  "Maintenance",
  "Idle"
];

async function main() {
  console.log("Seeding vehicles...");

  for (let i = 1; i <= 100; i++) {
    const vehicle =
      vehicles[Math.floor(Math.random() * vehicles.length)];

    await prisma.vehicle.create({
      data: {
        id: `V${String(i).padStart(5, "0")}`,
        vehicleNumber: `TN-${1000 + i}`,
        model: vehicle.model,
        manufacturer: vehicle.manufacturer,
        vehicleType: vehicle.type,
        fleetName:
          fleetNames[Math.floor(Math.random() * fleetNames.length)],
        status:
          statuses[Math.floor(Math.random() * statuses.length)],
      },
    });
  }

  console.log("100 Vehicles Added Successfully");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });