import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: "analyst@malviz.local" },
    update: { name: "Demo Analyst", role: Role.USER },
    create: {
      email: "analyst@malviz.local",
      name: "Demo Analyst",
      role: Role.USER,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@malviz.local" },
    update: { name: "Demo Admin", role: Role.ADMIN },
    create: {
      email: "admin@malviz.local",
      name: "Demo Admin",
      role: Role.ADMIN,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
