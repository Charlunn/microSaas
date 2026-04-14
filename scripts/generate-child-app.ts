import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateManifestOrThrow, type AppManifest } from "@factory/core-sdk";

type AccessType = "global" | "category" | "app";
type PaymentType = "none" | "checkout";

type Args = {
  slug: string;
  category: string;
  version: string;
  access: AccessType;
  payment: PaymentType;
  register: boolean;
  deploy: boolean;
  domain?: string;
  artifactPath?: string;
  baseUrl: string;
  adminToken?: string;
  adminEmail?: string;
  adminPassword?: string;
};

type ApiResult<T> = {
  ok: boolean;
  code?: string;
  error?: string;
  data?: T;
};

function parseArgs(argv: string[]): Args {
  const map = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--") continue;

    const value = argv[i + 1];
    if (key?.startsWith("--") && value && value !== "--") {
      map.set(key.slice(2), value);
      i += 1;
    }
  }

  const registerRaw = map.get("register") ?? "true";
  const deployRaw = map.get("deploy") ?? "false";

  return {
    slug: map.get("slug") ?? "",
    category: map.get("category") ?? "general",
    version: map.get("version") ?? "0.1.0",
    access: (map.get("access") ?? "app") as AccessType,
    payment: (map.get("payment") ?? "none") as PaymentType,
    register: registerRaw !== "false",
    deploy: deployRaw === "true",
    domain: map.get("domain")?.trim() || undefined,
    artifactPath: map.get("artifact-path")?.trim() || undefined,
    baseUrl: (map.get("base-url") ?? "http://localhost:3000").replace(/\/$/, ""),
    adminToken: map.get("admin-token")?.trim() || process.env.ADMIN_API_TOKEN?.trim() || undefined,
    adminEmail: map.get("admin-email")?.trim() || process.env.ADMIN_EMAIL?.trim() || undefined,
    adminPassword: map.get("admin-password")?.trim() || process.env.ADMIN_PASSWORD?.trim() || undefined
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

function buildHeaders(args: Args): HeadersInit {
  const headers: HeadersInit = { "content-type": "application/json" };
  if (args.adminToken) {
    headers.authorization = `Bearer ${args.adminToken}`;
  }
  return headers;
}

async function resolveAdminToken(baseUrl: string, args: Args): Promise<string | undefined> {
  if (args.adminToken) {
    return args.adminToken;
  }

  if (!args.adminEmail || !args.adminPassword) {
    return undefined;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return undefined;
  }

  try {
    const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: anonKey
      },
      body: JSON.stringify({
        email: args.adminEmail,
        password: args.adminPassword
      })
    });

    if (!authRes.ok) {
      return undefined;
    }

    const authJson = (await authRes.json()) as { access_token?: string };
    if (!authJson.access_token) {
      return undefined;
    }

    const sessionRes = await fetch(`${baseUrl}/api/admin/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accessToken: authJson.access_token })
    });

    if (!sessionRes.ok) {
      return undefined;
    }

    return authJson.access_token;
  } catch {
    return undefined;
  }
}

async function registerViaAdminApi(baseUrl: string, manifest: AppManifest, args: Args): Promise<ApiResult<{ id: string }>> {
  const payload = {
    appId: manifest.id,
    slug: manifest.slug,
    version: manifest.version,
    categoryId: manifest.categoryId,
    entryPath: manifest.entryPath,
    accessScopeType: manifest.access.scopeType,
    paymentCapability: manifest.capabilities.payment,
    status: "active" as const
  };

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/admin/apps`, {
      method: "POST",
      headers: buildHeaders(args),
      body: JSON.stringify(payload)
    });
  } catch {
    return {
      ok: false,
      code: "API_UNREACHABLE",
      error: `Cannot reach ${baseUrl}/api/admin/apps. Start server first: pnpm --filter main-landing dev`
    };
  }

  const json = (await response.json()) as {
    ok?: boolean;
    code?: string;
    error?: string;
    item?: { id: string };
  };

  if (!response.ok || !json.ok || !json.item?.id) {
    return {
      ok: false,
      code: json.code ?? "REGISTER_FAILED",
      error: json.error ?? "unknown error"
    };
  }

  return { ok: true, data: { id: json.item.id } };
}

