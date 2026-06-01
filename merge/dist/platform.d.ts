/**
 * Convert a platform string to a Docker-tag-safe suffix.
 *
 * Example: platformToTagSuffix('linux/amd64') => 'linux-amd64'
 */
export declare function platformToTagSuffix(platform: string): string;
/**
 * Build full image name strings, optionally suffixed with a platform suffix.
 *
 * Example:
 *   buildImageNames('ghcr.io/org/img', ['v1', 'latest'], 'linux-amd64')
 *   => ['ghcr.io/org/img:v1-linux-amd64', 'ghcr.io/org/img:latest-linux-amd64']
 */
export declare function buildImageNames(imageName: string, imageTags: string[], platformSuffix?: string): string[];
/**
 * Create multi-arch manifests for each image tag by merging per-platform images.
 *
 * Platforms are provided in standard format (e.g., 'linux/amd64,linux/arm64')
 * and tag suffixes are auto-derived via platformToTagSuffix.
 *
 * Returns true if all manifests were created successfully, false otherwise.
 */
export declare function mergeMultiPlatformImages(imageName: string, imageTags: string[], platforms: string, createFn: (imageName: string, tag: string, platformSuffixes: string[]) => Promise<boolean>, log: (message: string) => void): Promise<boolean>;
