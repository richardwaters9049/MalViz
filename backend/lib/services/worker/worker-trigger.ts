import { closeSync, existsSync, mkdirSync, openSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

export type WorkerTriggerResult = {
  triggered: boolean;
  warning?: string;
};

export function triggerWorkerOnce(): WorkerTriggerResult {
  if (process.env.MALVIZ_AUTO_TRIGGER_WORKER === "false") {
    return { triggered: true };
  }

  const root = process.cwd();
  const workerRoot = join(root, "backend/worker/python");
  const venvPython = join(workerRoot, ".venv/bin/python");
  const python = existsSync(venvPython) ? venvPython : "python3";
  const mainScript = join(workerRoot, "main.py");

  if (!existsSync(mainScript)) {
    return {
      triggered: false,
      warning: "Worker script was not found. Run bun run worker:python from the project root.",
    };
  }

  try {
    mkdirSync(join(root, ".malviz"), { recursive: true });
    const logFd = openSync(join(root, ".malviz/worker.log"), "a");
    const child = spawn(python, [mainScript, "--once"], {
      cwd: root,
      detached: true,
      env: {
        ...process.env,
        PYTHONPATH: workerRoot,
      },
      // Local MVP bridge: write one-shot worker output into the same log as the long-running worker.
      stdio: ["ignore", logFd, logFd],
    });

    child.unref();
    closeSync(logFd);

    return { triggered: true };
  } catch (error) {
    return {
      triggered: false,
      warning: error instanceof Error ? error.message : "Unable to start the scan worker.",
    };
  }
}
