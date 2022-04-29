import path from 'path';
export function getAbsolutePath(inputPath, referencePath) {
    if (path.isAbsolute(inputPath)) {
        return inputPath;
    }
    return path.join(referencePath, inputPath);
}
