/**
 * Convert a platform string to a Docker-tag-safe suffix.
 *
 * Example: platformToTagSuffix('linux/amd64') => 'linux-amd64'
 */
export function platformToTagSuffix(platform: string): string {
	return platform.replace(/\//g, '-');
}

/**
 * Build full image name strings, optionally suffixed with a platform suffix.
 *
 * Example:
 *   buildImageNames('ghcr.io/org/img', ['v1', 'latest'], 'linux-amd64')
 *   => ['ghcr.io/org/img:v1-linux-amd64', 'ghcr.io/org/img:latest-linux-amd64']
 */
export function buildImageNames(
	imageName: string,
	imageTags: string[],
	platformSuffix?: string,
): string[] {
	return imageTags.map(tag =>
		platformSuffix
			? `${imageName}:${tag}-${platformSuffix}`
			: `${imageName}:${tag}`,
	);
}

/**
 * Create multi-arch manifests for each image tag by merging per-platform images.
 *
 * Platforms are provided in standard format (e.g., 'linux/amd64,linux/arm64')
 * and tag suffixes are auto-derived via platformToTagSuffix.
 *
 * Returns true if all manifests were created successfully, false otherwise.
 */
export async function mergeMultiPlatformImages(
	imageName: string,
	imageTags: string[],
	platforms: string,
	createFn: (
		imageName: string,
		tag: string,
		platformSuffixes: string[],
	) => Promise<boolean>,
	log: (message: string) => void,
): Promise<boolean> {
	const platformSuffixes = platforms
		.split(/\s*,\s*/)
		.map(platformToTagSuffix);
	for (const tag of imageTags) {
		log(`Creating multi-arch manifest for '${imageName}:${tag}'...`);
		const success = await createFn(imageName, tag, platformSuffixes);
		if (!success) {
			return false;
		}
	}
	return true;
}
