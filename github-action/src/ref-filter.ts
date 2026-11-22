/** Match a complete, case-sensitive ref. A star never crosses a slash. */
export function matchesRefGlob(pattern: string, ref: string): boolean {
	const patternSegments = pattern.split('/');
	const refSegments = ref.split('/');
	return (
		patternSegments.length === refSegments.length &&
		patternSegments.every((segment, index) =>
			matchesSegment(segment, refSegments[index]),
		)
	);
}

function matchesSegment(pattern: string, segment: string): boolean {
	const parts = pattern.split('*');
	if (parts.length === 1) {
		return pattern === segment;
	}

	const prefix = parts[0];
	const suffix = parts[parts.length - 1];
	const end = segment.length - suffix.length;
	if (!segment.startsWith(prefix) || !segment.endsWith(suffix)) {
		return false;
	}

	// Match the literal pieces left to right without overlapping the suffix.
	let position = prefix.length;
	for (const part of parts.slice(1, -1)) {
		const start = segment.indexOf(part, position);
		if (start === -1 || start + part.length > end) {
			return false;
		}
		position = start + part.length;
	}
	return position <= end;
}
