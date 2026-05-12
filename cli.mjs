#!/usr/bin/env node
// ─────────────────────────────────────────────────
// Livong — Cross-Platform Project Management CLI
// Works on macOS, Windows, and Linux
// ─────────────────────────────────────────────────

import { execSync, spawn } from "child_process";
import { createInterface } from "readline";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import os from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = join(__dirname, "apps", "backend");
const ADMIN_BACKEND_DIR = join(__dirname, "apps", "admin-backend");
const WEB_DIR = join(__dirname, "apps", "web");
const ADMIN_DIR = join(__dirname, "apps", "admin");

const PLATFORM = os.platform(); // 'darwin', 'win32', 'linux'
const BACKEND_PORT = process.env.PORT || "6980";
const ADMIN_BACKEND_PORT = process.env.ADMIN_BACKEND_PORT || "6981";
const WEB_PORT = process.env.WEB_PORT || "6900";
const ADMIN_PORT = process.env.ADMIN_PORT || "6910";
const DB_URL =
  process.env.DATABASE_URL ||
  `postgres://${os.userInfo().username}@localhost:5432/livong?sslmode=disable`;
const JWT_SECRET = process.env.JWT_SECRET || "test-secret-livong";

// ── Colors ──────────────────────────────────────

const supportsColor = process.stdout.isTTY;
const c = {
  r: supportsColor ? "\x1b[0;31m" : "",
  g: supportsColor ? "\x1b[0;32m" : "",
  y: supportsColor ? "\x1b[0;33m" : "",
  b: supportsColor ? "\x1b[0;34m" : "",
  c: supportsColor ? "\x1b[0;36m" : "",
  bold: supportsColor ? "\x1b[1m" : "",
  nc: supportsColor ? "\x1b[0m" : "",
};

const info = (msg) => console.log(`${c.b}ℹ${c.nc} ${msg}`);
const ok = (msg) => console.log(`${c.g}✓${c.nc} ${msg}`);
const warn = (msg) => console.log(`${c.y}⚠${c.nc} ${msg}`);
const fail = (msg) => console.log(`${c.r}✗${c.nc} ${msg}`);
const title = (msg) =>
  console.log(`\n${c.bold}${c.c}━━━ ${msg} ━━━${c.nc}\n`);

// ── Helpers ─────────────────────────────────────

function isPortUsed(port) {
  try {
    if (PLATFORM === "win32") {
      const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return out.trim().length > 0;
    } else {
      execSync(`lsof -ti:${port}`, { stdio: ["pipe", "pipe", "pipe"] });
      return true;
    }
  } catch {
    return false;
  }
}

function killPort(port) {
  try {
    if (PLATFORM === "win32") {
      const out = execSync(
        `netstat -ano | findstr :${port} | findstr LISTENING`,
        { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
      );
      const lines = out.trim().split("\n");
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== "0") pids.add(pid);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: "pipe" });
        } catch {}
      }
    } else {
      const pids = execSync(`lsof -ti:${port}`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      if (pids) {
        execSync(`kill -9 ${pids.split("\n").join(" ")}`, { stdio: "pipe" });
      }
    }
    ok(`Killed process on port ${port}`);
  } catch {}
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Terminal Window Management ──────────────────

function openTerminal(tabTitle, cmd, cwd, env = {}) {
  const fullEnv = { ...process.env, ...env };

  // Build env prefix for inline shell commands
  const envPrefix = Object.entries(env)
    .map(([k, v]) => `export ${k}='${v.replace(/'/g, "'\\''")}'`)
    .join(" && ");
  const envAndCmd = envPrefix ? `${envPrefix} && ${cmd}` : cmd;

  if (PLATFORM === "darwin") {
    // macOS — open new Terminal.app window
    const escapedCmd = envAndCmd.replace(/\\/g, "\\\\\\\\").replace(/"/g, '\\\\"');
    const script = `tell application "Terminal"
  activate
  do script "printf '\\\\e]0;${tabTitle}\\\\a' && cd '${cwd.replace(/'/g, "'\\''")}' && ${escapedCmd}"
end tell`;
    execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
      stdio: "pipe",
    });
  } else if (PLATFORM === "win32") {
    // Windows — open new cmd window with title
    const envStr = Object.entries(env)
      .map(([k, v]) => `set "${k}=${v}" &&`)
      .join(" ");
    spawn("cmd.exe", ["/c", "start", `"${tabTitle}"`, "cmd", "/k", `cd /d "${cwd}" && ${envStr} ${cmd}`], {
      stdio: "ignore",
      detached: true,
      shell: true,
    }).unref();
  } else {
    // Linux — try common terminal emulators
    const terminals = [
      { cmd: "gnome-terminal", args: ["--title", tabTitle, "--", "bash", "-c", `cd '${cwd}' && ${envAndCmd}; exec bash`] },
      { cmd: "konsole", args: ["--title", tabTitle, "-e", "bash", "-c", `cd '${cwd}' && ${envAndCmd}; exec bash`] },
      { cmd: "xterm", args: ["-T", tabTitle, "-e", `cd '${cwd}' && ${envAndCmd}; exec bash`] },
    ];
    let launched = false;
    for (const t of terminals) {
      try {
        execSync(`which ${t.cmd}`, { stdio: "pipe" });
        spawn(t.cmd, t.args, { stdio: "ignore", detached: true, env: fullEnv }).unref();
        launched = true;
        break;
      } catch {}
    }
    if (!launched) {
      // Fallback: run in background in same terminal
      warn(`No GUI terminal found — running ${tabTitle} in background`);
      spawn("bash", ["-c", `cd '${cwd}' && ${cmd}`], {
        stdio: "ignore",
        detached: true,
        env: fullEnv,
      }).unref();
    }
  }
}

