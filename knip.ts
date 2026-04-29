import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: ["build/esbuild-build.ts", "build/esbuild-server.ts", "build/transform-yaml.ts", "static/scripts/demo/demo.ts", "static/scripts/logger.ts"],
  project: ["build/**/*.ts", "static/**/*.ts"],
  ignore: ["static/scripts/reference/*.ts"],
  ignoreExportsUsedInFile: true,
  ignoreDependencies: [
    "@commitlint/cli",
    "@octokit/core",
    "@octokit/plugin-create-or-update-text-file",
    "@openzeppelin/contracts",
    "@types/adm-zip",
    "@uniswap/permit2-sdk",
    "adm-zip",
    "esbuild-yaml",
    "eslint-config-prettier",
    "eslint-plugin-prettier",
    "ethers",
    "lint-staged",
  ],
};

export default config;
