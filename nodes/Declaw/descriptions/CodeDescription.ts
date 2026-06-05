import type { INodeProperties } from 'n8n-workflow';

export const codeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['code'] } },
		options: [
			{
				name: 'Execute',
				value: 'execute',
				description: 'Run Python or JavaScript code in a secure Firecracker microVM sandbox',
				action: 'Execute code in a sandbox',
			},
		],
		default: 'execute',
	},
];

export const codeFields: INodeProperties[] = [
	{
		displayName: 'Language',
		name: 'language',
		type: 'options',
		displayOptions: { show: { resource: ['code'], operation: ['execute'] } },
		options: [
			{ name: 'JavaScript', value: 'javascript' },
			{ name: 'Python', value: 'python' },
		],
		default: 'python',
		description: 'Programming language to execute in the sandbox',
	},
	{
		displayName: 'Code',
		name: 'code',
		type: 'string',
		typeOptions: { editor: 'codeNodeEditor' },
		displayOptions: { show: { resource: ['code'], operation: ['execute'] } },
		default: '',
		required: true,
		placeholder: 'print("Hello from Declaw sandbox!")',
		description: 'The code to execute inside the Firecracker microVM sandbox',
	},
	{
		displayName: 'Additional Options',
		name: 'codeOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['code'], operation: ['execute'] } },
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
];
