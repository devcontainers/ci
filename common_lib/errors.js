import { types } from 'util';
function isString(value) {
    return typeof (value) === 'string';
}
export function errorToString(error) {
    if (isString(error)) {
        return error;
    }
    if (types.isNativeError(error)) {
        return error.message;
    }
    return JSON.stringify(error);
}
