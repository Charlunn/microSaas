import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateManifestOrThrow, type AppManifest } from "@factory/core-sdk";

type AccessType = "global" | "category" | "app";
type PaymentType = "none" | "checkout";

function parseArgs(argv: string[]) {
  const map = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--") {
      continue;
    }

    const value = argv[i + 1];
    if (key?.startsWith("--") && value && value !== "--") {
      map.set(key.slice(2), value);
      i += 1;
    }
  }

  return {
    slug: map.get("slug") ?? "",
    category: map.get("category") ?? "general",
    version: map.get("version") ?? "0.1.0",
    access: (map.get("access") ?? "app") as AccessType,
    payment: (map.get("payment") ?? "none") as PaymentType
  };
}

function replaceAll(input: string, replacements: Record<string, string>) {
  return Object.entries(replacements).reduce(
    (acc, [key, value]) => acc.replaceAll(`__${key}__`, value),
    input
  );
}

function readTemplate(repoRoot: string, filename: string) {
  return fs.readFileSync(path.join(repoRoot, "templates", "child-app", filename), "utf8");
}

function ensureNotExists(targetPath: string) {
  if (fs.existsSync(targetPath)) {
    throw new Error(`Target already exists: ${targetPath}`);
  }
}

function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(here, "../");
  const args = parseArgs(process.argv.slice(2));

  if (!args.slug) {
    throw new Error("Missing required --slug");
  }

  const manifest: AppManifest = {
    id: args.slug,
    slug: args.slug,
    version: args.version,
    categoryId: args.category,
    entryPath: `/apps/${args.slug}`,
    access: { scopeType: args.access },
    capabilities: { payment: args.payment }
  };

  validateManifestOrThrow(manifest);

  const appDir = path.join(repoRoot, "apps", args.slug);
  ensureNotExists(appDir);
  fs.mkdirSync(appDir, { recursive: true });

  const replacements = {
    APP_ID: args.slug,
    SLUG: args.slug,
    VERSION: args.version,
    CATEGORY: args.category,
    ACCESS: args.access,
    PAYMENT: args.payment
  };

  const manifestTpl = readTemplate(repoRoot, "manifest.ts.tpl");
  const packageTpl = readTemplate(repoRoot, "package.json.tpl");
  const tsconfigTpl = readTemplate(repoRoot, "tsconfig.json.tpl");

  fs.writeFileSync(path.join(appDir, "manifest.ts"), replaceAll(manifestTpl, replacements));
  fs.writeFileSync(path.join(appDir, "package.json"), replaceAll(packageTpl, replacements));
  fs.writeFileSync(path.join(appDir, "tsconfig.json"), tsconfigTpl);

  console.log(`Generated child app scaffold at apps/${args.slug}`);
  console.log(`Next: pnpm --filter @factory/${args.slug} typecheck`);
}

main();
