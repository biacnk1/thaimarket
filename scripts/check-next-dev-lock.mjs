import { execFileSync } from "node:child_process";

if (process.platform !== "win32") {
  process.exit(0);
}

const cwd = process.cwd().toLowerCase();

function listWindowsProcesses() {
  try {
    const output = execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "Get-CimInstance Win32_Process | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress"
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );

    if (!output.trim()) {
      return [];
    }

    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

function isNextDevForThisRepo(processInfo) {
  const commandLine = String(processInfo.CommandLine ?? "");
  const normalized = commandLine.toLowerCase();

  if (!normalized.includes(cwd)) {
    return false;
  }

  return (
    /\bnext(?:\.cmd)?\s+dev\b/.test(normalized) ||
    /next[\\/]+dist[\\/]+bin[\\/]+next"?\s+dev\b/.test(normalized)
  );
}

const devProcesses = listWindowsProcesses().filter(isNextDevForThisRepo);

if (devProcesses.length > 0) {
  const processList = devProcesses
    .map((processInfo) => `  - PID ${processInfo.ProcessId}: ${processInfo.CommandLine}`)
    .join("\n");

  console.error(
    [
      "Cannot run `next build` while `next dev` is running for this repo on Windows.",
      "",
      "Both commands write to .next\\trace, and Windows keeps that file locked,",
      "which causes `EPERM: operation not permitted, open '.next\\trace'`.",
      "",
      "Stop the dev server, then rerun `npm run build`.",
      "",
      "Detected process:",
      processList
    ].join("\n")
  );
  process.exit(1);
}
