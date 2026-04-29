import esbuild from "esbuild";
import process from "node:process";
import { esBuildContext } from "./esbuild-build.ts";

(async () => {
  await server();
})().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});

export async function server() {
  const _context = await esbuild.context(esBuildContext);
  const { port } = await _context.serve({
    servedir: "static",
    port: 8080,
  });
  console.log(`http://localhost:${port}`);
}
