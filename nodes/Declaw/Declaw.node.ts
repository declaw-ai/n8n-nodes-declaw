import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { sandboxOperations, sandboxFields } from './descriptions/SandboxDescription';
import { commandOperations, commandFields } from './descriptions/CommandDescription';
import { fileOperations, fileFields } from './descriptions/FileDescription';
import { snapshotOperations, snapshotFields } from './descriptions/SnapshotDescription';
import { codeOperations, codeFields } from './descriptions/CodeDescription';
import { declawApiRequest } from './transport/request';

interface KeyValueEntry {
	key: string;
	value: string;
}

interface FullResponse {
	body: ArrayBuffer;
	headers: Record<string, string>;
}

export class Declaw implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Declaw',
		name: 'declaw',
		icon: 'file:declaw.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Run code securely in Firecracker microVM sandboxes — create sandboxes, execute commands, manage files',
		defaults: { name: 'Declaw' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'declawApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Code Interpreter', value: 'code' },
					{ name: 'Command', value: 'command' },
					{ name: 'File', value: 'file' },
					{ name: 'Sandbox', value: 'sandbox' },
					{ name: 'Snapshot', value: 'snapshot' },
				],
				default: 'sandbox',
			},
			...codeOperations,
			...sandboxOperations,
			...commandOperations,
			...fileOperations,
			...snapshotOperations,
			...codeFields,
			...sandboxFields,
			...commandFields,
			...fileFields,
			...snapshotFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject | IDataObject[] | FullResponse;

				if (resource === 'code') {
					const result = await executeCode.call(this, i);
					const jsonArray = this.helpers.returnJsonArray(result);
					const executionData = this.helpers.constructExecutionMetaData(jsonArray, {
						itemData: { item: i },
					});
					returnData.push(...executionData);
					continue;
				} else if (resource === 'sandbox') {
					responseData = await executeSandbox.call(this, operation, i);
				} else if (resource === 'command') {
					responseData = await executeCommand.call(this, operation, i);
				} else if (resource === 'file') {
					responseData = await executeFile.call(this, operation, i);
				} else if (resource === 'snapshot') {
					responseData = await executeSnapshot.call(this, operation, i);
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`, {
						itemIndex: i,
					});
				}

				if (resource === 'file' && operation === 'readBinary') {
					const binaryPropertyName = this.getNodeParameter(
						'binaryPropertyName',
						i,
						'data',
					) as string;
					const filePath = this.getNodeParameter('path', i) as string;
					const fileName = filePath.split('/').pop() || 'file';
					const fullResp = responseData as FullResponse;

					const contentType =
						fullResp.headers?.['content-type'] || 'application/octet-stream';

					returnData.push({
						json: { path: filePath },
						binary: {
							[binaryPropertyName]: await this.helpers.prepareBinaryData(
								Buffer.from(fullResp.body),
								fileName,
								contentType,
							),
						},
						pairedItem: { item: i },
					});
				} else {
					const jsonArray = this.helpers.returnJsonArray(
						responseData as IDataObject | IDataObject[],
					);
					const executionData = this.helpers.constructExecutionMetaData(jsonArray, {
						itemData: { item: i },
					});
					returnData.push(...executionData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

function kvToMap(entries: KeyValueEntry[] | undefined): Record<string, string> {
	const result: Record<string, string> = {};
	if (!entries) return result;
	for (const entry of entries) {
		result[entry.key] = entry.value;
	}
	return result;
}

function parseJsonSafe(jsonStr: string, label: string, context: IExecuteFunctions, itemIndex: number): unknown {
	let parsed: unknown;
	try {
		parsed = JSON.parse(jsonStr);
	} catch {
		throw new NodeOperationError(context.getNode(), `Invalid ${label} JSON: ${jsonStr.slice(0, 100)}`, {
			itemIndex,
		});
	}
	if (parsed === null || typeof parsed !== 'object') {
		throw new NodeOperationError(context.getNode(), `${label} JSON must be an object or array, got ${typeof parsed}`, {
			itemIndex,
		});
	}
	return parsed;
}

// ---------------------------------------------------------------------------
// Sandbox operations
// ---------------------------------------------------------------------------

async function executeSandbox(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'create') {
		const template = this.getNodeParameter('template', i, 'base') as string;
		const timeout = this.getNodeParameter('createTimeout', i, 300) as number;
		const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

		const body: IDataObject = { template, timeout };

		if (additionalFields.envs) {
			const envsData = additionalFields.envs as IDataObject;
			body.envs = kvToMap(envsData.env as KeyValueEntry[] | undefined);
		}

		if (additionalFields.metadata) {
			const metaData = additionalFields.metadata as IDataObject;
			body.metadata = kvToMap(metaData.meta as KeyValueEntry[] | undefined);
		}

		const network: IDataObject = {};
		if (additionalFields.networkAllowOut) {
			const allowOut = (additionalFields.networkAllowOut as string)
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
			if (allowOut.length > 0) {
				network.allow_out = allowOut;
			}
		}
		if (additionalFields.networkDenyOut) {
			const denyOut = (additionalFields.networkDenyOut as string)
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
			if (denyOut.length > 0) {
				network.deny_out = denyOut;
			}
		}
		if (Object.keys(network).length > 0) {
			body.network = network;
		}

		if (additionalFields.securityPolicyJson) {
			body.security = parseJsonSafe(
				additionalFields.securityPolicyJson as string,
				'Security policy',
				this,
				i,
			) as IDataObject;
		} else {
			const security: IDataObject = {};

			if (additionalFields.enablePiiProtection) {
				security.pii = {
					enabled: true,
					action: (additionalFields.piiAction as string) || 'redact',
					types: (additionalFields.piiTypes as string[]) || [
						'email',
						'phone_number',
						'ssn',
						'credit_card',
					],
					rehydrate_response: false,
				};
			}

			if (additionalFields.enableInjectionDefense) {
				security.injection_defense = {
					enabled: true,
					sensitivity: (additionalFields.injectionSensitivity as string) || 'medium',
					action: 'block',
					threshold: 0.8,
				};
			}

			if (Object.keys(security).length > 0) {
				body.security = security;
			}
		}

		return declawApiRequest.call(this, {
			method: 'POST',
			path: '/sandboxes',
			body,
		}) as Promise<IDataObject>;
	}

	if (operation === 'list') {
		const resp = (await declawApiRequest.call(this, {
			method: 'GET',
			path: '/sandboxes',
		})) as IDataObject;
		return (resp.sandboxes as IDataObject[]) || [];
	}

	const sandboxId = this.getNodeParameter('sandboxId', i) as string;

	switch (operation) {
		case 'get':
			return declawApiRequest.call(this, {
				method: 'GET',
				path: `/sandboxes/${sandboxId}`,
			}) as Promise<IDataObject>;
		case 'kill':
			return declawApiRequest.call(this, {
				method: 'DELETE',
				path: `/sandboxes/${sandboxId}`,
			}) as Promise<IDataObject>;
		case 'pause':
			return declawApiRequest.call(this, {
				method: 'POST',
				path: `/sandboxes/${sandboxId}/pause`,
			}) as Promise<IDataObject>;
		case 'resume':
			return declawApiRequest.call(this, {
				method: 'POST',
				path: `/sandboxes/${sandboxId}/resume`,
			}) as Promise<IDataObject>;
		case 'setTimeout': {
			const newTimeout = this.getNodeParameter('newTimeout', i) as number;
			return declawApiRequest.call(this, {
				method: 'PATCH',
				path: `/sandboxes/${sandboxId}/timeout`,
				body: { timeout: newTimeout },
			}) as Promise<IDataObject>;
		}
		default:
			throw new NodeOperationError(
				this.getNode(),
				`Unknown sandbox operation: ${operation}`,
			);
	}
}

// ---------------------------------------------------------------------------
// Command operations
// ---------------------------------------------------------------------------

async function executeCommand(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const sandboxId = this.getNodeParameter('sandboxId', i) as string;

	switch (operation) {
		case 'run':
		case 'runBackground': {
			const cmd = this.getNodeParameter('cmd', i) as string;
			const body: IDataObject = {
				cmd,
				background: operation === 'runBackground',
			};

			const additionalFields = this.getNodeParameter(
				'additionalFields',
				i,
				{},
			) as IDataObject;

			if (additionalFields.cwd) {
				body.cwd = additionalFields.cwd;
			}
			if (additionalFields.timeout !== undefined) {
				body.timeout = additionalFields.timeout;
			}
			if (additionalFields.user) {
				body.user = additionalFields.user;
			}
			if (additionalFields.envs) {
				const envsData = additionalFields.envs as IDataObject;
				body.envs = kvToMap(envsData.env as KeyValueEntry[] | undefined);
			}

			return declawApiRequest.call(this, {
				method: 'POST',
				path: `/sandboxes/${sandboxId}/commands`,
				body,
			}) as Promise<IDataObject>;
		}
		case 'listProcesses': {
			const procs = await declawApiRequest.call(this, {
				method: 'GET',
				path: `/sandboxes/${sandboxId}/commands`,
			});
			return Array.isArray(procs) ? (procs as IDataObject[]) : [];
		}
		case 'killProcess': {
			const pid = this.getNodeParameter('pid', i) as number;
			return declawApiRequest.call(this, {
				method: 'DELETE',
				path: `/sandboxes/${sandboxId}/commands/${pid}`,
			}) as Promise<IDataObject>;
		}
		default:
			throw new NodeOperationError(
				this.getNode(),
				`Unknown command operation: ${operation}`,
			);
	}
}

// ---------------------------------------------------------------------------
// File operations
// ---------------------------------------------------------------------------

async function executeFile(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[] | FullResponse> {
	const sandboxId = this.getNodeParameter('sandboxId', i) as string;

	switch (operation) {
		case 'read': {
			const path = this.getNodeParameter('path', i) as string;
			return declawApiRequest.call(this, {
				method: 'GET',
				path: `/sandboxes/${sandboxId}/files`,
				qs: { path },
			}) as Promise<IDataObject>;
		}
		case 'readBinary': {
			const path = this.getNodeParameter('path', i) as string;
			return declawApiRequest.call(this, {
				method: 'GET',
				path: `/sandboxes/${sandboxId}/files/raw`,
				qs: { path },
				encoding: 'arraybuffer',
				json: false,
				returnFullResponse: true,
			}) as Promise<FullResponse>;
		}
		case 'write': {
			const path = this.getNodeParameter('path', i) as string;
			const data = this.getNodeParameter('data', i) as string;
			return declawApiRequest.call(this, {
				method: 'POST',
				path: `/sandboxes/${sandboxId}/files`,
				body: { path, data },
			}) as Promise<IDataObject>;
		}
		case 'writeBatch': {
			const filesJson = this.getNodeParameter('files', i) as string;
			const files = parseJsonSafe(filesJson, 'Files', this, i) as IDataObject[];
			return declawApiRequest.call(this, {
				method: 'POST',
				path: `/sandboxes/${sandboxId}/files/batch`,
				body: { files },
			}) as Promise<IDataObject>;
		}
		case 'listDirectory': {
			const path = this.getNodeParameter('directoryPath', i, '/') as string;
			return declawApiRequest.call(this, {
				method: 'GET',
				path: `/sandboxes/${sandboxId}/files/list`,
				qs: { path },
			}) as Promise<IDataObject[]>;
		}
		case 'exists': {
			const path = this.getNodeParameter('path', i) as string;
			return declawApiRequest.call(this, {
				method: 'GET',
				path: `/sandboxes/${sandboxId}/files/exists`,
				qs: { path },
			}) as Promise<IDataObject>;
		}
		case 'delete': {
			const path = this.getNodeParameter('path', i) as string;
			return declawApiRequest.call(this, {
				method: 'DELETE',
				path: `/sandboxes/${sandboxId}/files`,
				qs: { path },
			}) as Promise<IDataObject>;
		}
		case 'makeDirectory': {
			const path = this.getNodeParameter('path', i) as string;
			return declawApiRequest.call(this, {
				method: 'POST',
				path: `/sandboxes/${sandboxId}/files/mkdir`,
				body: { path },
			}) as Promise<IDataObject>;
		}
		default:
			throw new NodeOperationError(
				this.getNode(),
				`Unknown file operation: ${operation}`,
			);
	}
}

// ---------------------------------------------------------------------------
// Snapshot operations
// ---------------------------------------------------------------------------

async function executeSnapshot(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const sandboxId = this.getNodeParameter('sandboxId', i) as string;

	switch (operation) {
		case 'create':
			return declawApiRequest.call(this, {
				method: 'POST',
				path: `/sandboxes/${sandboxId}/snapshot`,
			}) as Promise<IDataObject>;
		case 'list': {
			const resp = (await declawApiRequest.call(this, {
				method: 'GET',
				path: `/sandboxes/${sandboxId}/snapshots`,
			})) as IDataObject;
			return (resp.snapshots as IDataObject[]) || [];
		}
		case 'restore': {
			const qs: Record<string, string> = {};
			const snapshotId = this.getNodeParameter('restoreSnapshotId', i, '') as string;
			if (snapshotId) {
				qs.snapshot_id = snapshotId;
			}
			return declawApiRequest.call(this, {
				method: 'POST',
				path: `/sandboxes/${sandboxId}/restore`,
				qs,
			}) as Promise<IDataObject>;
		}
		case 'delete': {
			const snapshotId = this.getNodeParameter('snapshotId', i) as string;
			return declawApiRequest.call(this, {
				method: 'DELETE',
				path: `/sandboxes/${sandboxId}/snapshots/${snapshotId}`,
			}) as Promise<IDataObject>;
		}
		default:
			throw new NodeOperationError(
				this.getNode(),
				`Unknown snapshot operation: ${operation}`,
			);
	}
}

// ---------------------------------------------------------------------------
// Code Interpreter
// ---------------------------------------------------------------------------

interface FileEntry {
	path: string;
	data: string;
}

interface CommandResponse {
	stdout: string;
	stderr: string;
	exit_code: number;
}

interface SandboxCreateResponse {
	sandbox_id: string;
}

const SANDBOX_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

async function executeCode(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const language = this.getNodeParameter('language', itemIndex) as string;
	const code = this.getNodeParameter('code', itemIndex) as string;
	const options = this.getNodeParameter('codeOptions', itemIndex, {}) as IDataObject;

	const commandTimeout = (options.timeout as number) ?? 30;
	const template = language === 'javascript' ? 'node' : 'python';
	const fileName = language === 'javascript' ? '/home/user/main.js' : '/home/user/main.py';
	const runCmd = language === 'javascript' ? `node ${fileName}` : `python3 ${fileName}`;

	const createBody: IDataObject = {
		template,
		timeout: commandTimeout + 120,
	};

	if (options.envs) {
		const envsData = options.envs as IDataObject;
		const envMap = kvToMap(envsData.env as KeyValueEntry[] | undefined);
		if (Object.keys(envMap).length > 0) {
			createBody.envs = envMap;
		}
	}

	if (options.networkAllowOut) {
		const allowOut = (options.networkAllowOut as string)
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		if (allowOut.length > 0) {
			createBody.network = { allow_out: allowOut };
		}
	}

	if (options.securityPolicyJson) {
		const secJson = (options.securityPolicyJson as string).trim();
		if (secJson) {
			let parsed: unknown;
			try {
				parsed = JSON.parse(secJson);
			} catch {
				throw new NodeOperationError(
					this.getNode(),
					`Invalid Security Policy JSON: ${secJson.slice(0, 100)}`,
					{ itemIndex },
				);
			}
			if (parsed === null || typeof parsed !== 'object') {
				throw new NodeOperationError(
					this.getNode(),
					'Security Policy JSON must be an object',
					{ itemIndex },
				);
			}
			createBody.security = parsed as IDataObject;
		}
	} else {
		const security: IDataObject = {};
		if (options.enablePiiProtection) {
			security.pii = {
				enabled: true,
				action: (options.piiAction as string) || 'redact',
				types: ['email', 'phone_number', 'ssn', 'credit_card'],
				rehydrate_response: false,
			};
		}
		if (options.enableInjectionDefense) {
			security.injection_defense = {
				enabled: true,
				sensitivity: 'medium',
				action: 'block',
				threshold: 0.8,
			};
		}
		if (Object.keys(security).length > 0) {
			createBody.security = security;
		}
	}

	const createResp = (await declawApiRequest.call(this, {
		method: 'POST',
		path: '/sandboxes',
		body: createBody,
	})) as SandboxCreateResponse;

	const sandboxId = createResp.sandbox_id;
	if (!sandboxId || !SANDBOX_ID_PATTERN.test(sandboxId)) {
		throw new NodeOperationError(
			this.getNode(),
			`Invalid sandbox_id received from API: "${sandboxId}"`,
			{ itemIndex },
		);
	}

	try {
		await declawApiRequest.call(this, {
			method: 'POST',
			path: `/sandboxes/${sandboxId}/files`,
			body: { path: fileName, data: code },
		});

		if (options.additionalFiles) {
			const filesStr = (options.additionalFiles as string).trim();
			if (filesStr) {
				let parsedFiles: unknown;
				try {
					parsedFiles = JSON.parse(filesStr);
				} catch {
					throw new NodeOperationError(
						this.getNode(),
						`Invalid Additional Files JSON: ${filesStr.slice(0, 100)}`,
						{ itemIndex },
					);
				}
				if (!Array.isArray(parsedFiles)) {
					throw new NodeOperationError(
						this.getNode(),
						'Additional Files must be a JSON array of {path, data} objects',
						{ itemIndex },
					);
				}
				for (const entry of parsedFiles as FileEntry[]) {
					if (!entry.path || typeof entry.path !== 'string') {
						throw new NodeOperationError(
							this.getNode(),
							'Each file in Additional Files must have a "path" string',
							{ itemIndex },
						);
					}
					if (entry.data === undefined || typeof entry.data !== 'string') {
						throw new NodeOperationError(
							this.getNode(),
							`File "${entry.path}" must have a "data" string`,
							{ itemIndex },
						);
					}
				}
				await declawApiRequest.call(this, {
					method: 'POST',
					path: `/sandboxes/${sandboxId}/files/batch`,
					body: { files: parsedFiles },
				});
			}
		}

		const cmdResp = (await declawApiRequest.call(this, {
			method: 'POST',
			path: `/sandboxes/${sandboxId}/commands`,
			body: { cmd: runCmd, timeout: commandTimeout },
		})) as CommandResponse;

		const outputFilesMap: IDataObject = {};
		if (options.outputFiles) {
			const outputPaths = (options.outputFiles as string)
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
			for (const filePath of outputPaths) {
				try {
					const fileResp = await declawApiRequest.call(this, {
						method: 'GET',
						path: `/sandboxes/${sandboxId}/files`,
						qs: { path: filePath },
					});
					outputFilesMap[filePath] = typeof fileResp === 'string'
						? fileResp
						: JSON.stringify(fileResp);
				} catch (fileError) {
					outputFilesMap[filePath] = `ERROR: ${(fileError as Error).message}`;
				}
			}
		}

		const result: IDataObject = {
			stdout: cmdResp.stdout ?? '',
			stderr: cmdResp.stderr ?? '',
			exit_code: cmdResp.exit_code ?? -1,
			language,
		};

		if (Object.keys(outputFilesMap).length > 0) {
			result.output_files = outputFilesMap;
		}

		return result;
	} finally {
		try {
			await declawApiRequest.call(this, {
				method: 'DELETE',
				path: `/sandboxes/${sandboxId}`,
			});
		} catch {
			// Swallow cleanup errors
		}
	}
}
