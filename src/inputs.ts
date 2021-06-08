import * as core from '@actions/core'
import csvparse from 'csv-parse/lib/sync'

export async function getInputList(name: string): Promise<string[]> {
	const input = core.getInput(name)
	return await parseInputAsList(input)
}
export async function parseInputAsList(input: string): Promise<string[]> {
	const res: string[] = []
	if (input === '') {
		return res
	}
	const parsedInput = (await csvparse(input, {
		columns: false,
		relax: true,
		relaxColumnCount: true,
		skipLinesWithEmptyValues: true
	})) as string[][]

	for (const items of parsedInput) {
		res.push(...items)
	}

	return res.map(item => item.trim())
}

export async function getInputRecord(
	name: string
): Promise<Record<string, string>> {
	const input = core.getInput(name)
	return await parseInputAsRecord(input)
}
export async function parseInputAsRecord(
	input: string
): Promise<Record<string, string>> {
	const res: Record<string, string> = {}

	const items = await parseInputAsList(input)

	for (const item of items) {
		const separatorIndex = item.indexOf('=')
		if (separatorIndex < 0) {
			throw new Error(`Separator '=' not found in '${item}'`)
		}
		const key = item.substring(0, separatorIndex)
		const value = item.substring(separatorIndex + 1)
		res[key] = value
	}

	return res
}
