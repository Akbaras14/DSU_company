import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
if (existsSync(".env")) process.loadEnvFile(".env");
const children = [
  spawn(process.execPath, ["--import", "tsx", "--watch", "apps/api/src/server.ts"], { stdio: "inherit", windowsHide: true }),
  spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "apps/web", "--port", "3000"], { stdio: "inherit", windowsHide: true }),
];
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; for (const child of children) child.kill(); process.exitCode = code; }
for (const child of children) child.on("exit", (code) => stop(code ?? 1));
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
