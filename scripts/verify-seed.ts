import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { email: "asc" },
    select: { email: true, role: true },
  });

  const analyst = users.find((user) => user.email === "analyst@malviz.local");
  const admin = users.find((user) => user.email === "admin@malviz.local");

  if (!analyst || !admin) {
    throw new Error("Seeded demo identities are missing.");
  }

  console.log("Seeded demo identities:");
  for (const user of users) {
    console.log(`- ${user.email} (${user.role})`);
  }
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
