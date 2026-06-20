import robot from "robotjs";

export function keyboardAction({ text }) {
  robot.typeString(text);
}
