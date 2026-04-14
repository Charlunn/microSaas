import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminAppsConsole } from "@/components/admin-apps-console";

export default async function AdminAppsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_access_token")?.value;
  if (!token) {
    redirect("/admin/login");
  }

  return (
    <main className="landing-root">
      <nav className="topbar">
        <div className="brand terminal-font">KINETIC_ENGINE // ADMIN_CONSOLE</div>
      </nav>
      <AdminAppsConsole />
    </main>
  );
}
