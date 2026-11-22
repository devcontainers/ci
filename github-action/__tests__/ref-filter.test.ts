import {matchesRefGlob} from '../src/ref-filter';

describe('matchesRefGlob', () => {
	test.each([
		['refs/heads/releases/v1.4', 'refs/heads/releases/v*', true],
		['refs/heads/releases/v', 'refs/heads/releases/v*', true],
		['refs/heads/releases/v1/patch', 'refs/heads/releases/v*', false],
		['refs/heads/releases/v1/patch', 'refs/heads/releases/**', false],
		['refs/heads/releases/v1', 'refs/heads/releases/**', true],
		['refs/heads/releases/V1', 'refs/heads/releases/v*', false],
		['refs/tags/releases/v1', 'refs/heads/releases/v*', false],
		['refs/heads/feature/foo/patch', 'refs/heads/*/foo/*', true],
		['refs/heads/v.1+work-rc', 'refs/heads/v.1+*-*', true],
		['refs/heads/vX1+work-rc', 'refs/heads/v.1+*-*', false],
		['refs/heads/abc', 'refs/heads/ab*bc', false],
		['refs/heads/abbc', 'refs/heads/ab*bc', true],
		['refs/heads/aba', 'refs/heads/a*b*a', true],
		['refs/heads/aa', 'refs/heads/a*a*a', false],
		['refs/heads/v[12]', 'refs/heads/v[12]', true],
		['refs/heads/v1', 'refs/heads/v[12]', false],
	])('matches %s against %s: %s', (ref, pattern, expected) => {
		expect(matchesRefGlob(pattern, ref)).toBe(expected);
	});
});
