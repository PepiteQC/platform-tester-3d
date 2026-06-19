import fs from "fs";
import path from "path";

export function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

export function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

export function fileExists(filePath) {
  return fs.existsSync(filePath);
}
