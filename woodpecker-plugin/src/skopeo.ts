import * as skopeo from "../../common/src/skopeo";
import { exec } from "./exec";

export async function isSkopeoInstalled(): Promise<boolean> {
  return await skopeo.isSkopeoInstalled(exec);
}

export async function copyImage(
  all: boolean,
  source: string,
  dest: string,
): Promise<boolean> {
  console.log("📌 Copying image...");
  try {
    await skopeo.copyImage(exec, all, source, dest);
    console.log("✅ Image copy completed successfully");
    return true;
  } catch (error) {
    console.error("❌ Image copy failed:", error);
    return false;
  }
}
