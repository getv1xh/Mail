/**
 * VMailx — Stalwart Admin API Client
 *
 * Handles account/domain/alias provisioning via Stalwart's REST admin API.
 * Docs: https://stalw.art/docs/management/api
 *
 * All methods are called only from the service layer — never directly from routes.
 */

import { ExternalServiceError } from "@/lib/errors";

export interface StalwartAdminConfig {
  adminUrl: string;
  adminToken: string;
}

export class StalwartAdminClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: StalwartAdminConfig) {
    this.baseUrl = config.adminUrl.replace(/\/$/, "");
    this.headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.adminToken}`,
    };
  }

  // ─── Accounts ──────────────────────────────────────────────────────────────

  async createAccount(params: {
    email: string;
    displayName: string;
    password: string;
    quotaMb?: number;
  }): Promise<string> {
    const body = {
      type: "individual",
      name: params.email,
      displayName: params.displayName,
      secrets: [params.password],
      ...(params.quotaMb && { quota: params.quotaMb * 1024 * 1024 }),
    };

    const res = await this.request("POST", "/api/v1/principal", body);
    const data = await res.json();
    // Stalwart returns the principal ID in the response
    if (!data?.id) {
      throw new ExternalServiceError("Stalwart did not return a principal ID", data);
    }
    return data.id as string;
  }

  async updateAccount(
    id: string,
    params: {
      displayName?: string;
      isActive?: boolean;
      quotaMb?: number;
    }
  ): Promise<void> {
    const body: Record<string, unknown> = {};
    if (params.displayName !== undefined) body.displayName = params.displayName;
    if (params.isActive !== undefined) body.enabled = params.isActive;
    if (params.quotaMb !== undefined) body.quota = params.quotaMb * 1024 * 1024;

    await this.request("PATCH", `/api/v1/principal/${encodeURIComponent(id)}`, body);
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    await this.request(
      "PATCH",
      `/api/v1/principal/${encodeURIComponent(id)}`,
      { secrets: [newPassword] }
    );
  }

  async deleteAccount(id: string): Promise<void> {
    await this.request(
      "DELETE",
      `/api/v1/principal/${encodeURIComponent(id)}`
    );
  }

  // ─── Aliases ───────────────────────────────────────────────────────────────

  async addAlias(accountId: string, alias: string): Promise<void> {
    await this.request(
      "PATCH",
      `/api/v1/principal/${encodeURIComponent(accountId)}`,
      { addAliases: [alias] }
    );
  }

  async removeAlias(accountId: string, alias: string): Promise<void> {
    await this.request(
      "PATCH",
      `/api/v1/principal/${encodeURIComponent(accountId)}`,
      { removeAliases: [alias] }
    );
  }

  // ─── Domains ───────────────────────────────────────────────────────────────

  async addDomain(domain: string): Promise<void> {
    await this.request("POST", "/api/v1/principal", {
      type: "domain",
      name: domain,
    });
  }

  async removeDomain(domain: string): Promise<void> {
    await this.request(
      "DELETE",
      `/api/v1/principal/${encodeURIComponent(domain)}`
    );
  }

  // ─── Internal Request Helper ───────────────────────────────────────────────

  private async request(
    method: string,
    path: string,
    body?: unknown
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;

    const res = await fetch(url, {
      method,
      headers: this.headers,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });

    if (!res.ok) {
      let detail: unknown;
      try {
        detail = await res.json();
      } catch {
        detail = await res.text();
      }
      throw new ExternalServiceError(
        `Stalwart Admin API error: ${method} ${path} → ${res.status}`,
        detail
      );
    }

    return res;
  }
}
