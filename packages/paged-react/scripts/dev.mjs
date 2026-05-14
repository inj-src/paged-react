import { spawn } from "node:child_process";
import { copyFileSync, mkdirSync, watchFile } from "node:fs";

mkdirSync("dist", { recursive: true });

function copyStyles() {
  copyFileSync("src/styles.css", "dist/styles.css");
}

copyStyles();
watchFile("src/styles.css", { interval: 200 }, copyStyles);

const child = spawn("tsc", ["-p", "tsconfig.json", "--watch", "--preserveWatchOutput"], {
  stdio: "inherit",
});

function stop() {
  child.kill("SIGINT");
  process.exit(0);
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => process.exit(code ?? 0));
