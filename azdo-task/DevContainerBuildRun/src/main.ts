import * as tl from 'azure-pipelines-task-lib/task'

async function run(): Promise<void> {
	try {
		const imageName = tl.getInput('imageName', true)
		// if (imageName === 'bad') {
		// 	tl.setResult(tl.TaskResult.Failed, 'Bad input was given')
		// 	return
		// }
		console.log('Hello', imageName)
	} catch (err) {
		tl.setResult(tl.TaskResult.Failed, err.message)
	}
}

run()
