/**
 * Configuration interface for Woodpecker plugin settings
 */
export interface PluginConfig {
  imageName?: string;
  imageTag?: string;
  platform?: string;
  runCmd?: string;
  subFolder: string;
  configFile?: string;
  checkoutPath: string;
  push: "never" | "filter" | "always";
  refFilterForPush?: string;
  eventFilterForPush?: string;
  env: string[];
  inheritEnv: boolean;
  skipContainerUserIdUpdate: boolean;
  userDataFolder?: string;
  cacheFrom: string[];
  noCache: boolean;
  cacheTo: string[];
  mounts: string[];
}

/**
 * Parse plugin configuration from PLUGIN_* environment variables
 * Woodpecker CI passes settings as PLUGIN_<NAME> environment variables
 */
export function parsePluginConfig(): PluginConfig {
  const getEnv = (name: string, defaultValue?: string): string => {
    return process.env[`PLUGIN_${name}`] ?? defaultValue ?? "";
  };

  const getBool = (name: string, defaultValue: boolean): boolean => {
    const value = process.env[`PLUGIN_${name}`];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === "true" || value === "1";
  };

  const getArray = (name: string): string[] => {
    const value = process.env[`PLUGIN_${name}`];
    if (!value) return [];

    // Try to parse as JSON array first (for complex settings)
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // If not JSON, split by comma or newline
    }

    // Split by comma or newline
    return value
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const push = getEnv("PUSH", "filter");
  if (push !== "never" && push !== "filter" && push !== "always") {
    throw new Error(
      `Invalid push value: ${push}. Must be 'never', 'filter', or 'always'`,
    );
  }

  // Woodpecker automatically sets CI_WORKSPACE to the workspace directory
  const defaultCheckoutPath = process.env.CI_WORKSPACE ?? ".";

  return {
    imageName: getEnv("IMAGE_NAME") || undefined,
    imageTag: getEnv("IMAGE_TAG") || undefined,
    platform: getEnv("PLATFORM") || undefined,
    runCmd: getEnv("RUN_CMD") || undefined,
    subFolder: getEnv("SUB_FOLDER", ""),
    configFile: getEnv("CONFIG_FILE") || undefined,
    checkoutPath: getEnv("CHECKOUT_PATH", defaultCheckoutPath),
    push: push as "never" | "filter" | "always",
    refFilterForPush: getEnv("REF_FILTER_FOR_PUSH") || undefined,
    eventFilterForPush: getEnv("EVENT_FILTER_FOR_PUSH", "push") || undefined,
    env: getArray("ENV"),
    inheritEnv: getBool("INHERIT_ENV", false),
    skipContainerUserIdUpdate: getBool("SKIP_CONTAINER_USER_ID_UPDATE", false),
    userDataFolder: getEnv("USER_DATA_FOLDER") || undefined,
    cacheFrom: getArray("CACHE_FROM"),
    noCache: getBool("NO_CACHE", false),
    cacheTo: getArray("CACHE_TO"),
    mounts: getArray("MOUNTS"),
  };
}

/**
 * Log the parsed configuration (hiding sensitive values)
 */
export function logConfig(config: PluginConfig): void {
  console.log("Plugin Configuration:");
  console.log(`  imageName: ${config.imageName ?? "<not set>"}`);
  console.log(`  imageTag: ${config.imageTag ?? "latest"}`);
  console.log(`  platform: ${config.platform ?? "<default>"}`);
  console.log(`  runCmd: ${config.runCmd ?? "<not set>"}`);
  console.log(`  subFolder: ${config.subFolder || "."}`);
  console.log(`  configFile: ${config.configFile ?? "<default>"}`);
  console.log(`  checkoutPath: ${config.checkoutPath}`);
  console.log(`  push: ${config.push}`);
  console.log(`  refFilterForPush: ${config.refFilterForPush ?? "<not set>"}`);
  console.log(
    `  eventFilterForPush: ${config.eventFilterForPush ?? "<not set>"}`,
  );
  console.log(`  env: ${config.env.length} variable(s)`);
  console.log(`  inheritEnv: ${config.inheritEnv}`);
  console.log(
    `  skipContainerUserIdUpdate: ${config.skipContainerUserIdUpdate}`,
  );
  console.log(`  cacheFrom: ${config.cacheFrom.length} source(s)`);
  console.log(`  noCache: ${config.noCache}`);
  console.log(`  cacheTo: ${config.cacheTo.length} destination(s)`);
  console.log(`  mounts: ${config.mounts.length} mount(s)`);
  console.log("");
}
