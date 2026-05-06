import { prisma } from "../lib/prisma";

async function main() {
  // Create a test user
  const user = await prisma.user.create({
    data: {
      email: "test2@elkgarden.local"
      name: "Lorne",
    },
  });

  // Create a garden for that user
  const garden = await prisma.garden.create({
    data: {
      userId: user.id,
      name: "My First Garden",
      locationLabel: "Vernon, BC",
      goalMode: "balanced",
    },
  });

  console.log("Created user:", user);
  console.log("Created garden:", garden);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
