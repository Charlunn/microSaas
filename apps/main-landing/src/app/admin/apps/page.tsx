import { AdminAppsConsole } from "@/components/admin-apps-console";

export default function AdminAppsPage() {
  return (
    <main className="landing-root">
      <nav className="topbar">
        <div className="brand terminal-font">KINETIC_ENGINE // ADMIN_CONSOLE</div>
      </nav>
      <AdminAppsConsole />
    </main>
  );
}