function closeTerminal(tabTitle) {
  try {
    if (PLATFORM === "darwin") {
      // Terminal.app window names change to show the running command,
      // so match on both the title we set AND common process names
      const keywords = [tabTitle];
      if (tabTitle.includes("Backend")) keywords.push("go run", "main.go");
      if (tabTitle.includes("Frontend")) keywords.push("next-server", "next dev", "pnpm dev");

      const conditions = keywords
        .map((k) => `name of w contains "${k}"`)
        .join(" or ");

      execSync(
        `osascript -e 'tell application "Terminal"
  repeat with w in (every window)
    repeat with t in (every tab of w)
      try
        if ${conditions} then
          do script "exit" in t
          delay 0.3
          close w
        end if
      end try
    end repeat
  end repeat
end tell'`,
        { stdio: "pipe" }
      );
    } else if (PLATFORM === "win32") {
      try {
        execSync(`taskkill /FI "WINDOWTITLE eq ${tabTitle}" /F`, { stdio: "pipe" });
      } catch {}
    }
    // Linux: killing the process is usually enough to close the terminal
  } catch {}
}

// ── Backend Commands ────────────────────────────

async function backendStart() {
  title("Starting Backend");
  if (isPortUsed(BACKEND_PORT)) {
    warn(`Backend already running on :${BACKEND_PORT}`);
    return;
  }

  const cmd = `go run main.go`;

  openTerminal("Livong Backend", cmd, BACKEND_DIR, {
    PORT: BACKEND_PORT,
    DATABASE_URL: DB_URL,
    JWT_SECRET: JWT_SECRET,
  });

  let attempts = 0;
  while (!isPortUsed(BACKEND_PORT) && attempts < 25) {
    await sleep(1000);
    attempts++;
  }

  if (isPortUsed(BACKEND_PORT)) {
    ok(`Backend running on :${BACKEND_PORT} (new terminal)`);
  } else {
    fail(`Backend failed to start (waited ${attempts}s)`);
  }
}

async function backendStop() {
  title("Stopping Backend");
  if (isPortUsed(BACKEND_PORT)) {
    killPort(BACKEND_PORT);
    closeTerminal("Livong Backend");
    await sleep(500);
    ok("Backend stopped & terminal closed");
  } else {
    warn("Backend not running");
  }
}

async function backendRestart() {
  title("Restarting Backend");
  await backendStop();
  await backendStart();
}

function backendLogs() {
  title("Backend Logs");
  if (isPortUsed(BACKEND_PORT)) {
    info(`Backend is running on :${BACKEND_PORT}`);
  } else {
    warn("Backend not running");
  }
}

// ── Admin Backend Commands ──────────────────────

async function adminBackendStart() {
  title("Starting Admin Backend");
  if (isPortUsed(ADMIN_BACKEND_PORT)) {
    warn(`Admin backend already running on :${ADMIN_BACKEND_PORT}`);
    return;
  }

  const cmd = `go run main.go`;

  openTerminal("Livong Admin Backend", cmd, ADMIN_BACKEND_DIR, {
    PORT: ADMIN_BACKEND_PORT,
    DATABASE_URL: DB_URL,
    JWT_SECRET: JWT_SECRET,
  });

  let attempts = 0;
  while (!isPortUsed(ADMIN_BACKEND_PORT) && attempts < 25) {
    await sleep(1000);
    attempts++;
  }

  if (isPortUsed(ADMIN_BACKEND_PORT)) {
    ok(`Admin backend running on :${ADMIN_BACKEND_PORT} (new terminal)`);
  } else {
    fail(`Admin backend failed to start (waited ${attempts}s)`);
  }
}

