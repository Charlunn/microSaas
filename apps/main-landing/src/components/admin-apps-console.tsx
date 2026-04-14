"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

type RegistryItem = {
  id: string;
  app_id: string;
  slug: string;
  version: string;
  category_id: string;
  entry_path: string;
  access_scope_type: "global" | "category" | "app";
  payment_capability: "none" | "checkout";
  status: "active" | "disabled";
};

type DeploymentRecord = {
  id: string;
  status: "queued" | "running" | "success" | "failed";
  error_message: string | null;
  commit_sha: string | null;
  preview_url: string | null;
  production_url: string | null;
  updated_at: string;
};

type DomainRecord = {
  id: string;
  subdomain: string;
  fqdn: string;
  status: "active" | "disabled";
};

type OverviewMetrics = {
  totalMrr: number;
  activeApps: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalOrders: number;
  paidOrders: number;
  grossRevenueCents: number;
};

type AppMetric = {
  id: string;
  slug: string;
  status: "active" | "disabled";
  payment_capability: "none" | "checkout";
  deployment_status: DeploymentRecord["status"] | null;
  deployment_error: string | null;
  domain: string | null;
  mrr_usd: number;
  order_count: number;
  paid_order_count: number;
};

type PaymentSettings = {
  defaultPaymentCapability: "none" | "checkout";
  checkoutEnabled: boolean;
  callbackBaseUrl: string;
};

type ProductRecord = {
  id: string;
  app_registry_id: string;
  slug: string;
  name: string;
  status: "active" | "disabled";
};

type PriceRecord = {
  id: string;
  product_id: string;
  amount_cents: number;
  currency: string;
  interval: "one_time" | "month" | "year";
  status: "active" | "disabled";
};

type UserRecord = {
  id: string;
  email: string;
  display_name: string | null;
};

type OrderRecord = {
  id: string;
  user_id: string;
  app_registry_id: string;
  status: "pending" | "paid" | "canceled" | "refunded";
  total_amount_cents: number;
  currency: string;
};

const defaultForm = {
  appId: "",
  slug: "",
  version: "0.1.0",
  categoryId: "",
  entryPath: "/apps/",
  accessScopeType: "app" as const,
  paymentCapability: "none" as const
};

const defaultPaymentSettings: PaymentSettings = {
  defaultPaymentCapability: "none",
  checkoutEnabled: true,
  callbackBaseUrl: ""
};

