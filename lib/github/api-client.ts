/**
 * GitHub API Client
 *
 * Provides methods to interact with GitHub API using configured Personal Access Token
 * Fetches events, commits, issues, etc. for monitoring and logging purposes
 */

import { serviceApiRepository } from "@/lib/services";

export interface GitHubEvent {
  id: string;
  type: string;
  actor: {
    login: string;
    avatar_url: string;
  };
  repo: {
    name: string;
  };
  payload: any;
  created_at: string;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
  html_url: string;
}

export class GitHubApiClient {
  private token: string | null = null;

  /**
   * Initialize client with token from database
   */
  async init(): Promise<boolean> {
    try {
      const config = await serviceApiRepository.getConfig("github_api", "production");

      if (!config || !config.config.personalAccessToken) {
        console.warn("⚠️ [GitHub API] No token configured");
        return false;
      }

      this.token = config.config.personalAccessToken;
      return true;
    } catch (error) {
      console.error("❌ [GitHub API] Failed to load token:", error);
      return false;
    }
  }

  /**
   * Make authenticated request to GitHub API
   */
  private async request<T>(endpoint: string): Promise<T> {
    if (!this.token) {
      throw new Error("GitHub API client not initialized. Call init() first.");
    }

    const response = await fetch(`https://api.github.com${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `GitHub API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get recent events for authenticated user
   */
  async getUserEvents(username: string, limit: number = 30): Promise<GitHubEvent[]> {
    const events = await this.request<GitHubEvent[]>(`/users/${username}/events?per_page=${limit}`);
    return events;
  }

  /**
   * Get recent commits for a repository
   */
  async getRepoCommits(owner: string, repo: string, limit: number = 30): Promise<GitHubCommit[]> {
    const commits = await this.request<GitHubCommit[]>(
      `/repos/${owner}/${repo}/commits?per_page=${limit}`
    );
    return commits;
  }

  /**
   * Get organization events
   */
  async getOrgEvents(org: string, limit: number = 30): Promise<GitHubEvent[]> {
    const events = await this.request<GitHubEvent[]>(`/orgs/${org}/events?per_page=${limit}`);
    return events;
  }

  /**
   * Get authenticated user info
   */
  async getCurrentUser(): Promise<{
    login: string;
    name: string;
    email: string;
    avatar_url: string;
  }> {
    return this.request("/user");
  }

  /**
   * Get user's organizations
   */
  async getUserOrgs(): Promise<Array<{ login: string; avatar_url: string }>> {
    return this.request("/user/orgs");
  }

  /**
   * Get user's repositories
   */
  async getUserRepos(limit: number = 100): Promise<
    Array<{
      name: string;
      full_name: string;
      private: boolean;
      html_url: string;
      updated_at: string;
    }>
  > {
    return this.request(`/user/repos?per_page=${limit}&sort=updated`);
  }

  /**
   * Convert GitHub events to service usage logs format
   */
  eventToLog(event: GitHubEvent): {
    operation: string;
    status: string;
    requestData: any;
    responseData: any;
  } {
    return {
      operation: `github_${event.type.toLowerCase()}`,
      status: "success",
      requestData: {
        actor: event.actor.login,
        repo: event.repo.name,
        eventType: event.type,
      },
      responseData: {
        payload: event.payload,
        created_at: event.created_at,
      },
    };
  }

  /**
   * Track GitHub event as service usage
   */
  async trackEvent(event: GitHubEvent, configId: string): Promise<void> {
    const log = this.eventToLog(event);

    await serviceApiRepository.trackUsage({
      configId,
      serviceName: "github_api",
      operation: log.operation,
      status: log.status,
      statusCode: "200",
      requestData: log.requestData,
      responseData: log.responseData,
      responseTime: 0, // Not applicable for external events
    });
  }
}

// Export singleton instance
export const githubApi = new GitHubApiClient();
