import type { INodeProperties } from 'n8n-workflow';

export const sandboxOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['sandbox'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new Firecracker microVM sandbox',
				action: 'Create a sandbox',
			},
			{
				name: 'Get Info',
				value: 'get',
				description: 'Get details of a sandbox',
				action: 'Get sandbox info',
			},
			{
				name: 'Kill',
				value: 'kill',
				description: 'Destroy a sandbox',
				action: 'Kill a sandbox',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all sandboxes',
				action: 'List sandboxes',
			},
			{
				name: 'Pause',
				value: 'pause',
				description: 'Pause (freeze) a running sandbox',
				action: 'Pause a sandbox',
			},
			{
				name: 'Resume',
				value: 'resume',
				description: 'Resume a paused sandbox',
				action: 'Resume a sandbox',
			},
			{
				name: 'Set Timeout',
				value: 'setTimeout',
				description: 'Update the auto-kill timeout of a sandbox',
				action: 'Set sandbox timeout',
			},
		],
		default: 'create',
	},
];

export const sandboxFields: INodeProperties[] = [
	// ------------------------------------------------------------------
	// sandbox: create
	// ------------------------------------------------------------------
	{
		displayName: 'Template',
		name: 'template',
		type: 'options',
		displayOptions: { show: { resource: ['sandbox'], operation: ['create'] } },
		options: [
			{ name: 'AI Agent', value: 'ai-agent' },
			{ name: 'Base', value: 'base' },
			{ name: 'Code Interpreter', value: 'code-interpreter' },
			{ name: 'DevOps', value: 'devops' },
			{ name: 'MCP Server', value: 'mcp-server' },
			{ name: 'Node.js', value: 'node' },
			{ name: 'Python', value: 'python' },
			{ name: 'Web Dev', value: 'web-dev' },
		],
		default: 'base',
		description: 'The template (base image) for the sandbox VM',
	},
	{
		displayName: 'Timeout (Seconds)',
		name: 'createTimeout',
		type: 'number',
		displayOptions: { show: { resource: ['sandbox'], operation: ['create'] } },
		default: 300,
		description: 'Auto-kill timeout in seconds. 0 means no timeout.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['sandbox'], operation: ['create'] } },
		options: [
			{
				displayName: 'Enable Injection Defense',
				name: 'enableInjectionDefense',
				type: 'boolean',
				default: false,
				description: 'Whether to enable prompt injection detection on sandbox traffic',
			},
			{
				displayName: 'Enable PII Protection',
				name: 'enablePiiProtection',
				type: 'boolean',
				default: false,
				description:
					'Whether to enable PII detection and redaction on sandbox network traffic',
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
			},
			{
				displayName: 'Injection Sensitivity',
				name: 'injectionSensitivity',
				type: 'options',
				displayOptions: { show: { enableInjectionDefense: [true] } },
				options: [
					{ name: 'High', value: 'high' },
					{ name: 'Low', value: 'low' },
					{ name: 'Medium', value: 'medium' },
				],
				default: 'medium',
				description: 'Sensitivity level for injection detection',
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				options: [
					{
						displayName: 'Metadata Entry',
						name: 'meta',
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
			},
			{
				displayName: 'Network Allow List',
				name: 'networkAllowOut',
				type: 'string',
				default: '',
				placeholder: 'api.openai.com, pypi.org',
				description:
					'Comma-separated list of domains the sandbox can reach. Leave empty to allow all.',
			},
			{
				displayName: 'Network Deny List',
				name: 'networkDenyOut',
				type: 'string',
				default: '',
				placeholder: '169.254.169.254',
				description: 'Comma-separated list of domains to block outbound access to',
			},
			{
				displayName: 'PII Action',
				name: 'piiAction',
				type: 'options',
				displayOptions: { show: { enablePiiProtection: [true] } },
				options: [
					{ name: 'Block', value: 'block' },
					{ name: 'Log Only', value: 'log_only' },
					{ name: 'Redact', value: 'redact' },
				],
				default: 'redact',
				description: 'What to do when PII is detected',
			},
			{
				displayName: 'PII Types',
				name: 'piiTypes',
				type: 'multiOptions',
				displayOptions: { show: { enablePiiProtection: [true] } },
				options: [
					{ name: 'Address', value: 'address' },
					{ name: 'API Key', value: 'api_key' },
					{ name: 'Credit Card', value: 'credit_card' },
					{ name: 'Email', value: 'email' },
					{ name: 'IP Address', value: 'ip_address' },
					{ name: 'Person Name', value: 'person_name' },
					{ name: 'Phone Number', value: 'phone_number' },
					{ name: 'SSN', value: 'ssn' },
				],
				default: ['email', 'phone_number', 'ssn', 'credit_card'],
				description: 'Types of PII to detect',
			},
			{
				displayName: 'Security Policy JSON',
				name: 'securityPolicyJson',
				type: 'string',
				default: '',
				placeholder: '{"pii":{"enabled":true,"action":"redact",...}}',
				description:
					'Raw security policy JSON. Overrides all toggle fields above when provided. See docs.declaw.ai for full schema.',
			},
		],
	},

	// ------------------------------------------------------------------
	// sandbox: get, kill, pause, resume, setTimeout (need sandboxId)
	// ------------------------------------------------------------------
	{
		displayName: 'Sandbox ID',
		name: 'sandboxId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['sandbox'],
				operation: ['get', 'kill', 'pause', 'resume', 'setTimeout'],
			},
		},
		default: '',
		placeholder: 'sbx-a1b2c3d4',
		description: 'The ID of the sandbox',
	},

	// ------------------------------------------------------------------
	// sandbox: setTimeout
	// ------------------------------------------------------------------
	{
		displayName: 'Timeout (Seconds)',
		name: 'newTimeout',
		type: 'number',
		required: true,
		displayOptions: { show: { resource: ['sandbox'], operation: ['setTimeout'] } },
		default: 300,
		description: 'New auto-kill timeout in seconds. 0 means no timeout.',
	},
];
