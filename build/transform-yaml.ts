/**
 * @fileoverview Script to transform a YAML configuration file into a TypeScript module. Needed to include the default configuration in the browser build.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";
import YAML from "yaml";

function getScriptDir(): string {
  return path.dirname(fileURLToPath(import.meta.url));
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
  const out = ["const defaultConfiguration: { plugins: Record<string, unknown> } = ", json, ";\n", "export default defaultConfiguration;\n"].join("");
  const formatted = await prettier.format(out, { parser: "typescript", printWidth: 160, trailingComma: "es5" });

  await fs.writeFile(outputPath, formatted, "utf8");
  process.stdout.write(`Generated ${outputPath}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(String(error instanceof Error ? (error.stack ?? error.message) : error));
  process.stderr.write("\n");
  process.exitCode = 1;
});
