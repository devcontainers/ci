import path from "path";
import os from "os";
import { exec } from "./exec";
import {
  devcontainer,
  DevContainerCliBuildArgs,
} from "../../common/src/dev-container-cli";

import { isDockerBuildXInstalled, pushImage } from "./docker";
import { isSkopeoInstalled, copyImage } from "./skopeo";
import { populateDefaults } from "../../common/src/envvars";
import { parsePluginConfig, logConfig } from "./env-parser";

/**
 * Main plugin entry point
 */
async function main(): Promise<void> {
  console.log("🚀 Woodpecker Dev Container Plugin starting...");
  console.log("");

  // Parse configuration from PLUGIN_* environment variables
  const config = parsePluginConfig();
  logConfig(config);

  try {
    // 1. Verify prerequisites
    console.log("✓ Checking prerequisites...");
    const buildXInstalled = await isDockerBuildXInstalled();
    if (!buildXInstalled) {
      console.error(
        "❌ docker buildx not available. Please ensure Docker BuildX is installed on your runner.",
      );
      process.exit(1);
    }

    const devContainerCliInstalled = await devcontainer.isCliInstalled(exec);
    if (!devContainerCliInstalled) {
      console.log("📦 Installing @devcontainers/cli...");
      const success = await devcontainer.installCli(exec);
      if (!success) {
        console.error("❌ @devcontainers/cli install failed!");
        process.exit(1);
      }
      console.log("✅ @devcontainers/cli installed successfully");
    } else {
      console.log("✅ @devcontainers/cli already installed");
    }

    // Check skopeo for multi-platform builds
    if (config.platform) {
      const skopeoInstalled = await isSkopeoInstalled();
      if (!skopeoInstalled) {
        console.error(
          "❌ skopeo not available and is required for multi-platform builds. Please install skopeo.",
        );
        process.exit(1);
      }
      console.log("✅ skopeo available for multi-platform builds");
    }

    const buildxOutput = config.platform
      ? "type=oci,dest=/tmp/output.tar"
      : undefined;

    // 2. Prepare configuration
    const log = (message: string): void => console.log(message);
    const workspaceFolder = path.resolve(config.checkoutPath, config.subFolder);
    const configFile =
      config.configFile && path.resolve(config.checkoutPath, config.configFile);

    // Handle image names and tags
    const resolvedImageTag = config.imageTag ?? "latest";
    const imageTagArray = resolvedImageTag.split(/\s*,\s*/);
    const fullImageNameArray: string[] = [];

    if (config.imageName) {
      for (const tag of imageTagArray) {
        fullImageNameArray.push(`${config.imageName}:${tag}`);
      }

      // Auto-add cache-from for single tag
      if (fullImageNameArray.length === 1) {
        if (
          !config.noCache &&
          !config.cacheFrom.includes(fullImageNameArray[0])
        ) {
          console.log(
            `Adding --cache-from ${fullImageNameArray[0]} to build args`,
          );
          config.cacheFrom.unshift(fullImageNameArray[0]);
        }
      } else {
        console.log(
          "Not adding --cache-from automatically since multiple image tags were supplied",
        );
      }
    } else {
      if (config.imageTag) {
        console.warn(
          "⚠️  imageTag specified without specifying imageName - ignoring imageTag",
        );
      }
    }

    // 3. Build the dev container
    console.log("");
    console.log("🏗️  Building dev container...");
    const buildArgs: DevContainerCliBuildArgs = {
      workspaceFolder,
      configFile,
      imageName: fullImageNameArray,
      platform: config.platform,
      additionalCacheFroms: config.cacheFrom,
      userDataFolder: config.userDataFolder,
      output: buildxOutput,
      noCache: config.noCache,
      cacheTo: config.cacheTo,
    };
    const buildResult = await devcontainer.build(buildArgs, log);

    if (buildResult.outcome !== "success") {
      console.error(
        `❌ Dev container build failed: ${buildResult.message} (exit code: ${buildResult.code})`,
      );
      console.error(buildResult.description);
      process.exit(1);
    }
    console.log("✅ Build completed successfully");

    // 4. Run command in container (if specified)
    const inputEnvsWithDefaults = populateDefaults(
      config.env,
      config.inheritEnv,
    );

    // Woodpecker doesn't have equivalent env files like GitHub Actions
    // but we can pass through Woodpecker CI environment variables
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith("CI_") || key.startsWith("WOODPECKER_")) {
        inputEnvsWithDefaults.push(`${key}=${value}`);
      }
    }

    if (config.runCmd) {
      console.log("");
      console.log("▶️  Running command in dev container...");

      // Get the built image name
      let builtImageName: string;
      if (fullImageNameArray.length > 0) {
        builtImageName = fullImageNameArray[0];
      } else {
        // Find the most recently created image starting with vsc-
        const { stdout: imagesOutput } = await exec(
          "docker",
          [
            "images",
            "--format",
            "{{.Repository}}:{{.Tag}}",
            "--filter",
            "reference=vsc-*",
          ],
          {},
        );
        const images = imagesOutput
          .trim()
          .split("\n")
          .filter((img) => img && img.startsWith("vsc-"));
        if (images.length === 0) {
          console.error("❌ Could not find built devcontainer image");
          process.exit(1);
        }
        builtImageName = images[0];
        console.log(`Using built image: ${builtImageName}`);
      }

      // Build environment variable flags
      const envFlags = inputEnvsWithDefaults.map((e) => ["-e", e]).flat();

      // Get the current container's workspace mount to reuse it
      const hostname = os.hostname();
      const { stdout: inspectOutput } = await exec(
        "docker",
        ["inspect", hostname],
        {},
      );
      const containerInfo = JSON.parse(inspectOutput)[0];

      // Find the /woodpecker mount
      let volumeMount = "";
      for (const mount of containerInfo.Mounts) {
        if (
          mount.Destination === "/woodpecker" ||
          mount.Destination.startsWith("/woodpecker")
        ) {
          if (mount.Type === "volume") {
            volumeMount = `${mount.Name}:/workspace`;
          } else if (mount.Type === "bind") {
            volumeMount = `${mount.Source}:/workspace`;
          }
          break;
        }
      }

      // Run container with workspace mounted
      const dockerArgs = [
        "run",
        "--rm",
        ...envFlags,
        "-v",
        volumeMount || `${workspaceFolder}:/workspace`,
        "-w",
        "/workspace",
        builtImageName,
        "bash",
        "-c",
        config.runCmd,
      ];

      console.log(`Executing: docker ${dockerArgs.join(" ")}`);
      const { exitCode, stdout, stderr } = await exec("docker", dockerArgs, {});

      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);

      if (exitCode !== 0) {
        console.error(
          `❌ Command execution failed with exit code: ${exitCode}`,
        );
        process.exit(exitCode || 1);
      }
      console.log("✅ Command executed successfully");
    } else {
      console.log("");
      console.log("ℹ️  No runCmd set - skipping container start and execution");
    }

    // 5. Push image (if configured)
    console.log("");
    await handleImagePush(config, imageTagArray);

    console.log("");
    console.log("✅ Plugin execution completed successfully!");
  } catch (error) {
    console.error("❌ Plugin execution failed:", error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Handle image push based on configuration
 */
async function handleImagePush(
  config: ReturnType<typeof parsePluginConfig>,
  imageTagArray: string[],
): Promise<void> {
  // Skip if no image name is set
  if (!config.imageName) {
    console.log("ℹ️  Image push skipped - no imageName configured");
    return;
  }

  // Check push option
  if (config.push === "never") {
    console.log(`ℹ️  Image push skipped because 'push' is set to 'never'`);
    return;
  }

  // Handle filter mode
  if (config.push === "filter") {
    // Woodpecker CI environment variables
    // See: https://woodpecker-ci.org/docs/usage/environment
    const ref = process.env.CI_COMMIT_REF; // e.g., refs/heads/main
    const event = process.env.CI_PIPELINE_EVENT; // e.g., push, pull_request, tag

    if (config.refFilterForPush) {
      const refFilters = config.refFilterForPush
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      if (refFilters.length > 0 && !refFilters.some((s) => s === ref)) {
        console.log(
          `ℹ️  Image push skipped because CI_COMMIT_REF (${ref}) is not in refFilterForPush`,
        );
        return;
      }
    }

    if (config.eventFilterForPush) {
      const eventFilters = config.eventFilterForPush
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      if (eventFilters.length > 0 && !eventFilters.some((s) => s === event)) {
        console.log(
          `ℹ️  Image push skipped because CI_PIPELINE_EVENT (${event}) is not in eventFilterForPush`,
        );
        return;
      }
    }
  } else if (config.push !== "always") {
    console.error(`❌ Unexpected push value ('${config.push}')`);
    process.exit(1);
  }

  // Push the image(s)
  console.log("📌 Pushing image(s)...");

  if (config.platform) {
    // Multi-platform build - use skopeo
    for (const tag of imageTagArray) {
      console.log(
        `Copying multiplatform image '${config.imageName}:${tag}'...`,
      );
      const imageSource = `oci-archive:/tmp/output.tar:${tag}`;
      const imageDest = `docker://${config.imageName}:${tag}`;

      const success = await copyImage(true, imageSource, imageDest);
      if (!success) {
        console.error(`❌ Failed to copy image ${config.imageName}:${tag}`);
        process.exit(1);
      }
    }
  } else {
    // Single platform - use docker push
    for (const tag of imageTagArray) {
      console.log(`Pushing image '${config.imageName}:${tag}'...`);
      const success = await pushImage(config.imageName, tag);
      if (!success) {
        console.error(`❌ Failed to push image ${config.imageName}:${tag}`);
        process.exit(1);
      }
    }
  }

  console.log("✅ Image(s) pushed successfully");
}

// Run the plugin
main();
