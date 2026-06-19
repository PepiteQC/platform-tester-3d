import { exec } from "child_process";

export function executeCommand(cmd) {
  return new Promise((resolve) => {
    console.log("[TroxT] Executing:", cmd);

    exec(cmd, (err, stdout, stderr) => {
      if (err) return resolve({ error: err.message });
      resolve({ stdout, stderr });
    });
  });
}
