import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appDir, "../../");
const rootEnvPath = path.join(repoRoot, ".env");

if (fs.existsSync(rootEnvPath)) {
  const envLines = fs.readFileSync(rootEnvPath, "utf8").split(/\r?\n/);
  for (const rawLine of envLines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const nextConfig = {
  output: "standalone",
  transpilePackages: ["@factory/core-sdk", "@factory/database", "@factory/ui-kit", "@factory/demo-child"]
};

export default nextConfig;
