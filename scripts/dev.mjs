import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const command = isWindows ? (process.env.ComSpec || "cmd.exe") : "tsx";
const args = isWindows
  ? ["/d", "/s", "/c", "tsx watch server/_core/index.ts"]
  : ["watch", "server/_core/index.ts"];

const child = spawn(command, args, {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "development" },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
