import { spawn } from "node:child_process";
import { updateDeploymentStatus } from "@factory/database";

type CliArgs = {
  deploymentId: string;
  appRegistryId: string;
  slug: string;
};

function parseArgs(argv: string[]): CliArgs {
  const map = new Map<string, string>();
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key?.startsWith("--") && value) {
      map.set(key.slice(2), value);
    }
  }

  const deploymentId = map.get("deploymentId") ?? "";
  const appRegistryId = map.get("appRegistryId") ?? "";
  const slug = map.get("slug") ?? "";

  if (!deploymentId || !appRegistryId || !slug) {
    throw new Error("Missing required args: --deploymentId --appRegistryId --slug");
  }

  return { deploymentId, appRegistryId, slug };
}

async function runCommand(command: string, args: string[]) {
  return await new Promise<{ code: number; output: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      shell: true
    });

    let output = "";

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code: code ?? 1, output: output.trim() });
    });
  });
}

function makeUrl(slug: string): string {
  const baseDomain = process.env.APP_BASE_DOMAIN?.trim();
  if (!baseDomain) {
    return `/apps/${slug}`;
  }

  return `https://${slug}.${baseDomain}`;
}

function composeArgs(...rest: string[]) {
  return ["compose", "--env-file", ".env.production", ...rest];
}

function resolveHealthUrl() {
  const fromEnv = process.env.DEPLOY_HEALTHCHECK_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const httpPort = process.env.APP_HTTP_PORT?.trim() || "80";
  return `http://127.0.0.1:${httpPort}/api/health`;
}

async function waitForHealthCheck(): Promise<string> {
  const url = resolveHealthUrl();

  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      const body = await response.text();
      if (response.ok) {
        return `health check ok (${response.status}) ${body.slice(0, 200)}`;
      }
    } catch {
      // retry
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(`Health check failed: ${url}`);
}

async function main() {
  const { deploymentId, appRegistryId, slug } = parseArgs(process.argv);

  let commitSha: string | null = null;
  let logBuffer = "";

  try {
    const shaResult = await runCommand("git", ["rev-parse", "--short", "HEAD"]);
    if (shaResult.code === 0) {
      commitSha = shaResult.output.split(/\s+/)[0] ?? null;
    }

    await updateDeploymentStatus({
      deploymentId,
      nextStatus: "running",
      commitSha,
      logAppend: `deploy-runner started (appRegistryId=${appRegistryId})`
    });

    const steps: Array<{ command: string; args: string[]; label: string }> = [
      { command: "git", args: ["pull"], label: "git pull" },
      { command: "docker", args: composeArgs("build", "main-landing"), label: "docker compose build" },
      {
        command: "docker",
        args: composeArgs("up", "-d", "main-landing", "reverse-proxy"),
        label: "docker compose up"
      }
    ];

    for (const step of steps) {
      const result = await runCommand(step.command, step.args);
      logBuffer += `\n$ ${step.command} ${step.args.join(" ")}\n${result.output}`;

      if (result.code !== 0) {
        throw new Error(`${step.label} failed with exit code ${result.code}`);
      }
    }

    const healthResult = await waitForHealthCheck();
    logBuffer += `\n$ health-check\n${healthResult}`;

    const productionUrl = makeUrl(slug);

    await updateDeploymentStatus({
      deploymentId,
      nextStatus: "success",
      commitSha,
      previewUrl: productionUrl,
      productionUrl,
      logAppend: logBuffer.slice(-20000)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Deployment runner failed";

    const psResult = await runCommand("docker", composeArgs("ps"));
    const logsResult = await runCommand("docker", composeArgs("logs", "--tail", "120", "main-landing", "reverse-proxy"));

    const diagnosticLogs = `${logBuffer}\n$ docker compose ps\n${psResult.output}\n$ docker compose logs --tail 120 main-landing reverse-proxy\n${logsResult.output}\nERROR: ${message}`;

    try {
      await updateDeploymentStatus({
        deploymentId,
        nextStatus: "failed",
        errorMessage: message,
        commitSha,
        logAppend: diagnosticLogs.slice(-20000)
      });
    } catch {
      // Best effort writeback only.
    }

    process.exitCode = 1;
  }
}

void main();
