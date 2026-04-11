import { getLandingApps, getTotalMrr } from "@factory/database";

export interface LandingDashboardData {
  totalMrr: number;
  liveBuilds: number;
  apps: Array<{
    id: string;
    name: string;
    slug: string;
    launchDate: string;
    activeUsers: number;
    status: "live" | "archived" | "sold";
    headline: string;
    subheadline: string;
    heroImageUrl: string;
  }>;
}

export async function getLandingDashboardData(): Promise<LandingDashboardData> {
  const [apps, totalMrr] = await Promise.all([getLandingApps(8), getTotalMrr()]);

  return {
    totalMrr,
    liveBuilds: apps.filter((app) => app.status === "live").length,
    apps: apps.map((app) => ({
      id: app.id,
      name: app.name,
      slug: app.slug,
      launchDate: app.launch_date,
      activeUsers: app.active_users,
      status: app.status,
      headline: app.headline,
      subheadline: app.subheadline,
      heroImageUrl: app.hero_image_url
    }))
  };
}
