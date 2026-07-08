"use client";

import Image from "next/image";
import { Activity, AlertTriangle, FileSearch, UploadCloud } from "lucide-react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useEffect, useState } from "react";
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
  skipIntro?: boolean;
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
  skipIntro = false,
}: LandingLoginProps) {
  const [introComplete, setIntroComplete] = useState(skipIntro);

  useEffect(() => {
    if (skipIntro) return;

    const timer = window.setTimeout(() => setIntroComplete(true), 3_100);
    return () => window.clearTimeout(timer);
  }, [skipIntro]);

  return (
    <main className="min-h-screen overflow-hidden bg-zinc-950 text-white">
      <AnimatePresence>
        {!introComplete ? <BrandIntro /> : null}
      </AnimatePresence>

      <motion.section
        className="mx-auto grid min-h-screen max-w-7xl items-stretch gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8"
        variants={container}
        initial="hidden"
        animate={introComplete ? "visible" : "hidden"}
      >
        <div className="flex flex-col justify-center">
          <motion.div className="mb-10 flex items-center gap-5" variants={item}>
            <Image
              src="/brand/malviz-logo-concept.png"
              alt="MalViz logo"
              width={104}
              height={104}
              priority
              className="rounded-3xl border border-cyan-400/35 shadow-[0_0_42px_rgba(34,211,238,0.22)]"
            />
            <div>
              <p className="text-5xl font-semibold leading-none text-cyan-300 sm:text-6xl">MalViz</p>
              <p className="mt-3 text-lg text-zinc-300 sm:text-xl">Explainable malware analysis</p>
            </div>
          </motion.div>

          <motion.h1
            className="max-w-2xl text-3xl font-semibold leading-tight text-white sm:text-4xl"
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

function BrandIntro() {
  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-zinc-950"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.45, ease: easeOut } }}
    >
      <div className="relative grid min-h-[min(86vh,760px)] w-full place-items-center px-4">
        <motion.div
          className="absolute h-[min(86vw,720px)] w-[min(86vw,720px)] rounded-full border border-cyan-400/25"
          initial={{ scale: 0.72, opacity: 0 }}
          animate={{
            scale: [0.72, 1, 1.08],
            opacity: [0, 0.42, 0],
          }}
          transition={{ duration: 2.2, repeat: Infinity, ease: easeOut }}
        />
        <motion.div
          className="absolute h-[min(74vw,620px)] w-[min(74vw,620px)] rounded-full border border-cyan-500/45"
          initial={{ opacity: 0, rotate: 0 }}
          animate={{ opacity: 1, rotate: 360 }}
          transition={{ opacity: { delay: 0.6, duration: 0.7 }, rotate: { duration: 2.4, repeat: Infinity, ease: "linear" } }}
        >
          <span className="absolute left-1/2 top-1/2 h-1.5 w-[45%] origin-left -translate-y-1/2 bg-linear-to-r from-lime-300 via-lime-300/70 to-transparent shadow-[0_0_30px_rgba(163,230,53,0.75)]" />
          <span className="absolute left-1/2 top-0 h-8 w-px -translate-x-1/2 bg-cyan-300" />
          <span className="absolute bottom-0 left-1/2 h-8 w-px -translate-x-1/2 bg-cyan-300" />
          <span className="absolute left-0 top-1/2 h-px w-8 -translate-y-1/2 bg-cyan-300" />
          <span className="absolute right-0 top-1/2 h-px w-8 -translate-y-1/2 bg-cyan-300" />
        </motion.div>
        <motion.div
          className="absolute h-[min(58vw,480px)] w-[min(58vw,480px)] rounded-full border border-cyan-400/20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: [0.95, 1.02, 0.95] }}
          transition={{ opacity: { delay: 0.75, duration: 0.5 }, scale: { duration: 2.8, repeat: Infinity, ease: easeOut } }}
        >
          <span className="absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-cyan-400/15" />
          <span className="absolute inset-y-8 left-1/2 w-px -translate-x-1/2 bg-cyan-400/15" />
        </motion.div>

        <motion.div
          className="relative z-10 h-[min(48vw,410px)] w-[min(48vw,410px)] overflow-hidden rounded-[2rem] border border-cyan-300/40 bg-zinc-950 shadow-[0_0_90px_rgba(34,211,238,0.34)]"
          initial={{ opacity: 0, scale: 0.86, filter: "blur(18px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.35, ease: easeOut }}
        >
          <Image
            src="/brand/malviz-logo-concept.png"
            alt="MalViz logo"
            fill
            priority
            sizes="(max-width: 900px) 48vw, 410px"
            className="object-cover"
          />
        </motion.div>

        <motion.div
          className="absolute bottom-[clamp(1rem,4vh,3rem)] text-center"
          initial={{ opacity: 0, y: 12, filter: "blur(14px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 1.15, duration: 1.2, ease: easeOut }}
        >
          <p className="text-4xl font-semibold tracking-normal text-white sm:text-5xl">MalViz</p>
          <p className="mt-7 text-sm uppercase tracking-[0.3em] text-cyan-200">Threats in focus</p>
        </motion.div>
      </div>
    </motion.div>
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
