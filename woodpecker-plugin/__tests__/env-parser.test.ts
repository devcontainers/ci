import { parsePluginConfig, PluginConfig } from "../src/env-parser";

describe("parsePluginConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    // Clear all PLUGIN_* and CI_* variables
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith("PLUGIN_") || key.startsWith("CI_")) {
        delete process.env[key];
      }
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("returns defaults when no environment variables are set", () => {
    const config = parsePluginConfig();

    expect(config.imageName).toBeUndefined();
    expect(config.imageTag).toBeUndefined();
    expect(config.platform).toBeUndefined();
    expect(config.runCmd).toBeUndefined();
    expect(config.subFolder).toBe("");
    expect(config.configFile).toBeUndefined();
    expect(config.checkoutPath).toBe(".");
    expect(config.push).toBe("filter");
    expect(config.refFilterForPush).toBeUndefined();
    expect(config.eventFilterForPush).toBe("push");
    expect(config.env).toEqual([]);
    expect(config.inheritEnv).toBe(false);
    expect(config.skipContainerUserIdUpdate).toBe(false);
    expect(config.userDataFolder).toBeUndefined();
    expect(config.cacheFrom).toEqual([]);
    expect(config.noCache).toBe(false);
    expect(config.cacheTo).toEqual([]);
    expect(config.mounts).toEqual([]);
  });

  test("uses CI_WORKSPACE as default checkout path", () => {
    process.env.CI_WORKSPACE = "/drone/src";
    const config = parsePluginConfig();
    expect(config.checkoutPath).toBe("/drone/src");
  });

  test("parses string settings correctly", () => {
    process.env.PLUGIN_IMAGE_NAME = "ghcr.io/user/repo";
    process.env.PLUGIN_IMAGE_TAG = "v1.0.0";
    process.env.PLUGIN_PLATFORM = "linux/amd64";
    process.env.PLUGIN_RUN_CMD = "npm test";
    process.env.PLUGIN_SUB_FOLDER = "services/api";
    process.env.PLUGIN_CONFIG_FILE = ".devcontainer/custom.json";

    const config = parsePluginConfig();

    expect(config.imageName).toBe("ghcr.io/user/repo");
    expect(config.imageTag).toBe("v1.0.0");
    expect(config.platform).toBe("linux/amd64");
    expect(config.runCmd).toBe("npm test");
    expect(config.subFolder).toBe("services/api");
    expect(config.configFile).toBe(".devcontainer/custom.json");
  });

  test("parses boolean settings correctly - true values", () => {
    process.env.PLUGIN_INHERIT_ENV = "true";
    process.env.PLUGIN_SKIP_CONTAINER_USER_ID_UPDATE = "true";
    process.env.PLUGIN_NO_CACHE = "true";

    const config = parsePluginConfig();

    expect(config.inheritEnv).toBe(true);
    expect(config.skipContainerUserIdUpdate).toBe(true);
    expect(config.noCache).toBe(true);
  });

  test("parses boolean settings correctly - numeric true", () => {
    process.env.PLUGIN_INHERIT_ENV = "1";
    process.env.PLUGIN_NO_CACHE = "1";

    const config = parsePluginConfig();

    expect(config.inheritEnv).toBe(true);
    expect(config.noCache).toBe(true);
  });

  test("parses boolean settings correctly - false values", () => {
    process.env.PLUGIN_INHERIT_ENV = "false";
    process.env.PLUGIN_SKIP_CONTAINER_USER_ID_UPDATE = "false";
    process.env.PLUGIN_NO_CACHE = "0";

    const config = parsePluginConfig();

    expect(config.inheritEnv).toBe(false);
    expect(config.skipContainerUserIdUpdate).toBe(false);
    expect(config.noCache).toBe(false);
  });

  test("parses push setting with valid values", () => {
    process.env.PLUGIN_PUSH = "never";
    let config = parsePluginConfig();
    expect(config.push).toBe("never");

    process.env.PLUGIN_PUSH = "filter";
    config = parsePluginConfig();
    expect(config.push).toBe("filter");

    process.env.PLUGIN_PUSH = "always";
    config = parsePluginConfig();
    expect(config.push).toBe("always");
  });

  test("throws error on invalid push value", () => {
    process.env.PLUGIN_PUSH = "invalid";
    expect(() => parsePluginConfig()).toThrow(
      "Invalid push value: invalid. Must be 'never', 'filter', or 'always'",
    );
  });

  test("parses array settings - comma separated", () => {
    process.env.PLUGIN_ENV = "VAR1=value1,VAR2=value2,VAR3=value3";
    process.env.PLUGIN_CACHE_FROM = "image1:latest,image2:cache";

    const config = parsePluginConfig();

    expect(config.env).toEqual(["VAR1=value1", "VAR2=value2", "VAR3=value3"]);
    expect(config.cacheFrom).toEqual(["image1:latest", "image2:cache"]);
  });

  test("parses array settings - JSON for complex values with commas", () => {
    // For complex values containing commas, JSON format must be used
    process.env.PLUGIN_CACHE_TO = JSON.stringify([
      "type=registry,ref=image:cache",
    ]);
    process.env.PLUGIN_MOUNTS = JSON.stringify([
      "type=bind,src=/host,dst=/container",
    ]);

    const config = parsePluginConfig();

    expect(config.cacheTo).toEqual(["type=registry,ref=image:cache"]);
    expect(config.mounts).toEqual(["type=bind,src=/host,dst=/container"]);
  });

  test("parses array settings - newline separated", () => {
    process.env.PLUGIN_ENV = "VAR1=value1\nVAR2=value2\nVAR3=value3";

    const config = parsePluginConfig();

    expect(config.env).toEqual(["VAR1=value1", "VAR2=value2", "VAR3=value3"]);
  });

  test("parses array settings - JSON array", () => {
    process.env.PLUGIN_ENV = JSON.stringify([
      "VAR1=value1",
      "VAR2=value2",
      "VAR3=value3",
    ]);
    process.env.PLUGIN_CACHE_FROM = JSON.stringify([
      "image1:latest",
      "image2:cache",
    ]);

    const config = parsePluginConfig();

    expect(config.env).toEqual(["VAR1=value1", "VAR2=value2", "VAR3=value3"]);
    expect(config.cacheFrom).toEqual(["image1:latest", "image2:cache"]);
  });

  test("handles empty array settings", () => {
    process.env.PLUGIN_ENV = "";
    process.env.PLUGIN_CACHE_FROM = "";

    const config = parsePluginConfig();

    expect(config.env).toEqual([]);
    expect(config.cacheFrom).toEqual([]);
  });

  test("trims whitespace from array elements", () => {
    process.env.PLUGIN_ENV = " VAR1=value1 , VAR2=value2 , VAR3=value3 ";

    const config = parsePluginConfig();

    expect(config.env).toEqual(["VAR1=value1", "VAR2=value2", "VAR3=value3"]);
  });

  test("filters empty array elements", () => {
    process.env.PLUGIN_ENV = "VAR1=value1,,VAR2=value2,,,VAR3=value3";

    const config = parsePluginConfig();

    expect(config.env).toEqual(["VAR1=value1", "VAR2=value2", "VAR3=value3"]);
  });

  test("parses complex configuration", () => {
    process.env.CI_WORKSPACE = "/drone/src";
    process.env.PLUGIN_IMAGE_NAME = "ghcr.io/user/repo";
    process.env.PLUGIN_IMAGE_TAG = "latest,v1.0.0";
    process.env.PLUGIN_PLATFORM = "linux/amd64,linux/arm64";
    process.env.PLUGIN_RUN_CMD = "npm test && npm run build";
    process.env.PLUGIN_PUSH = "filter";
    process.env.PLUGIN_REF_FILTER_FOR_PUSH = "refs/heads/main";
    process.env.PLUGIN_EVENT_FILTER_FOR_PUSH = "push,tag";
    process.env.PLUGIN_ENV = JSON.stringify([
      "NODE_ENV=production",
      "API_URL=https://api.example.com",
    ]);
    process.env.PLUGIN_INHERIT_ENV = "true";
    process.env.PLUGIN_CACHE_FROM = "ghcr.io/user/repo:cache";

    const config = parsePluginConfig();

    expect(config.checkoutPath).toBe("/drone/src");
    expect(config.imageName).toBe("ghcr.io/user/repo");
    expect(config.imageTag).toBe("latest,v1.0.0");
    expect(config.platform).toBe("linux/amd64,linux/arm64");
    expect(config.runCmd).toBe("npm test && npm run build");
    expect(config.push).toBe("filter");
    expect(config.refFilterForPush).toBe("refs/heads/main");
    expect(config.eventFilterForPush).toBe("push,tag");
    expect(config.env).toEqual([
      "NODE_ENV=production",
      "API_URL=https://api.example.com",
    ]);
    expect(config.inheritEnv).toBe(true);
    expect(config.cacheFrom).toEqual(["ghcr.io/user/repo:cache"]);
  });

  test("PLUGIN_CHECKOUT_PATH overrides CI_WORKSPACE", () => {
    process.env.CI_WORKSPACE = "/drone/src";
    process.env.PLUGIN_CHECKOUT_PATH = "/custom/path";

    const config = parsePluginConfig();

    expect(config.checkoutPath).toBe("/custom/path");
  });

  test("handles multiline run command", () => {
    process.env.PLUGIN_RUN_CMD = `npm install
npm test
npm run build`;

    const config = parsePluginConfig();

    expect(config.runCmd).toBe(`npm install
npm test
npm run build`);
  });
});
