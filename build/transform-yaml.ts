/**
 * @fileoverview Script to transform a YAML configuration file into a TypeScript module. Needed to include the default configuration in the browser build.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

function getScriptDir(): string {
  return typeof import.meta.dir === "string" ? import.meta.dir : path.dirname(fileURLToPath(import.meta.url));
}

async function main() {
  const scriptDir = getScriptDir();
  const inputPath = path.resolve(scriptDir, "../static/types/default-configuration.yml");
  const outputPath = path.resolve(scriptDir, "../static/types/default-configuration.ts");

  let yamlText: string;
  try {
    yamlText = await fs.readFile(inputPath, "utf8");
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read YAML file at: ${inputPath}\n${details}`);
  }
  let parsed: unknown;
  try {
    parsed = YAML.parse(yamlText);
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse YAML from ${inputPath}: ${details}`);
  }

  if (parsed === null || typeof parsed !== "object") {
    throw new Error(`Unexpected YAML root type from ${inputPath}`);
  }
  if (!("plugins" in parsed) || typeof parsed.plugins !== "object" || parsed.plugins === null) {
    throw new Error(`YAML file at ${inputPath} must contain a 'plugins' object`);
  }

  const json = JSON.stringify(parsed, null, 2);
  const out = ["export const defaultConfiguration: { plugins: Record<string, unknown> } = ", json, ";\n", "export default defaultConfiguration;\n"].join("");

  await fs.writeFile(outputPath, out, "utf8");
  process.stdout.write(`Generated ${outputPath}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(String(error instanceof Error ? (error.stack ?? error.message) : error));
  process.stderr.write("\n");
  process.exitCode = 1;
});
