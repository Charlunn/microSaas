"use client";

import { useState } from "react";
import { formatDate } from "@/lib/format";
import type { LandingDashboardData } from "@/lib/landing-data";

type Locale = "en" | "zh";

interface LandingPageProps {
  data: LandingDashboardData;
}

const copy = {
  en: {
    navProcess: "PROCESS",
    navDrops: "DAILY_DROPS",
    navOverview: "BUSINESS_OVERVIEW",
    liveProducts: "LIVE_PRODUCTS",
    systemActive: "SYSTEM_ACTIVE",
    heroTitleLine1: "ONE PROBLEM.",
    heroTitleLine2: "ONE DAY.",
    heroTitleLine3: "ONE SAAS.",
    heroCopy:
      "We ship focused micro-SaaS products daily with a repeatable factory workflow: discover pain points, build fast, launch quickly, and iterate from live market signals.",
    heroBtnPrimary: "VIEW_TODAY_BUILD",
    heroBtnSecondary: "OUR_OPERATING_MODEL",
    nextDrop: "NEXT_DROP_SEQUENCE",
    showcase: "PUBLIC_SHOWCASE",
    matrixOnline: "PRODUCT_MATRIX_ONLINE",
    assemblyLine: "THE ASSEMBLY LINE",
    phase1Desc:
      "Scan communities and workflows to isolate high-frequency, high-intent problems worth solving.",
    phase2Desc:
      "Use reusable SDK infrastructure to ship a production-grade MVP in hours, not weeks.",
    phase3Desc:
      "Deploy, observe real usage, and continuously optimize product-market fit from live feedback.",
    dailyDrops: "THE DAILY DROPS",
    outputLog: "PUBLIC_OUTPUT_LOG",
    overview: "PUBLIC_OVERVIEW: PRODUCTS & CAPABILITIES",
    users: "USERS",
    launch: "LAUNCH",
    accessNode: "ACCESS_NODE",
    footerTerminal: "TERMINAL",
    footerDocs: "DOCS",
    footerApi: "API_STATUS",
    footerPrivacy: "PRIVACY"
  },
  zh: {
    navProcess: "生产流程",
    navDrops: "每日上新",
    navOverview: "业务概览",
    liveProducts: "在线产品",
    systemActive: "系统运行中",
    heroTitleLine1: "一个问题。",
    heroTitleLine2: "一天完成。",
    heroTitleLine3: "一个 SaaS。",
    heroCopy:
      "我们以可复制的工厂化流程进行微 SaaS 每日产出：发现痛点、快速构建、快速上线，并基于真实用户反馈持续迭代。",
    heroBtnPrimary: "查看今日产品",
    heroBtnSecondary: "查看运营模型",
    nextDrop: "下一次发布序列",
    showcase: "公开展示",
    matrixOnline: "产品矩阵在线",
    assemblyLine: "生产流水线",
    phase1Desc: "扫描社区与业务场景，优先锁定高频、高意图、可付费的问题。",
    phase2Desc: "基于可复用 SDK 底座小时级交付可上线 MVP，而不是周级开发。",
    phase3Desc: "上线后持续观察真实使用数据，快速优化产品与市场匹配度。",
    dailyDrops: "每日上新",
    outputLog: "公开产出记录",
    overview: "公开概览：产品与能力",
    users: "用户数",
    launch: "上线时间",
    accessNode: "访问入口",
    footerTerminal: "终端",
    footerDocs: "文档",
    footerApi: "接口状态",
    footerPrivacy: "隐私"
  }
} as const;

function statusLabel(status: "live" | "archived" | "sold", locale: Locale) {
  if (locale === "en") return status.toUpperCase();
  if (status === "live") return "运行中";
  if (status === "sold") return "已出售";
  return "已归档";
}

function statusClass(status: "live" | "archived" | "sold") {
  if (status === "live") return "status-chip status-live";
  if (status === "sold") return "status-chip status-sold";
  return "status-chip status-archived";
}

