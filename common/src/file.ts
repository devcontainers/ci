import path from 'path';

export function getAbsolutePath(
	inputPath: string,
	referencePath: string
): string {
	if (path.isAbsolute(inputPath)) {
		return inputPath;
	}
	return path.join(referencePath, inputPath);
}
