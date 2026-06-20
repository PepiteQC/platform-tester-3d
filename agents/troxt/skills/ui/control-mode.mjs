let CONTROL_MODE = false;

export function enableControlMode() {
  CONTROL_MODE = true;
  console.log("[TroxT][UI] Control mode ENABLED");
}

export function disableControlMode() {
  CONTROL_MODE = false;
  console.log("[TroxT][UI] Control mode DISABLED");
}

export function isControlModeEnabled() {
  return CONTROL_MODE;
}
