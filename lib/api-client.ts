/**
 * VMailx — API Client Helper
 *
 * Automatically attaches x-workspace-id header for all internal API calls.
 */

export class ApiClient {
  static getWorkspaceId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("workspace-id");
  }

  static setWorkspaceId(id: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("workspace-id", id);
    }
  }

  static async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    const workspaceId = this.getWorkspaceId();
    
    if (workspaceId && !headers.has("x-workspace-id")) {
      headers.set("x-workspace-id", workspaceId);
    }
    
    // Add default content-type for JSON if not FormData
    if (
      !headers.has("Content-Type") &&
      options.body &&
      typeof options.body === "string"
    ) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      let error = "API Request Failed";
      try {
        const data = await response.json();
        error = data.message || error;
      } catch {
        // Not JSON
      }
      throw new Error(error);
    }
    
    return response;
  }
}
