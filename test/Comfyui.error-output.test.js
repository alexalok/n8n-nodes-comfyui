const assert = require('node:assert/strict');
const test = require('node:test');

const { NodeApiError } = require('n8n-workflow');
const { Comfyui } = require('../dist/nodes/ComfyUI/Comfyui.node.js');

const nodeDescription = {
	id: 'node-1',
	name: 'ComfyUI',
	type: 'n8n-nodes-comfyui-ex.comfyui',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

function createExecuteContext({
	onError = 'continueErrorOutput',
	requestError,
	inputData = [{ json: { source: 'input' } }],
}) {
	const nodeContext = {};

	return {
		nodeContext,
		getCredentials: async () => ({
			apiUrl: 'https://comfy.example',
			apiKey: '',
		}),
		getExecutionId: () => 'exec-1',
		getNode: () => ({
			...nodeDescription,
			onError,
		}),
		getNodeParameter: (name) => {
			const parameters = {
				workflow: '{}',
				timeout: 30,
				outputFormat: 'jpeg',
				jpegQuality: 80,
			};

			return parameters[name];
		},
		getInputData: () => inputData,
		getContext: (type) => {
			assert.equal(type, 'node');
			return nodeContext;
		},
		helpers: {
			request: async () => {
				throw requestError;
			},
		},
	};
}

function routeContinueErrorOutput(nodeSuccessData) {
	const successItems = [];
	const errorItems = [];

	for (const item of nodeSuccessData[0] ?? []) {
		const hasError =
			item.error ||
			(item.json.error && Object.keys(item.json).length === 1) ||
			(item.json.error && item.json.message && Object.keys(item.json).length === 2);

		if (hasError) {
			errorItems.push(item);
		} else {
			successItems.push(item);
		}
	}

	return [successItems, errorItems];
}

test('returns an item n8n core routes to error output and stores node context', async () => {
	const requestError = Object.assign(
		new Error('529 - {"error":"No instances available, try again later"}'),
		{
			httpCode: 529,
			response: {
				body: {
					error: 'No instances available, try again later',
				},
			},
		},
	);
	const executeContext = createExecuteContext({ requestError });

	const result = await Comfyui.prototype.execute.call(executeContext);

	assert.equal(result.length, 1);
	assert.equal(result[0].length, 1);
	assert.deepEqual(result[0][0].pairedItem, { item: 0 });
	assert.equal(
		result[0][0].json.message,
		'ComfyUI API Error: 529 - {"error":"No instances available, try again later"}',
	);
	assert.equal(result[0][0].json.error.message, result[0][0].json.message);
	assert.equal(result[0][0].json.error.httpCode, '529');
	assert.deepEqual(result[0][0].json.error.responseBody, {
		error: 'No instances available, try again later',
	});
	assert.equal(executeContext.nodeContext.lastError.message, result[0][0].json.message);
	assert.match(executeContext.nodeContext.lastError.stack, /No instances available/);

	const routedOutputs = routeContinueErrorOutput(result);
	assert.deepEqual(routedOutputs[0], []);
	assert.deepEqual(routedOutputs[1], [result[0][0]]);
});

test('throws the ComfyUI API error when not configured for error output', async () => {
	const requestError = new Error('Connection refused');
	const executeContext = createExecuteContext({
		onError: 'stopWorkflow',
		requestError,
	});

	await assert.rejects(
		() => Comfyui.prototype.execute.call(executeContext),
		/ComfyUI API Error: Connection refused/,
	);
	assert.equal(executeContext.nodeContext.lastError.message, 'ComfyUI API Error: Connection refused');
});

test('coerces non-string error messages before routing to error output', async () => {
	const executeContext = createExecuteContext({
		requestError: {
			message: {
				error: 'No instances available',
			},
		},
	});

	const result = await Comfyui.prototype.execute.call(executeContext);

	assert.equal(result[0][0].json.message, 'ComfyUI API Error: [object Object]');
	assert.equal(executeContext.nodeContext.lastError.message, result[0][0].json.message);
});

test('pairs error output to every input item when multiple items were received', async () => {
	const executeContext = createExecuteContext({
		requestError: new Error('Queue unavailable'),
		inputData: [{ json: { source: 'first' } }, { json: { source: 'second' } }],
	});

	const result = await Comfyui.prototype.execute.call(executeContext);

	assert.deepEqual(result[0][0].pairedItem, [{ item: 0 }, { item: 1 }]);
});

test('preserves existing NodeApiError metadata when routing to error output', async () => {
	const requestError = new NodeApiError(
		nodeDescription,
		{ message: 'Prompt contains no status' },
		{
			message: 'Prompt contains no status',
			description: 'History entry had no status field',
			httpCode: '503',
		},
	);
	const executeContext = createExecuteContext({ requestError });

	const result = await Comfyui.prototype.execute.call(executeContext);

	assert.equal(result[0][0].json.message, 'Prompt contains no status');
	assert.equal(result[0][0].json.error.message, 'Prompt contains no status');
	assert.equal(result[0][0].json.error.description, 'History entry had no status field');
	assert.equal(result[0][0].json.error.httpCode, '503');
	assert.equal(executeContext.nodeContext.lastError.message, 'Prompt contains no status');
});

test('sanitizes non-string stack values before storing node context', async () => {
	const executeContext = createExecuteContext({
		requestError: {
			message: 'Queue unavailable',
			stack: () => 'object stack',
		},
	});

	await Comfyui.prototype.execute.call(executeContext);

	assert.equal(executeContext.nodeContext.lastError.stack, undefined);
});
