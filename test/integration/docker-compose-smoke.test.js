const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '../..');
const composeFile = path.join(__dirname, 'docker-compose.yml');
const n8nDockerfile = path.join(__dirname, 'n8n.Dockerfile');
const projectName = `n8n-comfyui-it-${process.pid}`;
const n8nPort = process.env.N8N_INTEGRATION_PORT || String(15678 + (process.pid % 1000));
const comfyuiPort =
	process.env.COMFYUI_INTEGRATION_PORT || String(18188 + (process.pid % 1000));
const composeEnv = {
	...process.env,
	N8N_INTEGRATION_PORT: n8nPort,
	COMFYUI_INTEGRATION_PORT: comfyuiPort,
};

function docker(args, options = {}) {
	const result = spawnSync('docker', args, {
		cwd: projectRoot,
		encoding: 'utf8',
		env: composeEnv,
		timeout: options.timeout || 120_000,
	});

	if (result.error) {
		throw result.error;
	}

	if (options.allowFailure) {
		return result;
	}

	if (result.status !== 0) {
		throw new Error(
			[
				`docker ${args.join(' ')} failed with exit code ${result.status}`,
				result.stdout,
				result.stderr,
			]
				.filter(Boolean)
				.join('\n'),
		);
	}

	return result.stdout;
}

function composeArgs(...args) {
	return ['compose', '-f', composeFile, '-p', projectName, ...args];
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForResponse(url, label, validate, timeoutMs = 300_000) {
	const deadline = Date.now() + timeoutMs;
	let lastError;

	while (Date.now() < deadline) {
		try {
			const response = await fetch(url);
			const body = await response.text();
			if (response.ok && validate(body, response)) {
				return body;
			}
			lastError = `${response.status} ${response.statusText}: ${body.slice(0, 500)}`;
		} catch (error) {
			lastError = error.message;
		}

		await sleep(2_000);
	}

	throw new Error(`${label} not ready at ${url}: ${lastError}`);
}

test('docker compose stack starts n8n with local ComfyUI node and reaches ComfyUI API', async (t) => {
	if (process.env.COMFYUI_INTEGRATION_SKIP_DOCKER === '1') {
		t.skip('COMFYUI_INTEGRATION_SKIP_DOCKER=1');
	}

	assert.ok(existsSync(composeFile), `${composeFile} missing`);
	assert.ok(existsSync(n8nDockerfile), `${n8nDockerfile} missing`);

	t.after(() => {
		if (process.env.COMFYUI_INTEGRATION_KEEP === '1') {
			return;
		}
		docker(composeArgs('down', '--volumes', '--remove-orphans'), { timeout: 120_000 });
	});

	docker(composeArgs('up', '--build', '--detach', 'n8n', 'comfyui'), { timeout: 900_000 });

	await waitForResponse(
		`http://127.0.0.1:${n8nPort}/healthz`,
		'n8n health endpoint',
		(body) => body.includes('OK') || body.includes('ok') || body.length >= 0,
		180_000,
	);

	await waitForResponse(
		`http://127.0.0.1:${comfyuiPort}/system_stats`,
		'ComfyUI system_stats endpoint',
		(body) => JSON.parse(body).system !== undefined,
	);

	const execution = docker(
		composeArgs(
			'run',
			'--rm',
			'--no-deps',
			'--entrypoint',
			'sh',
			'-T',
			'n8n',
			'-lc',
			'n8n import:workflow --input=/integration-fixtures/comfyui-node-smoke.workflow.json && n8n execute --id=comfyui-node-load-smoke',
		),
		{ allowFailure: true, timeout: 120_000 },
	);
	const executionOutput = `${execution.stdout}\n${execution.stderr}`;

	assert.notEqual(execution.status, 0, 'fixture workflow should fail before credentials exist');
	assert.doesNotMatch(executionOutput, /Unrecognized node type|node type .*not found/i);
	assert.match(executionOutput, /credential|credentials/i);

	docker(
		composeArgs(
			'exec',
			'-T',
			'n8n',
			'node',
			'-e',
			"fetch('http://comfyui:8188/system_stats').then(async (response) => { if (!response.ok) throw new Error(`${response.status} ${await response.text()}`); const body = await response.json(); if (!body.system) throw new Error('missing system stats'); }).catch((error) => { console.error(error); process.exit(1); })",
		),
	);
});