export function AdminAppsConsole() {
  const [tab, setTab] = useState<"monitor" | "revenue" | "config" | "catalog">("monitor");

  const [items, setItems] = useState<RegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState(defaultForm);
  const [token, setToken] = useState("");
  const [artifactManifest, setArtifactManifest] = useState("");
  const [artifactFile, setArtifactFile] = useState<File | null>(null);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [artifactId, setArtifactId] = useState("");
  const [deploymentByApp, setDeploymentByApp] = useState<Record<string, DeploymentRecord>>({});
  const [domainInputByApp, setDomainInputByApp] = useState<Record<string, string>>({});
  const [domainByApp, setDomainByApp] = useState<Record<string, DomainRecord | null>>({});

  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [appMetrics, setAppMetrics] = useState<AppMetric[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(defaultPaymentSettings);

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [prices, setPrices] = useState<PriceRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);

  function withAuthHeaders(contentType = true): HeadersInit {
    const headers: HeadersInit = {};
    if (contentType) {
      headers["content-type"] = "application/json";
    }
    if (token.trim()) {
      headers.authorization = `Bearer ${token.trim()}`;
    }
    return headers;
  }

  async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
    const res = await fetch(input, init);
    const json = await res.json();
    if (!res.ok || !json.ok) {
      throw new Error(json.error ?? `Request failed: ${input}`);
    }
    return json as T;
  }

  async function loadItems() {
    const json = await fetchJson<{ ok: true; items: RegistryItem[] }>("/api/admin/apps", {
      cache: "no-store",
      headers: withAuthHeaders(false)
    });
    setItems(json.items);
    return json.items;
  }

  async function loadLatestDeployment(appId: string) {
    const json = await fetchJson<{ ok: true; item: DeploymentRecord | null }>(`/api/admin/apps/${appId}/deployments`, {
      method: "GET",
      headers: withAuthHeaders(false),
      cache: "no-store"
    });

    setDeploymentByApp((prev) => {
      if (!json.item) {
        if (!prev[appId]) {
          return prev;
        }

        const next = { ...prev };
        delete next[appId];
        return next;
      }

      return { ...prev, [appId]: json.item };
    });
  }

  async function loadAllDeployments(apps: RegistryItem[]) {
    await Promise.all(apps.map((item) => loadLatestDeployment(item.id)));
  }

  async function loadMetrics() {
    const [overviewJson, appMetricsJson] = await Promise.all([
      fetchJson<{ ok: true; item: OverviewMetrics }>("/api/admin/metrics/overview", {
        cache: "no-store",
        headers: withAuthHeaders(false)
      }),
      fetchJson<{ ok: true; items: AppMetric[] }>("/api/admin/metrics/apps", {
        cache: "no-store",
        headers: withAuthHeaders(false)
      })
    ]);

    setOverview(overviewJson.item);
    setAppMetrics(appMetricsJson.items);
  }

  async function loadPaymentSettings() {
    const json = await fetchJson<{ ok: true; item: PaymentSettings }>("/api/admin/settings/payment", {
      cache: "no-store",
      headers: withAuthHeaders(false)
    });
    setPaymentSettings(json.item);
  }

  async function loadStandardData() {
    const [productsJson, pricesJson, ordersJson, usersJson] = await Promise.all([
      fetchJson<{ ok: true; items: ProductRecord[] }>("/api/admin/catalog/products", {
        cache: "no-store",
        headers: withAuthHeaders(false)
      }),
      fetchJson<{ ok: true; items: PriceRecord[] }>("/api/admin/catalog/prices", {
        cache: "no-store",
        headers: withAuthHeaders(false)
      }),
      fetchJson<{ ok: true; items: OrderRecord[] }>("/api/admin/orders", {
        cache: "no-store",
        headers: withAuthHeaders(false)
      }),
      fetchJson<{ ok: true; items: UserRecord[] }>("/api/admin/users", {
        cache: "no-store",
        headers: withAuthHeaders(false)
      })
    ]);

    setProducts(productsJson.items);
    setPrices(pricesJson.items);
    setOrders(ordersJson.items);
    setUsers(usersJson.items);
  }

  async function loadAll() {
    setLoading(true);
    setMessage("");
    try {
      const [registeredItems] = await Promise.all([loadItems(), loadMetrics(), loadPaymentSettings(), loadStandardData()]);
      await loadAllDeployments(registeredItems);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      setLoading(true);
      setMessage("");
      try {
        const [registeredItems] = await Promise.all([loadItems(), loadMetrics(), loadPaymentSettings(), loadStandardData()]);
        await loadAllDeployments(registeredItems);
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Failed to load admin data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initialLoad();

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.slug.localeCompare(b.slug)),
    [items]
  );

  useEffect(() => {
    const hasActiveDeployments = Object.values(deploymentByApp).some(
      (item) => item.status === "queued" || item.status === "running"
    );

    if (!hasActiveDeployments || sortedItems.length === 0) {
      return;
    }

    const timer = setInterval(() => {
      void Promise.all(sortedItems.map((item) => loadLatestDeployment(item.id)));
    }, 7000);

    return () => clearInterval(timer);
  }, [deploymentByApp, sortedItems]);

  async function onRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      await fetchJson<{ ok: true }>("/api/admin/apps", {
        method: "POST",
        headers: withAuthHeaders(),
        body: JSON.stringify(form)
      });
      setForm(defaultForm);
      await loadAll();
      setMessage("App registered.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to register app");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(item: RegistryItem) {
    const nextStatus = item.status === "active" ? "disabled" : "active";
    setMessage("");

    try {
      await fetchJson<{ ok: true }>(`/api/admin/apps/${item.id}/status`, {
        method: "PATCH",
        headers: withAuthHeaders(),
        body: JSON.stringify({ status: nextStatus })
      });
      await loadAll();
      setMessage(`Status updated to ${nextStatus}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update status");
    }
  }

  async function onUploadArtifact(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!selectedAppId || !artifactManifest.trim() || !artifactFile) {
      setMessage("Select app, provide manifest JSON, and choose bundle file.");
      return;
    }

    const formData = new FormData();
    formData.set("manifest", artifactManifest);
    formData.set("bundle", artifactFile);

    const headers: HeadersInit = {};
    if (token.trim()) {
      headers.authorization = `Bearer ${token.trim()}`;
    }

    try {
      const json = await fetchJson<{ ok: true; item: { id: string } }>(`/api/admin/apps/${selectedAppId}/artifacts`, {
        method: "POST",
        headers,
        body: formData
      });
      setArtifactId(json.item.id);
      setMessage(`Artifact uploaded: ${json.item.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to upload artifact");
    }
  }

  async function triggerDeployment(appId: string) {
    setMessage("");

    try {
      const json = await fetchJson<{ ok: true; item: DeploymentRecord }>(`/api/admin/apps/${appId}/deployments`, {
        method: "POST",
        headers: withAuthHeaders(),
        body: JSON.stringify({})
      });

      setDeploymentByApp((prev) => ({ ...prev, [appId]: json.item }));
      await loadMetrics();
      setMessage(`Deployment queued: ${json.item.status}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to deploy");
    }
  }

  async function refreshDeployment(appId: string) {
    try {
      await loadLatestDeployment(appId);
      await loadMetrics();
      const current = deploymentByApp[appId];
      if (current) {
        setMessage(`Deployment refreshed: ${current.status}`);
      } else {
        setMessage("Deployment refreshed.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to query deployment");
    }
  }

  async function assignDomain(appId: string) {
    const subdomain = (domainInputByApp[appId] ?? "").trim().toLowerCase();
    if (!subdomain) {
      setMessage("Subdomain is required.");
      return;
    }

    try {
      const json = await fetchJson<{ ok: true; item: DomainRecord }>(`/api/admin/apps/${appId}/domain`, {
        method: "POST",
        headers: withAuthHeaders(),
        body: JSON.stringify({ subdomain })
      });
      setDomainByApp((prev) => ({ ...prev, [appId]: json.item }));
      await loadMetrics();
      setMessage(`Domain assigned: ${json.item.fqdn}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to assign domain");
    }
  }

  async function loadDomain(appId: string) {
    try {
      const json = await fetchJson<{ ok: true; item: DomainRecord | null }>(`/api/admin/apps/${appId}/domain`, {
        method: "GET",
        headers: withAuthHeaders(false)
      });
      setDomainByApp((prev) => ({ ...prev, [appId]: json.item }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load domain");
    }
  }

  async function savePaymentSettings(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    try {
      await fetchJson<{ ok: true }>("/api/admin/settings/payment", {
        method: "PUT",
        headers: withAuthHeaders(),
        body: JSON.stringify(paymentSettings)
      });
      setMessage("Payment settings updated.");
      await loadPaymentSettings();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save payment settings");
    }
  }

  async function onLogout() {
    setMessage("");
    try {
      const supabase = getBrowserSupabaseClient();
      await supabase.auth.signOut();
      await fetch("/api/admin/session", { method: "DELETE" });
      window.location.href = "/admin/login";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Logout failed");
    }
  }

  return (
    <section className="process-zone" style={{ paddingTop: 24 }}>
      <h2 className="section-title terminal-font">ADMIN // OPS_CONSOLE</h2>

      <div className="process-card" style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn-secondary terminal-font" onClick={() => setTab("monitor")}>
            MONITOR
          </button>
          <button className="btn-secondary terminal-font" onClick={() => setTab("revenue")}>
            REVENUE
          </button>
          <button className="btn-secondary terminal-font" onClick={() => setTab("config")}>
            CONFIG
          </button>
          <button className="btn-secondary terminal-font" onClick={() => setTab("catalog")}>
            CATALOG
          </button>
          <button className="btn-secondary terminal-font" onClick={() => void loadAll()}>
            REFRESH_ALL
          </button>
          <button className="btn-secondary terminal-font" onClick={() => void onLogout()}>
            LOGOUT
          </button>
        </div>

        <label className="terminal-font">ADMIN_TOKEN (fallback)</label>
        <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Bearer token" />
      </div>

      {message ? <p className="sub terminal-font">{message}</p> : null}

      {loading ? <p className="sub terminal-font">LOADING...</p> : null}

      {!loading && tab === "monitor" ? (
        <>
          <form className="process-card" onSubmit={onRegister} style={{ display: "grid", gap: 10 }}>
            <input
              value={form.appId}
              onChange={(e) => setForm((s) => ({ ...s, appId: e.target.value }))}
              placeholder="appId"
              required
            />
            <input
              value={form.slug}
              onChange={(e) => setForm((s) => ({ ...s, slug: e.target.value }))}
              placeholder="slug"
              required
            />
            <input
              value={form.categoryId}
              onChange={(e) => setForm((s) => ({ ...s, categoryId: e.target.value }))}
              placeholder="categoryId"
              required
            />
            <input
              value={form.version}
              onChange={(e) => setForm((s) => ({ ...s, version: e.target.value }))}
              placeholder="version"
              required
            />
            <input
              value={form.entryPath}
              onChange={(e) => setForm((s) => ({ ...s, entryPath: e.target.value }))}
              placeholder="entryPath"
              required
            />
            <button className="btn-primary terminal-font" type="submit" disabled={saving}>
              {saving ? "REGISTERING..." : "REGISTER_APP"}
            </button>
          </form>

          <form className="process-card" onSubmit={onUploadArtifact} style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <select value={selectedAppId} onChange={(e) => setSelectedAppId(e.target.value)} required>
              <option value="">Select app for artifact upload</option>
              {sortedItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.slug}
                </option>
              ))}
            </select>
            <textarea
              value={artifactManifest}
              onChange={(e) => setArtifactManifest(e.target.value)}
              placeholder='manifest JSON, e.g. {"id":"...","slug":"...","version":"...","categoryId":"...","entryPath":"/apps/...","access":{"scopeType":"app"},"capabilities":{"payment":"none"}}'
              rows={5}
              required
            />
            <input
              type="file"
              accept=".zip,.tgz,.tar.gz"
              onChange={(e) => setArtifactFile(e.target.files?.[0] ?? null)}
              required
            />
            <button className="btn-primary terminal-font" type="submit">
              UPLOAD_ARTIFACT
            </button>
            {artifactId ? <p className="sub terminal-font">Current artifactId: {artifactId}</p> : null}
          </form>

          <div className="drops-grid" style={{ marginTop: 20 }}>
            {sortedItems.map((item) => {
              const deployment = deploymentByApp[item.id];
              const domain = domainByApp[item.id];

              return (
                <article key={item.id} className="drop-card">
                  <div className="drop-body">
                    <div className="drop-top">
                      <h4 className="terminal-font">{item.slug}</h4>
                      <span className={item.status === "active" ? "status-chip status-live" : "status-chip status-sold"}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="drop-subheadline">{item.entry_path}</p>
                    <div className="drop-metrics terminal-font" style={{ marginTop: 12 }}>
                      <div>
                        <span>APP_ID</span>
                        <strong>{item.app_id}</strong>
                      </div>
                      <div>
                        <span>CATEGORY</span>
                        <strong>{item.category_id}</strong>
                      </div>
                    </div>
                    <button className="btn-secondary terminal-font" onClick={() => void toggleStatus(item)}>
                      {item.status === "active" ? "DISABLE" : "ENABLE"}
                    </button>

                    <button className="btn-secondary terminal-font" onClick={() => void triggerDeployment(item.id)}>
                      REDEPLOY
                    </button>
                    <button className="btn-secondary terminal-font" onClick={() => void refreshDeployment(item.id)}>
                      REFRESH_DEPLOY
                    </button>
                    {deployment ? (
                      <p className="sub terminal-font">
                        DEPLOY: {deployment.status}
                        {deployment.commit_sha ? ` | SHA: ${deployment.commit_sha}` : ""}
                        {deployment.updated_at ? ` | UPDATED: ${new Date(deployment.updated_at).toLocaleString()}` : ""}
                        {deployment.production_url ? ` | URL: ${deployment.production_url}` : ""}
                        {deployment.error_message ? ` (${deployment.error_message})` : ""}
                      </p>
                    ) : null}

                    <input
                      value={domainInputByApp[item.id] ?? ""}
                      onChange={(e) =>
                        setDomainInputByApp((prev) => ({
                          ...prev,
                          [item.id]: e.target.value
                        }))
                      }
                      placeholder="subdomain"
                    />
                    <button className="btn-secondary terminal-font" onClick={() => void assignDomain(item.id)}>
                      ASSIGN_DOMAIN
                    </button>
                    <button className="btn-secondary terminal-font" onClick={() => void loadDomain(item.id)}>
                      LOAD_DOMAIN
                    </button>
                    {domain ? <p className="sub terminal-font">DOMAIN: {domain.fqdn}</p> : null}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : null}

      {!loading && tab === "revenue" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div className="process-card" style={{ display: "grid", gap: 8 }}>
            <h3 className="terminal-font">OVERVIEW</h3>
            <p className="sub terminal-font">TOTAL_MRR_USD: {overview?.totalMrr ?? 0}</p>
            <p className="sub terminal-font">ACTIVE_APPS: {overview?.activeApps ?? 0}</p>
            <p className="sub terminal-font">SUBSCRIPTIONS: {overview?.activeSubscriptions ?? 0} / {overview?.totalSubscriptions ?? 0}</p>
            <p className="sub terminal-font">PAID_ORDERS: {overview?.paidOrders ?? 0} / {overview?.totalOrders ?? 0}</p>
            <p className="sub terminal-font">GROSS_REVENUE_USD: {((overview?.grossRevenueCents ?? 0) / 100).toFixed(2)}</p>
          </div>

          <div className="process-card" style={{ display: "grid", gap: 8 }}>
            <h3 className="terminal-font">APP_METRICS</h3>
            {appMetrics.map((item) => (
              <div key={item.id} className="sub terminal-font" style={{ borderBottom: "1px solid #2f2f2f", paddingBottom: 6 }}>
                <strong>{item.slug}</strong> | STATUS={item.status} | DEPLOY={item.deployment_status ?? "-"}
                {item.deployment_error ? ` (${item.deployment_error})` : ""}
                {` | DOMAIN=${item.domain ?? "-"} | MRR=${item.mrr_usd} | ORDERS=${item.paid_order_count}/${item.order_count}`}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && tab === "config" ? (
        <form className="process-card" style={{ display: "grid", gap: 10 }} onSubmit={savePaymentSettings}>
          <h3 className="terminal-font">PAYMENT_PLATFORM_CONFIG</h3>

          <label className="terminal-font">defaultPaymentCapability</label>
          <select
            value={paymentSettings.defaultPaymentCapability}
            onChange={(e) =>
              setPaymentSettings((prev) => ({
                ...prev,
                defaultPaymentCapability: e.target.value as "none" | "checkout"
              }))
            }
          >
            <option value="none">none</option>
            <option value="checkout">checkout</option>
          </select>

          <label className="terminal-font">checkoutEnabled</label>
          <input
            type="checkbox"
            checked={paymentSettings.checkoutEnabled}
            onChange={(e) => setPaymentSettings((prev) => ({ ...prev, checkoutEnabled: e.target.checked }))}
          />

          <label className="terminal-font">callbackBaseUrl</label>
          <input
            value={paymentSettings.callbackBaseUrl}
            onChange={(e) => setPaymentSettings((prev) => ({ ...prev, callbackBaseUrl: e.target.value }))}
            placeholder="https://pay.example.com/callback"
          />

          <button className="btn-primary terminal-font" type="submit">
            SAVE_PAYMENT_CONFIG
          </button>
        </form>
      ) : null}

      {!loading && tab === "catalog" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div className="process-card" style={{ display: "grid", gap: 8 }}>
            <h3 className="terminal-font">PRODUCTS ({products.length})</h3>
            {products.map((item) => (
              <p key={item.id} className="sub terminal-font">
                {item.slug} | {item.name} | {item.status}
              </p>
            ))}
          </div>

          <div className="process-card" style={{ display: "grid", gap: 8 }}>
            <h3 className="terminal-font">PRICES ({prices.length})</h3>
            {prices.map((item) => (
              <p key={item.id} className="sub terminal-font">
                {item.product_id} | {(item.amount_cents / 100).toFixed(2)} {item.currency} / {item.interval} | {item.status}
              </p>
            ))}
          </div>

          <div className="process-card" style={{ display: "grid", gap: 8 }}>
            <h3 className="terminal-font">USERS ({users.length})</h3>
            {users.map((item) => (
              <p key={item.id} className="sub terminal-font">
                {item.email} | {item.display_name ?? "-"}
              </p>
            ))}
          </div>

          <div className="process-card" style={{ display: "grid", gap: 8 }}>
            <h3 className="terminal-font">ORDERS ({orders.length})</h3>
            {orders.map((item) => (
              <p key={item.id} className="sub terminal-font">
                {item.id} | user={item.user_id} | app={item.app_registry_id} | {item.status} | {(item.total_amount_cents / 100).toFixed(2)} {item.currency}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
