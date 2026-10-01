const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding drivers...");

  for (let i = 1; i <= 100; i++) {
    await prisma.driver.create({
      data: {
        id: `D${String(i).padStart(5, "0")}`,
        name: `Driver ${i}`,
        licenseNumber: `DL${100000 + i}`,
        safetyScore: Math.floor(Math.random() * 30) + 70,
      },
    });
  }

  console.log("100 Drivers Added Successfully");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });