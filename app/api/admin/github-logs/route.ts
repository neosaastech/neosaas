import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth/admin-auth";
import { githubApi } from "@/lib/github/api-client";
import { serviceApiRepository } from "@/lib/services";

/**
 * API Route to fetch GitHub logs and events
 *
 * GET /api/admin/github-logs
 *
 * Query params:
 * - type: "user" | "org" | "repo"
 * - target: username, org name, or "owner/repo"
 * - limit: number of events (default: 30)
 *
 * Access: Admin only
 */

export async function GET(request: NextRequest) {
  console.log("📊 [GitHub Logs] Fetching logs...");

  // Check admin auth
  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "user";
    const target = searchParams.get("target");
    const limit = parseInt(searchParams.get("limit") || "30");

    // Initialize GitHub API client
    const initialized = await githubApi.init();

    if (!initialized) {
      return NextResponse.json(
        {
          success: false,
          error: "GitHub API not configured. Please configure a Personal Access Token in /admin/api",
        },
        { status: 503 }
      );
    }

    console.log(`📡 [GitHub Logs] Fetching ${type} events (limit: ${limit})`);

    let events = [];
    let userData = null;

    if (type === "user") {
      // Get current user if no target specified
      if (!target) {
        userData = await githubApi.getCurrentUser();
        events = await githubApi.getUserEvents(userData.login, limit);
      } else {
        events = await githubApi.getUserEvents(target, limit);
      }
    } else if (type === "org" && target) {
      events = await githubApi.getOrgEvents(target, limit);
    } else if (type === "repo" && target) {
      const [owner, repo] = target.split("/");
      if (!owner || !repo) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid repo format. Use 'owner/repo'",
          },
          { status: 400 }
        );
      }
      const commits = await githubApi.getRepoCommits(owner, repo, limit);

      // Convert commits to event-like format
      events = commits.map((commit) => ({
        id: commit.sha,
        type: "CommitEvent",
        actor: commit.author || { login: commit.commit.author.name, avatar_url: "" },
        repo: { name: target },
        payload: {
          message: commit.commit.message,
          url: commit.html_url,
        },
        created_at: commit.commit.author.date,
      }));
    }

    console.log(`✅ [GitHub Logs] Fetched ${events.length} events`);

    // Optionally, save events to database for historical tracking
    if (searchParams.get("save") === "true") {
      const config = await serviceApiRepository.getConfig("github_api", "production");
      if (config && (config as any).id) {
        console.log(`💾 [GitHub Logs] Saving events to database...`);

        for (const event of events.slice(0, 10)) {
          // Save first 10 events
          await githubApi.trackEvent(event, (config as any).id);
        }

        console.log(`✅ [GitHub Logs] Saved ${Math.min(10, events.length)} events`);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          events,
          user: userData,
          count: events.length,
          type,
          target: target || userData?.login,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ [GitHub Logs] Error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch GitHub logs",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/github-logs/sync
 * Sync GitHub events to database for historical tracking
 */
export async function POST(request: NextRequest) {
  console.log("🔄 [GitHub Logs Sync] Starting sync...");

  const authResult = await requireAdminAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { type = "user", target, limit = 100 } = body;

    // Initialize GitHub API client
    const initialized = await githubApi.init();

    if (!initialized) {
      return NextResponse.json(
        {
          success: false,
          error: "GitHub API not configured",
        },
        { status: 503 }
      );
    }

    // Get config ID for tracking
    const config = await serviceApiRepository.getConfig("github_api", "production");
    if (!config || !(config as any).id) {
      return NextResponse.json(
        {
          success: false,
          error: "GitHub API configuration not found",
        },
        { status: 404 }
      );
    }

    console.log(`📡 [GitHub Logs Sync] Fetching events...`);

    let events = [];

    if (type === "user") {
      const userData = target || (await githubApi.getCurrentUser()).login;
      events = await githubApi.getUserEvents(userData, limit);
    } else if (type === "org" && target) {
      events = await githubApi.getOrgEvents(target, limit);
    }

    console.log(`💾 [GitHub Logs Sync] Saving ${events.length} events...`);

    let savedCount = 0;
    for (const event of events) {
      try {
        await githubApi.trackEvent(event, (config as any).id);
        savedCount++;
      } catch (error) {
        console.error(`⚠️ [GitHub Logs Sync] Failed to save event ${event.id}`);
      }
    }

    console.log(`✅ [GitHub Logs Sync] Saved ${savedCount}/${events.length} events`);

    return NextResponse.json(
      {
        success: true,
        message: `Synced ${savedCount} GitHub events`,
        details: {
          total: events.length,
          saved: savedCount,
          failed: events.length - savedCount,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ [GitHub Logs Sync] Error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to sync GitHub logs",
      },
      { status: 500 }
    );
  }
}
