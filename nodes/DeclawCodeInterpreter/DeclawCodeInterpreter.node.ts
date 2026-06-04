import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { declawApiRequest } from '../Declaw/transport/request';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KeyValueEntry {
	key: string;
	value: string;
}

interface FileEntry {
	path: string;
	data: string;
}

interface CommandResponse {
	stdout: string;
	stderr: string;
	exit_code: number;
	pid: number;
}

interface SandboxCreateResponse {
	sandbox_id: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SANDBOX_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

function validateSandboxId(sandboxId: string, context: IExecuteFunctions, itemIndex: number): void {
	if (!sandboxId || !SANDBOX_ID_PATTERN.test(sandboxId)) {
		throw new NodeOperationError(
			context.getNode(),
			`Invalid sandbox_id received from API: "${sandboxId}"`,
			{ itemIndex },
		);
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

// ---------------------------------------------------------------------------
// Node Definition
// ---------------------------------------------------------------------------

export class DeclawCodeInterpreter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Declaw Code Interpreter',
		name: 'declawCodeInterpreter',
		icon: 'file:declaw.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["language"]}} code in Firecracker sandbox',
		description:
			'Execute Python or JavaScript code securely in a Firecracker microVM sandbox with optional security guardrails',
		defaults: { name: 'Declaw Code Interpreter' },
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
			// ── Language ─────────────────────────────────────────────────────
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				options: [
					{ name: 'JavaScript', value: 'javascript' },
					{ name: 'Python', value: 'python' },
				],
				default: 'python',
				description: 'Programming language to execute in the sandbox',
			},
			// ── Code ─────────────────────────────────────────────────────────
			{
				displayName: 'Code',
				name: 'code',
				type: 'string',
				typeOptions: { editor: 'codeNodeEditor' },
				default: '',
				required: true,
				placeholder: 'print("Hello from Declaw sandbox!")',
				description: 'The code to execute inside the Firecracker microVM sandbox',
			},
			// ── Additional Options (collection) ──────────────────────────────
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Additional Files (JSON)',
						name: 'additionalFiles',
						type: 'string',
						default: '',
						placeholder: '[{"path": "/home/user/data.csv", "data": "a,b\\n1,2"}]',
						description:
							'JSON array of files to upload before execution. Each entry: {path, data}.',
					},
					{
						displayName: 'Enable Injection Defense',
						name: 'enableInjectionDefense',
						type: 'boolean',
						default: false,
						description: 'Whether to enable prompt/code injection defense',
					},
					{
						displayName: 'Enable PII Protection',
						name: 'enablePiiProtection',
						type: 'boolean',
						default: false,
						description:
							'Whether to enable PII (personally identifiable information) protection in the sandbox',
					},
					{
						displayName: 'Environment Variables',
						name: 'envs',
						type: 'fixedCollection',
						typeOptions: { multipleValues: true },
						default: {},
						options: [
							{
								displayName: 'Environment Variable',
								name: 'env',
								values: [
									{
										displayName: 'Key',
										name: 'key',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
									},
								],
							},
						],
						description: 'Environment variables to inject into the sandbox',
					},
					{
						displayName: 'Network Egress Allowlist',
						name: 'networkAllowOut',
						type: 'string',
						default: '',
						placeholder: 'api.example.com, cdn.example.com',
						description: 'Comma-separated domains the sandbox is allowed to reach',
					},
					{
						displayName: 'Output Files',
						name: 'outputFiles',
						type: 'string',
						default: '',
						placeholder: '/home/user/result.json, /home/user/output.csv',
						description:
							'Comma-separated file paths to download from the sandbox after execution',
					},
					{
						displayName: 'PII Action',
						name: 'piiAction',
						type: 'options',
						options: [
							{ name: 'Alert', value: 'alert' },
							{ name: 'Block', value: 'block' },
							{ name: 'Redact', value: 'redact' },
						],
						default: 'redact',
						description: 'Action to take when PII is detected',
						displayOptions: {
							show: {
								enablePiiProtection: [true],
							},
						},
					},
					{
						displayName: 'Security Policy (JSON)',
						name: 'securityPolicyJson',
						type: 'string',
						default: '',
						placeholder: '{"pii": {"enabled": true, "action": "redact"}}',
						description:
							'Raw JSON security policy. When provided, this overrides the PII and injection toggles above.',
					},
					{
						displayName: 'Timeout (Seconds)',
						name: 'timeout',
						type: 'number',
						default: 30,
						description: 'Execution timeout in seconds',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const result = await executeCodeInterpreter.call(this, i);
				const jsonArray = this.helpers.returnJsonArray(result);
				const executionData = this.helpers.constructExecutionMetaData(jsonArray, {
					itemData: { item: i },
				});
				returnData.push(...executionData);
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

// ---------------------------------------------------------------------------
// Core execution logic
// ---------------------------------------------------------------------------

async function executeCodeInterpreter(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	// ── Read parameters ────────────────────────────────────────────────
	const language = this.getNodeParameter('language', itemIndex) as string;
	const code = this.getNodeParameter('code', itemIndex) as string;
	const options = this.getNodeParameter('additionalOptions', itemIndex, {}) as IDataObject;

	const commandTimeout = (options.timeout as number) ?? 30;
	const template = language === 'javascript' ? 'node' : 'python';
	const fileName = language === 'javascript' ? '/home/user/main.js' : '/home/user/main.py';
	const runCmd = language === 'javascript' ? `node ${fileName}` : `python3 ${fileName}`;

	// ── Build sandbox creation body ────────────────────────────────────
	// Sandbox lifetime is a safety net (we kill it in finally).
	// Must exceed command timeout to avoid killing the sandbox mid-execution.
	const createBody: IDataObject = {
		template,
		timeout: commandTimeout + 120,
	};

	// Environment variables
	if (options.envs) {
		const envsData = options.envs as IDataObject;
		const envMap = kvToMap(envsData.env as KeyValueEntry[] | undefined);
		if (Object.keys(envMap).length > 0) {
			createBody.envs = envMap;
		}
	}

	// Network policy
	if (options.networkAllowOut) {
		const allowOut = (options.networkAllowOut as string)
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		if (allowOut.length > 0) {
			createBody.network = { allow_out: allowOut };
		}
	}

	// Security policy
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

	// ── Step 1: Create sandbox ─────────────────────────────────────────
	const createResp = (await declawApiRequest.call(this, {
		method: 'POST',
		path: '/sandboxes',
		body: createBody,
	})) as SandboxCreateResponse;

	const sandboxId = createResp.sandbox_id;
	validateSandboxId(sandboxId, this, itemIndex);

	// ── Steps 2-7 wrapped in try/finally to guarantee cleanup ──────────
	try {
		// Step 2: Write the user's code to the sandbox
		await declawApiRequest.call(this, {
			method: 'POST',
			path: `/sandboxes/${sandboxId}/files`,
			body: { path: fileName, data: code },
		});

		// Step 3: Upload additional files if provided
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
				// Validate each entry
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

		// Step 4: Execute the code
		const cmdResp = (await declawApiRequest.call(this, {
			method: 'POST',
			path: `/sandboxes/${sandboxId}/commands`,
			body: { cmd: runCmd, timeout: commandTimeout },
		})) as CommandResponse;

		// Step 5: Download output files if requested
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
					// If a file can't be read (e.g., code didn't create it), include the error
					outputFilesMap[filePath] = `ERROR: ${(fileError as Error).message}`;
				}
			}
		}

		// Step 6: Build result
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
		// Step 7: ALWAYS kill the sandbox
		try {
			await declawApiRequest.call(this, {
				method: 'DELETE',
				path: `/sandboxes/${sandboxId}`,
			});
		} catch {
			// Swallow cleanup errors — the primary result/error is what matters
		}
	}
}
