import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/admin-auth";

/**
 * API Route to test GitHub Personal Access Token
 *
 * Tests the token by making a request to GitHub API
 *
 * Access: Admin only
 */

export async function POST(request: NextRequest) {
  console.log("🔍 [GitHub API Test] Testing token...");

  // Check admin auth
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { personalAccessToken } = body;

    if (!personalAccessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Personal Access Token is required",
        },
        { status: 400 }
      );
    }

    console.log("📡 [GitHub API Test] Making test request to GitHub...");

    // Test token by fetching authenticated user
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${personalAccessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ [GitHub API Test] Invalid token");
      return NextResponse.json(
        {
          success: false,
          error: errorData.message || "Invalid token",
        },
        { status: 401 }
      );
    }

    const user = await response.json();

    // Check scopes
    const scopeHeader = response.headers.get("x-oauth-scopes") || "";
    const scopes = scopeHeader.split(",").map((s) => s.trim()).filter(Boolean);

    console.log("✅ [GitHub API Test] Token valid");
    console.log(`   - User: ${user.login}`);
    console.log(`   - Scopes: ${scopes.join(", ")}`);

    return NextResponse.json(
      {
        success: true,
        message: "Token is valid",
        user: {
          login: user.login,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
        },
        scopes,
        details: {
          hasRepoScope: scopes.includes("repo") || scopes.includes("public_repo"),
          hasOrgScope: scopes.includes("read:org") || scopes.includes("admin:org"),
          hasUserScope: scopes.includes("read:user") || scopes.includes("user"),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ [GitHub API Test] Error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to test token",
      },
      { status: 500 }
    );
  }
}