async function adminBackendStop() {
  title("Stopping Admin Backend");
  if (isPortUsed(ADMIN_BACKEND_PORT)) {
    killPort(ADMIN_BACKEND_PORT);
    closeTerminal("Livong Admin Backend");
    await sleep(500);
    ok("Admin backend stopped & terminal closed");
  } else {
    warn("Admin backend not running");
  }
}

async function adminBackendRestart() {
  title("Restarting Admin Backend");
  await adminBackendStop();
  await adminBackendStart();
}

// ── Web Commands ────────────────────────────────

async function webDev() {
  title("Starting Web (dev)");
  if (isPortUsed(WEB_PORT)) {
    warn(`Web already running on :${WEB_PORT}`);
    return;
  }

  const cmd = PLATFORM === "win32" ? "pnpm.cmd dev" : "pnpm dev";
  openTerminal("Livong Frontend", cmd, WEB_DIR, { PORT: WEB_PORT });

  let attempts = 0;
  while (!isPortUsed(WEB_PORT) && attempts < 25) {
    await sleep(1000);
    attempts++;
  }

  if (isPortUsed(WEB_PORT)) {
    ok(`Web dev server on :${WEB_PORT} (new terminal)`);
  } else {
    fail("Web failed to start");
  }
}

async function webStop() {
  title("Stopping Web");
  if (isPortUsed(WEB_PORT)) {
    killPort(WEB_PORT);
    closeTerminal("Livong Frontend");
    await sleep(500);
    ok("Web stopped & terminal closed");
  } else {
    warn("Web not running");
  }
}

async function webRestart() {
  title("Restarting Web (dev)");
  await webStop();
  await webDev();
}

function webBuild() {
  title("Building Web (production)");
  execSync(PLATFORM === "win32" ? "pnpm.cmd build" : "pnpm build", {
    cwd: WEB_DIR,
    stdio: "inherit",
  });
  ok(`Build complete → ${WEB_DIR}/.next`);
}

async function webProd() {
  title("Starting Web (production)");
  if (isPortUsed(WEB_PORT)) {
    warn(`Port ${WEB_PORT} in use — stopping first`);
    killPort(WEB_PORT);
    closeTerminal("Livong Frontend");
    await sleep(500);
  }
  if (!existsSync(join(WEB_DIR, ".next"))) {
    warn("No build found, building first...");
    webBuild();
  }
  const cmd = PLATFORM === "win32" ? "pnpm.cmd start" : "pnpm start";
  openTerminal("Livong Frontend", cmd, WEB_DIR, { PORT: WEB_PORT });

  let attempts = 0;
  while (!isPortUsed(WEB_PORT) && attempts < 10) {
    await sleep(1000);
    attempts++;
  }

  if (isPortUsed(WEB_PORT)) {
    ok(`Web production server on :${WEB_PORT} (new terminal)`);
  } else {
    fail("Web production failed to start");
  }
}

function webClean() {
  title("Cleaning Web");
  const nextDir = join(WEB_DIR, ".next");
  if (existsSync(nextDir)) {
    execSync(PLATFORM === "win32" ? `rmdir /s /q "${nextDir}"` : `rm -rf "${nextDir}"`, {
      stdio: "pipe",
    });
  }
  ok("Cleared .next cache");
}

function webLint() {
  title("Linting Web");
  execSync(PLATFORM === "win32" ? "pnpm.cmd lint" : "pnpm lint", {
    cwd: WEB_DIR,
    stdio: "inherit",
  });
}

function testBackend() {
  title("Testing Backend (go test)");
  execSync("go test ./...", {
    cwd: BACKEND_DIR,
    stdio: "inherit",
  });
}

function testWeb() {
  title("Testing Web (Playwright e2e)");
  execSync(PLATFORM === "win32" ? "pnpm.cmd test:e2e" : "pnpm test:e2e", {
    cwd: WEB_DIR,
    stdio: "inherit",
  });
}

function testAdmin() {
  title("Testing Admin Web (Playwright e2e)");
  execSync(PLATFORM === "win32" ? "pnpm.cmd test:e2e" : "pnpm test:e2e", {
    cwd: ADMIN_DIR,
    stdio: "inherit",
  });
}

function testAll() {
  testBackend();
  testWeb();
  testAdmin();
}

