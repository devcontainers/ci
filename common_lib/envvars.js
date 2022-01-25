"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.substituteValues = void 0;
function substituteValues(input) {
    // Find all `${...}` entries and substitute
    // Note the non-greedy `.+?` match to avoid matching the start of
    // one placeholder up to the end of another when multiple placeholders are present
    return input.replace(/\$\{(.+?)\}/g, getSubstitutionValue);
}
exports.substituteValues = substituteValues;
function getSubstitutionValue(regexMatch, placeholder) {
    // Substitution values are in TYPE:KEY form
    // e.g. env:MY_ENV
    var _a;
    const parts = placeholder.split(':');
    if (parts.length === 2 || parts.length === 3) {
        const type = parts[0];
        const key = parts[1];
        const defaultValue = (parts.length === 3) ? parts[2] : '';
        switch (type.toLowerCase()) {
            case 'env':
            case 'localenv':
                return (_a = process.env[key]) !== null && _a !== void 0 ? _a : defaultValue;
        }
    }
    // if we can't process the format then return the original string
    // as having it present in any output will likely make issues more obvious
    return regexMatch;
}
