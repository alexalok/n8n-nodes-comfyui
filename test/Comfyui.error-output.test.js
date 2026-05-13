const assert = require('node:assert/strict');
const test = require('node:test');

const { Comfyui } = require('../dist/nodes/ComfyUI/Comfyui.node.js');

function createExecuteContext({ onError = 'continueErrorOutput', requestError }) {
	const nodeContext = {};

	return {
		nodeContext,
		getCredentials: async () => ({
			apiUrl: 'https://comfy.example',
			apiKey: '',
		}),
		getExecutionId: () => 'exec-1',
		getNode: () => ({
			id: 'node-1',
			name: 'ComfyUI',
			type: 'n8n-nodes-comfyui-ex.comfyui',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
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
		getInputData: () => [{ json: { source: 'input' } }],
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

test('returns an error-route item and stores node context when configured to continue using error output', async () => {
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