async function uploadArtifact(baseUrl: string, appRegistryId: string, manifest: AppManifest, args: Args): Promise<ApiResult<{ id: string }>> {
  if (!args.artifactPath) {
    return {
      ok: false,
      code: "ARTIFACT_PATH_REQUIRED",
      error: "--artifact-path is required when --deploy true"
    };
  }

  const absolutePath = path.isAbsolute(args.artifactPath)
    ? args.artifactPath
    : path.join(process.cwd(), args.artifactPath);

  if (!fs.existsSync(absolutePath)) {
    return {
      ok: false,
      code: "ARTIFACT_NOT_FOUND",
      error: `artifact file not found: ${absolutePath}`
    };
  }

  const buffer = fs.readFileSync(absolutePath);
  const name = path.basename(absolutePath);
  const mimeType = name.endsWith(".zip")
    ? "application/zip"
    : name.endsWith(".tgz") || name.endsWith(".tar.gz")
      ? "application/gzip"
      : "application/octet-stream";

  const formData = new FormData();
  formData.set("manifest", JSON.stringify(manifest));
  formData.set("bundle", new File([buffer], name, { type: mimeType }));

  const headers: HeadersInit = {};
  if (args.adminToken) {
    headers.authorization = `Bearer ${args.adminToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/admin/apps/${appRegistryId}/artifacts`, {
      method: "POST",
      headers,
      body: formData
    });
  } catch {
    return { ok: false, code: "API_UNREACHABLE", error: "Cannot reach artifact upload API" };
  }

  const json = (await response.json()) as {
    ok?: boolean;
    code?: string;
    error?: string;
    item?: { id: string };
  };

  if (!response.ok || !json.ok || !json.item?.id) {
    return {
      ok: false,
      code: json.code ?? "UPLOAD_FAILED",
      error: json.error ?? "unknown error"
    };
  }

  return { ok: true, data: { id: json.item.id } };
}

async function createDeployment(baseUrl: string, appRegistryId: string, artifactId: string, args: Args): Promise<ApiResult<{ id: string; status: string }>> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/admin/apps/${appRegistryId}/deployments`, {
      method: "POST",
      headers: buildHeaders(args),
      body: JSON.stringify({ artifactId })
    });
  } catch {
    return { ok: false, code: "API_UNREACHABLE", error: "Cannot reach deployments API" };
  }

  const json = (await response.json()) as {
    ok?: boolean;
    code?: string;
    error?: string;
    item?: { id: string; status: string };
  };

  if (!response.ok || !json.ok || !json.item?.id) {
    return {
      ok: false,
      code: json.code ?? "DEPLOY_FAILED",
      error: json.error ?? "unknown error"
    };
  }

  return { ok: true, data: { id: json.item.id, status: json.item.status } };
}

async function getDeployment(baseUrl: string, appRegistryId: string, deploymentId: string, args: Args): Promise<ApiResult<{ status: string }>> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/admin/apps/${appRegistryId}/deployments/${deploymentId}`, {
      method: "GET",
      headers: args.adminToken ? { authorization: `Bearer ${args.adminToken}` } : {}
    });
  } catch {
    return { ok: false, code: "API_UNREACHABLE", error: "Cannot reach deployment status API" };
  }

  const json = (await response.json()) as {
    ok?: boolean;
    code?: string;
    error?: string;
    item?: { status: string };
  };

  if (!response.ok || !json.ok || !json.item?.status) {
    return {
      ok: false,
      code: json.code ?? "DEPLOY_STATUS_FAILED",
      error: json.error ?? "unknown error"
    };
  }

  return { ok: true, data: { status: json.item.status } };
}

