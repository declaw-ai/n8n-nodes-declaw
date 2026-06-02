import type { INodeProperties } from 'n8n-workflow';

export const commandOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['command'] } },
		options: [
			{
				name: 'Run',
				value: 'run',
				description: 'Run a command and wait for it to complete',
				action: 'Run a command',
			},
			{
				name: 'Run Background',
				value: 'runBackground',
				description: 'Start a command in the background and return its PID',
				action: 'Run a background command',
			},
			{
				name: 'List Processes',
				value: 'listProcesses',
				description: 'List background processes in the sandbox',
				action: 'List processes',
			},
			{
				name: 'Kill Process',
				value: 'killProcess',
				description: 'Kill a background process by PID',
				action: 'Kill a process',
			},
		],
		default: 'run',
	},
];

export const commandFields: INodeProperties[] = [
	// ------------------------------------------------------------------
	// All command ops need sandboxId
	// ------------------------------------------------------------------
	{
		displayName: 'Sandbox ID',
		name: 'sandboxId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['command'],
			},
		},
		default: '',
		placeholder: 'sbx-a1b2c3d4',
		description: 'The ID of the sandbox to run the command in',
	},

	// ------------------------------------------------------------------
	// command: run, runBackground
	// ------------------------------------------------------------------
	{
		displayName: 'Command',
		name: 'cmd',
		type: 'string',
		required: true,
		displayOptions: {
			show: { resource: ['command'], operation: ['run', 'runBackground'] },
		},
		default: '',
		placeholder: 'python3 script.py',
		description: 'Shell command to execute inside the sandbox',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: { resource: ['command'], operation: ['run', 'runBackground'] },
		},
		options: [
			{
				displayName: 'Working Directory',
				name: 'cwd',
				type: 'string',
				default: '',
				placeholder: '/home/user',
				description: 'Working directory for the command',
			},
			{
				displayName: 'Timeout (Seconds)',
				name: 'timeout',
				type: 'number',
				default: 60,
				description:
					'Command timeout in seconds. Supports decimals (e.g. 0.5 for 500ms). 0 means no timeout.',
				typeOptions: { numberPrecision: 1 },
			},
			{
				displayName: 'User',
				name: 'user',
				type: 'string',
				default: '',
				placeholder: 'user',
				description: 'Unix user to run the command as',
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
		],
	},

	// ------------------------------------------------------------------
	// command: killProcess
	// ------------------------------------------------------------------
	{
		displayName: 'PID',
		name: 'pid',
		type: 'number',
		required: true,
		displayOptions: {
			show: { resource: ['command'], operation: ['killProcess'] },
		},
		default: 0,
		description: 'Process ID to kill',
	},
];
