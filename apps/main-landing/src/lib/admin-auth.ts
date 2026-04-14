import { createClient } from "@supabase/supabase-js";
import { getAdminUserByEmail } from "@factory/database";
import { NextRequest, NextResponse } from "next/server";

export type AdminScope =
  | "apps:read"
  | "apps:write"
  | "deploy:read"
  | "deploy:write"
  | "domains:write"
  | "metrics:read"
  | "settings:write"
  | "catalog:read"
  | "catalog:write"
  | "orders:read"
  | "users:read";

const DEFAULT_SCOPES: AdminScope[] = [
  "apps:read",
  "apps:write",
  "deploy:read",
  "deploy:write",
  "domains:write",
  "metrics:read",
  "settings:write",
  "catalog:read",
  "catalog:write",
  "orders:read",
  "users:read"
];

export type AdminIdentity = {
  userId: string;
  email: string;
  scopes: Set<AdminScope>;
};

function parseBearerToken(header: string | null): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token.trim();
}

function parseScopes(raw: string[] | null | undefined): Set<AdminScope> {
  if (!raw || raw.length === 0) {
    return new Set(DEFAULT_SCOPES);
  }

  const scopes = raw
    .map((scope) => scope.trim())
    .filter(Boolean)
    .filter((scope): scope is AdminScope => DEFAULT_SCOPES.includes(scope as AdminScope));

  return new Set(scopes.length > 0 ? scopes : DEFAULT_SCOPES);
}

function errorResponse(status: number, code: string, error: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, code, error, details }, { status });
}

function createAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY for admin auth.");
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function getConfiguredScopes(): Set<AdminScope> {
  const raw = process.env.ADMIN_API_SCOPES?.trim();
  if (!raw) {
    return new Set(DEFAULT_SCOPES);
  }

  const scopes = raw
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean)
    .filter((scope): scope is AdminScope => DEFAULT_SCOPES.includes(scope as AdminScope));

  return new Set(scopes.length > 0 ? scopes : DEFAULT_SCOPES);
}

function readRequestToken(request: NextRequest): string | null {
  const bearer = parseBearerToken(request.headers.get("authorization"));
  if (bearer) return bearer;

  const cookieToken = request.cookies.get("admin_access_token")?.value?.trim();
  return cookieToken || null;
}

export async function getAdminIdentity(request: NextRequest): Promise<AdminIdentity | null> {
  const configuredToken = process.env.ADMIN_API_TOKEN?.trim();
  const token = readRequestToken(request);
  if (!token) return null;

  if (configuredToken && token === configuredToken) {
    return {
      userId: "token-admin",
      email: "token-admin@local",
      scopes: getConfiguredScopes()
    };
  }

  const supabase = createAuthClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) {
    return null;
  }

  const adminUser = await getAdminUserByEmail(data.user.email);
  if (!adminUser || adminUser.status !== "active") {
    return null;
  }

  return {
    userId: adminUser.id,
    email: adminUser.email,
    scopes: parseScopes(adminUser.scopes)
  };
}

export async function enforceAdminScopes(
  request: NextRequest,
  requiredScopes: AdminScope[]
): Promise<NextResponse | null> {
  const identity = await getAdminIdentity(request);
  if (!identity) {
    return errorResponse(401, "UNAUTHORIZED", "Admin login required");
  }

  const missingScopes = requiredScopes.filter((scope) => !identity.scopes.has(scope));
  if (missingScopes.length > 0) {
    return errorResponse(403, "FORBIDDEN", "Admin does not include required scopes", {
      requiredScopes,
      missingScopes
    });
  }

  return null;
}