function webInstall() {
  title("Installing Web Dependencies");
  execSync(PLATFORM === "win32" ? "pnpm.cmd install" : "pnpm install", {
    cwd: WEB_DIR,
    stdio: "inherit",
  });
  ok("Dependencies installed");
}

// ── Admin Commands ───────────────────────────────

async function adminDev() {
  title("Starting Admin (dev)");
  if (isPortUsed(ADMIN_PORT)) {
    warn(`Admin already running on :${ADMIN_PORT}`);
    return;
  }

  const cmd = PLATFORM === "win32" ? "pnpm.cmd dev" : "pnpm dev";
  openTerminal("Livong Admin", cmd, ADMIN_DIR, { PORT: ADMIN_PORT, NEXT_PUBLIC_API_URL: `http://localhost:${ADMIN_BACKEND_PORT}` });

  let attempts = 0;
  while (!isPortUsed(ADMIN_PORT) && attempts < 25) {
    await sleep(1000);
    attempts++;
  }

  if (isPortUsed(ADMIN_PORT)) {
    ok(`Admin dev server on :${ADMIN_PORT} (new terminal)`);
  } else {
    fail("Admin failed to start");
  }
}

async function adminStop() {
  title("Stopping Admin");
  if (isPortUsed(ADMIN_PORT)) {
    killPort(ADMIN_PORT);
    closeTerminal("Livong Admin");
    await sleep(500);
    ok("Admin stopped & terminal closed");
  } else {
    warn("Admin not running");
  }
}

async function adminRestart() {
  title("Restarting Admin (dev)");
  await adminStop();
  await adminDev();
}

// ── Combined Commands ───────────────────────────

async function startAll() {
  await backendStart();
  await adminBackendStart();
  await webDev();
  await adminDev();
  showStatus();
}

async function stopAll() {
  await backendStop();
  await adminBackendStop();
  await webStop();
  await adminStop();
}

async function restartAll() {
  await stopAll();
  await startAll();
}

function showStatus() {
  title("Status");
  if (isPortUsed(BACKEND_PORT)) {
    ok(`Backend       → ${c.g}running${c.nc} on :${BACKEND_PORT}`);
  } else {
    fail(`Backend       → ${c.r}stopped${c.nc}`);
  }
  if (isPortUsed(ADMIN_BACKEND_PORT)) {
    ok(`Admin Backend → ${c.g}running${c.nc} on :${ADMIN_BACKEND_PORT}`);
  } else {
    fail(`Admin Backend → ${c.r}stopped${c.nc}`);
  }
  if (isPortUsed(WEB_PORT)) {
    ok(`Frontend      → ${c.g}running${c.nc} on :${WEB_PORT}`);
  } else {
    fail(`Frontend      → ${c.r}stopped${c.nc}`);
  }
  if (isPortUsed(ADMIN_PORT)) {
    ok(`Admin         → ${c.g}running${c.nc} on :${ADMIN_PORT}`);
  } else {
    fail(`Admin         → ${c.r}stopped${c.nc}`);
  }
}

async function fresh() {
  title("Fresh Start");
  await stopAll();
  webClean();
  webInstall();
  await startAll();
}

// ── Interactive Menu ────────────────────────────

