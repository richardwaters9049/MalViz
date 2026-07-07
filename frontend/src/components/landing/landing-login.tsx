"use client";

import { Activity, AlertTriangle, FileSearch, ShieldCheck, UploadCloud } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DemoUser = {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
};

type LandingLoginProps = {
  currentUser: {
    id: string;
    email: string;
    name: string;
    role: "USER" | "ADMIN";
  } | null;
  users: DemoUser[];
  databaseError: string | null;
  chooseUser: (formData: FormData) => void | Promise<void>;
};

const easeOut = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08,
    },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: easeOut },
  },
};

export function LandingLogin({
  currentUser,
  users,
  databaseError,
  chooseUser,
}: LandingLoginProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-zinc-950 text-white">
      <motion.section
        className="mx-auto grid min-h-screen max-w-7xl items-stretch gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <div className="flex flex-col justify-center">
          <motion.div className="mb-8 flex items-center gap-3" variants={item}>
            <motion.span
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-400 text-zinc-950"
              whileHover={{ rotate: -6, scale: 1.04 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
            >
              <ShieldCheck className="h-6 w-6" aria-hidden />
            </motion.span>
            <div>
              <p className="text-base font-semibold">MalViz</p>
              <p className="text-sm text-zinc-400">Explainable malware analysis</p>
            </div>
          </motion.div>

          <motion.h1
            className="max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl"
            variants={item}
          >
            Upload suspicious files and get clear, actionable verdicts.
          </motion.h1>
          <motion.p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300" variants={item}>
            MalViz stores files in quarantine, runs static analysis on demand, and turns low-level signals into
            reports analysts can actually act on.
          </motion.p>

          <motion.div className="mt-8 grid max-w-3xl gap-3 overflow-visible sm:grid-cols-3" variants={container}>
            <Feature
              icon={<UploadCloud className="h-5 w-5" />}
              title="Quarantine uploads"
              summary="Samples are renamed, isolated outside public routes, and tracked with trusted metadata."
            />
            <Feature
              icon={<Activity className="h-5 w-5" />}
              title="Static analysis"
              summary="Extracts hashes, file type, entropy, strings, commands, and indicators."
            />
            <Feature
              icon={<FileSearch className="h-5 w-5" />}
              title="Explainable reports"
              summary="Verdicts include risk scores, reasons, technical findings, indicators, and suggested actions."
            />
          </motion.div>
        </div>

        <motion.div
          className="flex"
          variants={item}
          transition={{ type: "spring", stiffness: 240, damping: 22 }}
        >
          <Card className="flex w-full flex-col justify-center border-zinc-800 bg-zinc-900/90 text-white shadow-2xl shadow-black/20">
            <CardHeader>
              <CardTitle className="text-xl text-white">Log in to MalViz</CardTitle>
              <p className="text-sm text-zinc-400">
                Choose a seeded demo identity to enter the MVP dashboard.
              </p>
            </CardHeader>
            <CardContent>
              {databaseError ? (
                <motion.div
                  className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" aria-hidden />
                    Database setup needed
                  </div>
                  <p>
                    Run `bun run setup` from the project root. It starts Postgres and Redis, applies Prisma
                    migrations, seeds the demo identities, starts the worker, and launches the app.
                  </p>
                </motion.div>
              ) : null}
              {currentUser ? (
                <motion.div
                  className="mb-4 rounded-md border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  Current session: {currentUser.name}
                </motion.div>
              ) : null}
              <form action={chooseUser} className="grid gap-3">
                {users.map((user, index) => (
                  <motion.button
                    key={user.id}
                    name="userId"
                    value={user.id}
                    className="flex w-full cursor-pointer items-center justify-between rounded-md border border-zinc-700 bg-zinc-950/70 p-4 text-left transition-colors hover:border-cyan-300 hover:bg-zinc-800"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.28 + index * 0.06 }}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <span>
                      <span className="block text-sm font-medium text-white">{user.name}</span>
                      <span className="block text-xs text-zinc-400">{user.email}</span>
                    </span>
                    <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-300">
                      {user.role === "ADMIN" ? "Admin" : "User"}
                    </span>
                  </motion.button>
                ))}
              </form>
              {!databaseError && users.length === 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Run `bun run db:seed` after the database migration to create demo accounts.
                </div>
              ) : null}
              {currentUser ? (
                <Button className="mt-4 w-full bg-cyan-400 text-zinc-950 hover:bg-cyan-300" asChild>
                  <a href="/dashboard">Continue to dashboard</a>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>
      </motion.section>
    </main>
  );
}

function Feature({
  icon,
  title,
  summary,
}: {
  icon: React.ReactNode;
  title: string;
  summary: string;
}) {
  return (
    <motion.div
      className="group relative min-h-32 overflow-visible rounded-lg border border-zinc-800 bg-zinc-900/80 p-4 text-sm text-zinc-200 shadow-lg shadow-black/10 transition-colors hover:border-cyan-300 hover:bg-zinc-800 focus:outline-none focus-visible:border-cyan-300 focus-visible:bg-zinc-800"
      variants={item}
      whileHover={{ y: -4 }}
      tabIndex={0}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-950 text-cyan-300">
          {icon}
        </span>
      </div>
      <p className="mt-4 font-medium text-white">{title}</p>
      <div className="pointer-events-none absolute bottom-[calc(100%+0.75rem)] left-1/2 z-30 w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 translate-y-3 scale-95 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 opacity-0 shadow-2xl shadow-cyan-950/30 transition-all duration-200 before:absolute before:left-1/2 before:top-full before:h-3 before:w-3 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-45 before:border-b before:border-r before:border-cyan-200 before:bg-cyan-50 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:scale-100 group-focus-visible:opacity-100">
        <p className="text-sm font-semibold text-zinc-950">{title}</p>
        <p className="mt-2 text-sm leading-6 text-zinc-700">{summary}</p>
      </div>
    </motion.div>
  );
}