export function LandingPage({ data }: LandingPageProps) {
  const [locale, setLocale] = useState<Locale>("en");
  const t = copy[locale];

  return (
    <main className="landing-root">
      <nav className="topbar">
        <div className="brand terminal-font">KINETIC_ENGINE // MICRO-SAAS_FACTORY</div>
        <div className="top-links terminal-font">
          <a href="#process">{t.navProcess}</a>
          <a href="#drops">{t.navDrops}</a>
          <a href="#overview">{t.navOverview}</a>
        </div>
        <div className="top-controls">
          <div className="lang-switch terminal-font">
            <button
              className={locale === "en" ? "lang-btn active" : "lang-btn"}
              onClick={() => setLocale("en")}
              type="button"
            >
              EN
            </button>
            <button
              className={locale === "zh" ? "lang-btn active" : "lang-btn"}
              onClick={() => setLocale("zh")}
              type="button"
            >
              中文
            </button>
          </div>
          <div className="live-box terminal-font">
            {t.liveProducts}: {data.liveBuilds}
          </div>
        </div>
      </nav>

      <section className="hero" id="overview">
        <div className="hero-grid">
          <div className="hero-main">
            <div className="hero-meta terminal-font">
              <span className="badge-on">{t.systemActive}</span>
              <span>BUILD_VER // 2.0.4</span>
            </div>
            <h1 className="hero-title terminal-font">
              {t.heroTitleLine1}
              <br />
              <span>{t.heroTitleLine2}</span>
              <br />
              {t.heroTitleLine3}
            </h1>
            <p className="hero-copy">{t.heroCopy}</p>
            <div className="hero-actions">
              <button className="btn-primary terminal-font">{t.heroBtnPrimary}</button>
              <button className="btn-secondary terminal-font">{t.heroBtnSecondary}</button>
            </div>
          </div>
          <div className="hero-side terminal-font">
            <div className="clock">23:14:02</div>
            <div className="clock-label">{t.nextDrop}</div>
            <div className="investor-kpi">
              <span>{t.showcase}</span>
              <strong>{t.matrixOnline}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="process-zone" id="process">
        <h2 className="section-title terminal-font">{t.assemblyLine}</h2>
        <div className="process-grid">
          <article className="process-card">
            <div className="phase terminal-font">PHASE_01</div>
            <h3 className="terminal-font">OpenClaw</h3>
            <p>{t.phase1Desc}</p>
            <div className="tag terminal-font">TAG: ANALYSIS_ENGINE</div>
          </article>
          <article className="process-card process-card-active">
            <div className="phase terminal-font">PHASE_02</div>
            <h3 className="terminal-font">VibeCoding</h3>
            <p>{t.phase2Desc}</p>
            <div className="tag terminal-font">TAG: NEURAL_ASSEMBLY</div>
          </article>
          <article className="process-card">
            <div className="phase terminal-font">PHASE_03</div>
            <h3 className="terminal-font">Deployment</h3>
            <p>{t.phase3Desc}</p>
            <div className="tag terminal-font">TAG: EDGE_SHIPPING</div>
          </article>
        </div>
      </section>

      <section className="drops-zone" id="drops">
        <div className="drops-head">
          <div>
            <h2 className="section-title terminal-font">{t.dailyDrops}</h2>
            <p className="sub terminal-font">{t.outputLog}</p>
          </div>
          <div className="mrr-pill terminal-font">{t.overview}</div>
        </div>

        <div className="drops-grid">
          {data.apps.map((app) => (
            <article key={app.id} className="drop-card">
              <div className="drop-media">
                <img src={app.heroImageUrl} alt={`${app.name} preview`} />
              </div>
              <div className="drop-body">
                <div className="drop-top">
                  <h4 className="terminal-font">{app.name}</h4>
                  <span className={statusClass(app.status)}>{statusLabel(app.status, locale)}</span>
                </div>
                <p className="drop-headline">{app.headline}</p>
                <p className="drop-subheadline">{app.subheadline}</p>
                <div className="drop-metrics terminal-font">
                  <div>
                    <span>{t.users}</span>
                    <strong>{app.activeUsers.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>{t.launch}</span>
                    <strong>{formatDate(app.launchDate)}</strong>
                  </div>
                </div>
                <a href={`/apps/${app.slug}`} className="drop-link terminal-font">
                  {t.accessNode} // {app.slug}
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="footer terminal-font">
        <div>KINETIC_ENGINE</div>
        <div className="footer-links">
          <a href="#">{t.footerTerminal}</a>
          <a href="#">{t.footerDocs}</a>
          <a href="#">{t.footerApi}</a>
          <a href="#">{t.footerPrivacy}</a>
        </div>
        <div>©2026 KINETIC_ENGINE // SYSTEM_READY</div>
      </footer>
    </main>
  );
}
