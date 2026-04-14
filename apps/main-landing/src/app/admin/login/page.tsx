"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = getBrowserSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.session?.access_token) {
        setMessage(error?.message ?? "登录失败");
        setLoading(false);
        return;
      }

      const sessionRes = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accessToken: data.session.access_token })
      });
      const sessionJson = await sessionRes.json();
      if (!sessionRes.ok || !sessionJson.ok) {
        setMessage(sessionJson.error ?? "会话创建失败");
        setLoading(false);
        return;
      }

      router.push("/admin/apps");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="landing-root">
      <nav className="topbar">
        <div className="brand terminal-font">KINETIC_ENGINE // ADMIN_LOGIN</div>
      </nav>

      <section className="process-zone" style={{ paddingTop: 24, maxWidth: 520, margin: "0 auto" }}>
        <form className="process-card" onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin email"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            required
          />
          <button className="btn-primary terminal-font" type="submit" disabled={loading}>
            {loading ? "SIGNING..." : "SIGN_IN"}
          </button>
          {message ? <p className="sub terminal-font">{message}</p> : null}
        </form>
      </section>
    </main>
  );
}
