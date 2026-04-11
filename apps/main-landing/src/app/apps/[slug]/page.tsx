import { notFound } from "next/navigation";
import { resolveActiveHostedApp } from "@/lib/host-runtime";

export default async function HostedAppPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hosted = await resolveActiveHostedApp(slug);

  if (!hosted) {
    notFound();
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
