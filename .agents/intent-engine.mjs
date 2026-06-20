import { executeCommand } from "./control/command-executor.mjs";
import { mouseAction } from "./control/mouse-controller.mjs";
import { keyboardAction } from "./control/keyboard-controller.mjs";

export async function handleIntent(intent) {
  switch (intent.intent) {
    case "install_dependency":
      return installDependency(intent);

    case "open_file":
      return openFile(intent);

    case "run_script":
      return runScript(intent);

    case "click_ui":
      return clickUI(intent);

    case "type_text":
      return typeText(intent);

    default:
      console.log("[TroxT][Intent] Unknown intent:", intent.intent);
  }
}

async function installDependency({ manager = "npm", target, project_path }) {
  const cmd =
    manager === "yarn"
      ? cd "" && yarn add 
      : cd "" && npm install ;

  return await executeCommand(cmd);
}

async function openFile({ editor = "vscode", file_path }) {
  if (editor === "vscode") {
    const cmd = code "";
    return await executeCommand(cmd);
  }
}

async function runScript({ manager = "npm", script, project_path }) {
  const cmd =
    manager === "yarn"
      ? cd "" && yarn 
      : cd "" && npm run ;

  return await executeCommand(cmd);
}

async function clickUI({ x, y, button = "left" }) {
  return mouseAction({ x, y, click: button });
}

async function typeText({ text }) {
  return keyboardAction({ text });
}
