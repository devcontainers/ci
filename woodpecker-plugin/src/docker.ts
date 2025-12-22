import * as docker from "../../common/src/docker";
import { exec } from "./exec";

export async function isDockerBuildXInstalled(): Promise<boolean> {
  return await docker.isDockerBuildXInstalled(exec);
}

export async function pushImage(
  imageName: string,
  imageTag: string | undefined,
): Promise<boolean> {
  console.log("📌 Pushing image...");
  try {
    await docker.pushImage(exec, imageName, imageTag);
    console.log("✅ Push completed successfully");
    return true;
  } catch (error) {
    console.error("❌ Push failed:", error);
    return false;
  }
}
