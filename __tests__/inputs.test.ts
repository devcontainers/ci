import parse from 'csv-parse'
import {
	parseInputAsList,
	parseInputAsRecord
} from '../src/inputs'

describe('parseInputAsList', () => {
	test('parses list from input', async () => {
		const input = `
item1
item2
`
		const result = await parseInputAsList(input)
		expect(result).toStrictEqual(['item1', 'item2'])
	})
})



describe('parseInputAsList', () => {
	test('parses list from input', async () => {
		const input = `
item1=value1
item2=value2
`
		const result = await parseInputAsRecord(input)
		expect(result).toStrictEqual({'item1': 'value1', 'item2':'value2'})
	})
})