async function interactiveMenu() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (prompt) =>
    new Promise((resolve) => rl.question(prompt, resolve));

  while (true) {
    console.log("");
    console.log(`${c.bold}${c.c}━━━ Livong CLI ━━━${c.nc}`);
    console.log("");

    // Live status
    if (isPortUsed(BACKEND_PORT)) {
      console.log(`  Backend       → ${c.g}● running${c.nc} :${BACKEND_PORT}`);
    } else {
      console.log(`  Backend       → ${c.r}○ stopped${c.nc}`);
    }
    if (isPortUsed(ADMIN_BACKEND_PORT)) {
      console.log(`  Admin Backend → ${c.g}● running${c.nc} :${ADMIN_BACKEND_PORT}`);
    } else {
      console.log(`  Admin Backend → ${c.r}○ stopped${c.nc}`);
    }
    if (isPortUsed(WEB_PORT)) {
      console.log(`  Frontend      → ${c.g}● running${c.nc} :${WEB_PORT}`);
    } else {
      console.log(`  Frontend      → ${c.r}○ stopped${c.nc}`);
    }
    if (isPortUsed(ADMIN_PORT)) {
      console.log(`  Admin         → ${c.g}● running${c.nc} :${ADMIN_PORT}`);
    } else {
      console.log(`  Admin         → ${c.r}○ stopped${c.nc}`);
    }

    console.log("");
    console.log(`${c.bold}  Pick a command:${c.nc}`);
    console.log("");
    console.log(`  ${c.g}1)${c.nc}  Start everything`);
    console.log(`  ${c.g}2)${c.nc}  Stop everything`);
    console.log(`  ${c.g}3)${c.nc}  Restart everything`);
    console.log(`  ${c.g}4)${c.nc}  Fresh start (clean + install + start)`);
    console.log("");
    console.log(`  ${c.b}5)${c.nc}  Start backend`);
    console.log(`  ${c.b}6)${c.nc}  Stop backend`);
    console.log(`  ${c.b}7)${c.nc}  Restart backend`);
    console.log("");
    console.log(`  ${c.y}8)${c.nc}  Start frontend (dev)`);
    console.log(`  ${c.y}9)${c.nc}  Stop frontend`);
    console.log(`  ${c.y}10)${c.nc} Restart frontend`);
    console.log(`  ${c.y}11)${c.nc} Build frontend (production)`);
    console.log(`  ${c.y}12)${c.nc} Clean .next cache`);
    console.log(`  ${c.y}13)${c.nc} Install dependencies`);
    console.log("");
    console.log(`  ${c.c}14)${c.nc} Start admin backend`);
    console.log(`  ${c.c}15)${c.nc} Stop admin backend`);
    console.log(`  ${c.c}16)${c.nc} Restart admin backend`);
    console.log("");
    console.log(`  ${c.c}17)${c.nc} Start admin frontend (dev)`);
    console.log(`  ${c.c}18)${c.nc} Stop admin frontend`);
    console.log(`  ${c.c}19)${c.nc} Restart admin frontend`);
    console.log("");
    console.log(`  ${c.r}0)${c.nc}  Exit`);
    console.log("");

    const choice = (await ask(`  ${c.bold}→ ${c.nc}`)).trim();

    try {
      switch (choice) {
        case "1":  await startAll(); break;
        case "2":  await stopAll(); break;
        case "3":  await restartAll(); break;
        case "4":  await fresh(); break;
        case "5":  await backendStart(); break;
        case "6":  await backendStop(); break;
        case "7":  await backendRestart(); break;
        case "8":  await webDev(); break;
        case "9":  await webStop(); break;
        case "10": await webRestart(); break;
        case "11": webBuild(); break;
        case "12": webClean(); break;
        case "13": webInstall(); break;
        case "14": await adminBackendStart(); break;
        case "15": await adminBackendStop(); break;
        case "16": await adminBackendRestart(); break;
        case "17": await adminDev(); break;
        case "18": await adminStop(); break;
        case "19": await adminRestart(); break;
        case "0": case "q": case "quit": case "exit":
          rl.close();
          await cleanup();
          break;
        default:
          warn("Invalid choice — try again");
      }
    } catch (err) {
      fail(err.message);
    }
  }
}

// ── CLI Router ──────────────────────────────────

const COMMANDS = {
  "server:start": backendStart,
  "server:stop": backendStop,
  "server:restart": backendRestart,
  "server:logs": backendLogs,
  "web:dev": webDev,
  "web:stop": webStop,
  "web:restart": webRestart,
  "web:build": webBuild,
  "web:prod": webProd,
  "web:clean": webClean,
  "web:lint": webLint,
  "web:install": webInstall,
  "admin:dev": adminDev,
  "admin:stop": adminStop,
  "admin:restart": adminRestart,
  "admin-server:start": adminBackendStart,
  "admin-server:stop": adminBackendStop,
  "admin-server:restart": adminBackendRestart,
  start: startAll,
  stop: stopAll,
  restart: restartAll,
  status: showStatus,
  fresh: fresh,
  test: testAll,
  "test:backend": testBackend,
  "test:web": testWeb,
  "test:admin": testAdmin,
  menu: interactiveMenu,
  interactive: interactiveMenu,
  help: interactiveMenu,
  "--help": interactiveMenu,
  "-h": interactiveMenu,
};

// ── Cleanup on exit (Ctrl+C, terminal close) ───

let cleaning = false;
async function cleanup() {
  if (cleaning) return;
  cleaning = true;
  console.log("");
  await stopAll();
  ok("Bye! 👋");
  console.log("");
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

const arg = process.argv[2];

if (!arg) {
  interactiveMenu();
} else if (COMMANDS[arg]) {
  const result = COMMANDS[arg]();
  if (result instanceof Promise) result.catch((e) => { fail(e.message); process.exit(1); });
} else {
  fail(`Unknown command: ${arg}`);
  process.exit(1);
}
