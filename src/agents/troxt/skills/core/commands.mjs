import { exec } from "child_process";

export function runCommand(cmd, cwd = process.cwd()) {
  return new Promise((resolve) => {
    console.log("[TroxT][CMD]", cmd, "in", cwd);
    exec(cmd, { cwd }, (err, stdout, stderr) => {
      if (err) return resolve({ error: err.message, stderr });
      resolve({ stdout, stderr });
    });
  });
}
