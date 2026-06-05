import { readFileSync } from "node:fs";
import path from "node:path";

const CONFIG_PATH = path.resolve("config", "pinterest-accounts.json");

function normalizeTargetUrl(value, envName) {
  const targetUrl = value?.trim() ?? "";
  if (!targetUrl) {
    return "";
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    throw new Error(`URL Pinterest invalide dans ${envName}.`);
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(`URL Pinterest refusee dans ${envName}: protocole HTTP(S) requis.`);
  }

  return parsedUrl.toString();
}

export function loadPinterestAccountConfigs() {
  const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));

  return Object.fromEntries(
    Object.entries(config).map(([accountId, account]) => {
      const targetUrlEnv = account.target_url_env;
      return [
        accountId,
        {
          accountId,
          accountName: account.account_name,
          targetUrlEnv,
          targetUrl: normalizeTargetUrl(process.env[targetUrlEnv], targetUrlEnv),
        },
      ];
    }),
  );
}
