import { LandingPage } from "@/components/landing-page";
import { getLandingDashboardData } from "@/lib/landing-data";

export const dynamic = "force-dynamic";

function MissingEnvFallback({ message }: { message: string }) {
  return (
    <main className="page-root">
      <section className="hero-zone">
        <div className="meta terminal-font">CONFIG_REQUIRED // SUPABASE</div>
        <h1 className="hero-title terminal-font">
          LANDING PAGE
          <br />
          <span className="hero-highlight">Environment setup needed</span>
        </h1>
        <p className="hero-desc">{message}</p>
        <div className="app-card" style={{ marginTop: "24px" }}>
          <div className="app-body terminal-font">
            <div>NEXT_PUBLIC_SUPABASE_URL</div>
            <div>NEXT_PUBLIC_SUPABASE_ANON_KEY</div>
            <div>SUPABASE_SERVICE_ROLE_KEY</div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default async function Page() {
  try {
    const data = await getLandingDashboardData();
    return <LandingPage data={data} />;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Missing or invalid Supabase configuration.";
    return <MissingEnvFallback message={message} />;
  }
}
