import robot from "robotjs";

export function mouseAction({ x, y, click }) {
  if (x !== undefined && y !== undefined) {
    robot.moveMouseSmooth(x, y);
  }
  if (click) {
    robot.mouseClick(click);
  }
}
