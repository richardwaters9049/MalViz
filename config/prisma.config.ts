import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "../backend/prisma/schema.prisma",
  migrations: {
    seed: "tsx backend/prisma/seed.ts",
  },
});
