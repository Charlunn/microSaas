"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

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

const defaultForm = {
  appId: "",
  slug: "",
  version: "0.1.0",
  categoryId: "",
  entryPath: "/apps/",
  accessScopeType: "app" as const,
  paymentCapability: "none" as const
};

export function AdminAppsConsole() {
  const [items, setItems] = useState<RegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(defaultForm);

  async function loadItems() {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/admin/apps", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setMessage(json.error ?? "Failed to load apps");
      setLoading(false);
      return;
    }
    setItems(json.items);
    setLoading(false);
  }

  useEffect(() => {
    void loadItems();
  }, []);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.slug.localeCompare(b.slug)),
    [items]
  );

  async function onRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/admin/apps", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form)
    });

    const json = await res.json();
    if (!res.ok || !json.ok) {
      setMessage(json.error ?? "Failed to register app");
      setSaving(false);
      return;
    }

    setForm(defaultForm);
    await loadItems();
    setSaving(false);
    setMessage("App registered.");
  }

  async function toggleStatus(item: RegistryItem) {
    setMessage("");
    const nextStatus = item.status === "active" ? "disabled" : "active";

    const res = await fetch(`/api/admin/apps/${item.id}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });

    const json = await res.json();
    if (!res.ok || !json.ok) {
      setMessage(json.error ?? "Failed to update status");
      return;
    }

    await loadItems();
    setMessage(`Status updated to ${nextStatus}.`);
  }

  return (
    <section className="process-zone" style={{ paddingTop: 24 }}>
      <h2 className="section-title terminal-font">ADMIN // APP_REGISTRY</h2>

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

      {message ? <p className="sub terminal-font">{message}</p> : null}

      <div className="drops-grid" style={{ marginTop: 20 }}>
        {loading ? (
          <p className="sub terminal-font">LOADING...</p>
        ) : (
          sortedItems.map((item) => (
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
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
