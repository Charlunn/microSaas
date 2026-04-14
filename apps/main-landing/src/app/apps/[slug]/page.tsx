import { notFound } from "next/navigation";
import { resolveActiveHostedApp } from "@/lib/host-runtime";

const MOCK_INBOXPING_RESULTS = [
  { provider: "Gmail", folder: "Primary", verdict: "pass" },
  { provider: "Outlook", folder: "Promotions/Other", verdict: "warn" },
  { provider: "Apple Mail", folder: "Spam", verdict: "fail" }
] as const;

function renderInboxPingMock(version: string) {
  return (
    <main className="landing-root" style={{ padding: "48px 24px" }}>
      <h1 className="section-title terminal-font">INBOXPING // delivery radar</h1>
      <p style={{ marginTop: 12, color: "#9ca3af" }}>
        Control-plane debug mode · VERSION_{version}
      </p>

      <section className="feature-grid" style={{ marginTop: 20 }}>
        {MOCK_INBOXPING_RESULTS.map((row) => {
          const color = row.verdict === "pass" ? "#22c55e" : row.verdict === "warn" ? "#f59e0b" : "#ef4444";
          const label = row.verdict === "pass" ? "INBOX" : row.verdict === "warn" ? "OTHER" : "SPAM";

          return (
            <article key={row.provider} className="process-card process-card-active">
              <div className="phase terminal-font" style={{ color }}>
                {row.provider.toUpperCase()} · {label}
              </div>
              <h3 className="terminal-font">{row.folder}</h3>
              <p>Mock probe result for platform integration test.</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}

export default async function HostedAppPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hosted = await resolveActiveHostedApp(slug);

  if (!hosted) {
    notFound();
  }

  if (hosted.manifest.slug === "inbox-ping") {
    return renderInboxPingMock(hosted.manifest.version);
  }

  return (
    <main className="landing-root" style={{ padding: "48px 24px" }}>
      <h1 className="section-title terminal-font">APP_NODE // {hosted.manifest.slug}</h1>
      <div className="process-card process-card-active" style={{ marginTop: "20px" }}>
        <div className="phase terminal-font">VERSION_{hosted.manifest.version}</div>
        <h3 className="terminal-font">ENTRY {hosted.manifest.entryPath}</h3>
        <p>Host protocol resolved this app from registry and mounted it through unified routing.</p>
      </div>
    </main>
  );
}
