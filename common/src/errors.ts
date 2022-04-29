import {types} from 'util';

function isString(value: any) : value is string {
	return typeof(value) === 'string';
}
export function errorToString(error: any) :string{
	if (isString(error)){
		return error;
	}
	if (types.isNativeError(error)){
		return error.message;
	}
	return JSON.stringify(error);
}