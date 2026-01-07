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

  const yamlText = await fs.readFile(inputPath, "utf8");
  const parsed = YAML.parse(yamlText);

  if (parsed === null || typeof parsed !== "object") {
    throw new Error(`Unexpected YAML root type from ${inputPath}`);
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
