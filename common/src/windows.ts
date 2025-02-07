/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as fs from 'fs';

// From Dev Containers CLI
export async function findWindowsExecutable(command: string): Promise<string> {
	if (process.platform !== 'win32') {
		return command;
	}

	// If we have an absolute path then we take it.
	if (path.isAbsolute(command)) {
		return await findWindowsExecutableWithExtension(command) || command;
	}
	const cwd = process.cwd();
	if (/[/\\]/.test(command)) {
		// We have a directory and the directory is relative (see above). Make the path absolute
		// to the current working directory.
		const fullPath = path.join(cwd, command);
		return await findWindowsExecutableWithExtension(fullPath) || fullPath;
	}
	let pathValue: string | undefined = undefined;
	let paths: string[] | undefined = undefined;
	const env = process.env;
	// Path can be named in many different ways and for the execution it doesn't matter
	for (let key of Object.keys(env)) {
		if (key.toLowerCase() === 'path') {
			const value = env[key];
			if (typeof value === 'string') {
				pathValue = value;
				paths = value.split(path.delimiter)
					.filter(Boolean);
			}
			break;
		}
	}
	// No PATH environment. Bail out.
	if (paths === void 0 || paths.length === 0) {
		const err = new Error(`No PATH to look up executable '${command}'.`);
		(err as any).code = 'ENOENT';
		throw err;
	}
	// We have a simple file name. We get the path variable from the env
	// and try to find the executable on the path.
	for (let pathEntry of paths) {
		// The path entry is absolute.
		let fullPath: string;
		if (path.isAbsolute(pathEntry)) {
			fullPath = path.join(pathEntry, command);
		} else {
			fullPath = path.join(cwd, pathEntry, command);
		}
		const withExtension = await findWindowsExecutableWithExtension(fullPath);
		if (withExtension) {
			return withExtension;
		}
	}
	// Not found in PATH. Bail out.
	const err = new Error(`Exectuable '${command}' not found on PATH '${pathValue}'.`);
	(err as any).code = 'ENOENT';
	throw err;
}

const pathext = process.env.PATHEXT;
const executableExtensions = pathext ? pathext.toLowerCase().split(';') : ['.com', '.exe', '.bat', '.cmd'];

async function findWindowsExecutableWithExtension(fullPath: string) {
	if (executableExtensions.indexOf(path.extname(fullPath)) !== -1) {
		return await isFile(fullPath) ? fullPath : undefined;
	}
	for (const ext of executableExtensions) {
		const withExtension = fullPath + ext;
		if (await isFile(withExtension)) {
			return withExtension;
		}
	}
	return undefined;
}

function isFile(filepath: string): Promise<boolean> {
	return new Promise(r => fs.stat(filepath, (err, stat) => r(!err && stat.isFile())));
}
