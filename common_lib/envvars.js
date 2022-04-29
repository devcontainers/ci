export function substituteValues(input) {
    // Find all `${...}` entries and substitute
    // Note the non-greedy `.+?` match to avoid matching the start of
    // one placeholder up to the end of another when multiple placeholders are present
    return input.replace(/\$\{(.+?)\}/g, getSubstitutionValue);
}
function getSubstitutionValue(regexMatch, placeholder) {
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
