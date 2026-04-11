import { NextRequest, NextResponse } from "next/server";
import { SDKError, useAuth } from "@factory/core-sdk";
import { findRegisteredAppBySlug } from "@factory/database";

const DEMO_USER_ID = "11111111-1111-1111-1111-111111111111";

function sdkErrorToResponse(error: SDKError) {
  if (error.code === "MANIFEST_NOT_FOUND") {
    return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: 404 });
  }

  if (error.code === "APP_DISABLED") {
    return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: 403 });
  }

  return NextResponse.json({ ok: false, code: error.code, error: error.message }, { status: 400 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const app = await findRegisteredAppBySlug(slug);

    if (!app || app.status !== "active") {
      return NextResponse.json(
        { ok: false, code: "MANIFEST_NOT_FOUND", error: "App not found or disabled" },
        { status: 404 }
      );
    }

    const userId = request.nextUrl.searchParams.get("userId") || DEMO_USER_ID;
    const auth = useAuth({ userId });
    const hasAccess = await auth.checkAccess(app.slug, app.category_id);

    return NextResponse.json({
      ok: true,
      data: {
        slug: app.slug,
        status: app.status,
        hasAccess
      }
    });
  } catch (error) {
    if (error instanceof SDKError) {
      return sdkErrorToResponse(error);
    }

    const message = error instanceof Error ? error.message : "Failed to check app access";
    return NextResponse.json({ ok: false, code: "INTERNAL_ERROR", error: message }, { status: 500 });
  }
}
