import { runCommand } from "../core/commands.mjs";

const PROJECT_PATH = "C:\\etherworldQC\\platform-tester-3d";

export function installDependency(pkg, manager = "npm") {
  const cmd =
    manager === "yarn"
      ? yarn add 
      : 
pm install ;
  return runCommand(cmd, PROJECT_PATH);
}

export function installThree() {
  return installDependency("three");
}
