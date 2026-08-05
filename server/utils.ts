import { randomBytes } from "node:crypto";

export function generateId(length: number): string {
  return randomBytes(length).toString("hex").slice(0, length);
}
