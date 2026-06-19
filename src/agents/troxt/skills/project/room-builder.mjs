import { runCommand } from "../core/commands.mjs";

const PROJECT_PATH = "C:\\etherworldQC\\platform-tester-3d";

export function startDevServer() {
  return runCommand("npm run dev", PROJECT_PATH);
}

export function buildProject() {
  return runCommand("npm run build", PROJECT_PATH);
}
