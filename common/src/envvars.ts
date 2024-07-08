export function substituteValues(input: string): string {
	// Find all `${...}` entries and substitute
	// Note the non-greedy `.+?` match to avoid matching the start of
	// one placeholder up to the end of another when multiple placeholders are present
	return input.replace(/\$\{(.+?)\}/g, getSubstitutionValue);
}

function getSubstitutionValue(regexMatch: string, placeholder: string): string {
	// Substitution values are in TYPE:KEY form
	// e.g. env:MY_ENV

	const parts = placeholder.split(':');
	if (parts.length === 2) {
		const type = parts[0];
		const key = parts[1];
		switch (type.toLowerCase()) {
			case 'env':
			case 'localenv':
				return process.env[key] ?? '';
		}
	}

	// if we can't process the format then return the original string
	// as having it present in any output will likely make issues more obvious
	return regexMatch;
}

// populateDefaults expects strings either "FOO=hello" or "BAR".
// In the latter case, the corresponding returned item would be "BAR=hi"
// where the value is taken from the matching process env var.
// In the case of values not set in the process, they are omitted
export function populateDefaults(envs: string[], inerhitEnv: boolean): string[] {
	const result: string[] = [];
	if (inerhitEnv) {
		for (const [key, value] of Object.entries(process.env)) {
			result.push(`${key}=${value}`);
		}
	}
	for (let i = 0; i < envs.length; i++) {
		const inputEnv = envs[i];
		if (inputEnv.indexOf('=') >= 0) {
			// pass straight through to result
			result.push(inputEnv);
		} else {
			// inputEnv is just the env var name
			const processEnvValue = process.env[inputEnv];
			if (processEnvValue) {
				result.push(`${inputEnv}=${processEnvValue}`);
			}
		}
	}
	return result;
}