async function assignDomain(baseUrl: string, appRegistryId: string, domain: string, args: Args): Promise<ApiResult<{ fqdn: string }>> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/admin/apps/${appRegistryId}/domain`, {
      method: "POST",
      headers: buildHeaders(args),
      body: JSON.stringify({ subdomain: domain })
    });
  } catch {
    return { ok: false, code: "API_UNREACHABLE", error: "Cannot reach domain API" };
  }

  const json = (await response.json()) as {
    ok?: boolean;
    code?: string;
    error?: string;
    item?: { fqdn: string };
  };

  if (!response.ok || !json.ok || !json.item?.fqdn) {
    return {
      ok: false,
      code: json.code ?? "DOMAIN_ASSIGN_FAILED",
      error: json.error ?? "unknown error"
    };
  }

  return { ok: true, data: { fqdn: json.item.fqdn } };
}

async function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(here, "../");
  const args = parseArgs(process.argv.slice(2));
  const resolvedToken = await resolveAdminToken(args.baseUrl, args);
  if (resolvedToken) {
    args.adminToken = resolvedToken;
  }

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

  const manifestPath = path.join(appDir, "manifest.ts");
  const packagePath = path.join(appDir, "package.json");
  const tsconfigPath = path.join(appDir, "tsconfig.json");

  fs.writeFileSync(manifestPath, replaceAll(manifestTpl, replacements));
  fs.writeFileSync(packagePath, replaceAll(packageTpl, replacements));
  fs.writeFileSync(tsconfigPath, tsconfigTpl);

  let registrationResult = "skipped";
  let registrationCode: string | undefined;
  let registrationError: string | undefined;
  let deploymentStatus: string | undefined;
  let domainUrl: string | undefined;

  let appRegistryId: string | undefined;
  if (args.register || args.deploy) {
    const registerResult = await registerViaAdminApi(args.baseUrl, manifest, args);
    if (registerResult.ok && registerResult.data?.id) {
      registrationResult = "success";
      appRegistryId = registerResult.data.id;
    } else {
      registrationResult = "failed";
      registrationCode = registerResult.code;
      registrationError = registerResult.error;
    }
  }

  if (args.deploy && appRegistryId) {
    const uploadResult = await uploadArtifact(args.baseUrl, appRegistryId, manifest, args);

    if (uploadResult.ok && uploadResult.data?.id) {
      const deployResult = await createDeployment(args.baseUrl, appRegistryId, uploadResult.data.id, args);
      if (deployResult.ok && deployResult.data?.id) {
        const statusResult = await getDeployment(args.baseUrl, appRegistryId, deployResult.data.id, args);
        if (statusResult.ok && statusResult.data) {
          deploymentStatus = statusResult.data.status;
        }
      }
    }

    if (args.domain) {
      const domainResult = await assignDomain(args.baseUrl, appRegistryId, args.domain, args);
      if (domainResult.ok && domainResult.data) {
        domainUrl = `https://${domainResult.data.fqdn}`;
      }
    }
  }

  const appUrl = `${args.baseUrl}/apps/${args.slug}`;
  const listUrl = `${args.baseUrl}/api/apps`;
  const accessUrl = `${args.baseUrl}/api/apps/${args.slug}/access`;

  console.log(`Generated child app scaffold at apps/${args.slug}`);
  console.log(`Files:`);
  console.log(`- ${manifestPath}`);
  console.log(`- ${packagePath}`);
  console.log(`- ${tsconfigPath}`);
  console.log(`Registration: ${registrationResult}`);
  if (registrationCode) {
    console.log(`Registration code: ${registrationCode}`);
  }
  if (registrationError) {
    console.log(`Registration error: ${registrationError}`);
  }
  if (deploymentStatus) {
    console.log(`Deployment status: ${deploymentStatus}`);
  }
  if (domainUrl) {
    console.log(`Domain URL: ${domainUrl}`);
  }
  console.log(`Links:`);
  console.log(`- App: ${appUrl}`);
  console.log(`- Registry API: ${listUrl}`);
  console.log(`- Access API: ${accessUrl}`);
  console.log(`Next: pnpm --filter @factory/${args.slug} typecheck`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
