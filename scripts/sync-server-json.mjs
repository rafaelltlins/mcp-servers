// Copies each package version into its server.json so the MCP Registry metadata
// never drifts from the version published to npm.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const packagesDir = fileURLToPath(new URL("../packages/", import.meta.url));

for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const serverJsonPath = join(packagesDir, entry.name, "server.json");
  if (!existsSync(serverJsonPath)) continue;

  const { name, version } = JSON.parse(readFileSync(join(packagesDir, entry.name, "package.json"), "utf8"));
  const serverJson = JSON.parse(readFileSync(serverJsonPath, "utf8"));

  serverJson.version = version;
  for (const pkg of serverJson.packages ?? []) {
    if (pkg.identifier === name) pkg.version = version;
  }

  writeFileSync(serverJsonPath, `${JSON.stringify(serverJson, null, 2)}\n`);
  console.log(`${entry.name}: server.json -> ${version}`);
}
