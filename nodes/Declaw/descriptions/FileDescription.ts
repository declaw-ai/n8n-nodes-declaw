import type { INodeProperties } from 'n8n-workflow';

export const fileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['file'] } },
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a file or directory',
				action: 'Delete a file',
			},
			{
				name: 'Exists',
				value: 'exists',
				description: 'Check if a file or directory exists',
				action: 'Check if path exists',
			},
			{
				name: 'List Directory',
				value: 'listDirectory',
				description: 'List files and directories at a path',
				action: 'List directory contents',
			},
			{
				name: 'Make Directory',
				value: 'makeDirectory',
				description: 'Create a directory (with parents)',
				action: 'Create a directory',
			},
			{
				name: 'Read',
				value: 'read',
				description: 'Read a text file from the sandbox',
				action: 'Read a file',
			},
			{
				name: 'Read Binary',
				value: 'readBinary',
				description: 'Read a binary file (image, archive, etc.) from the sandbox',
				action: 'Read a binary file',
			},
			{
				name: 'Write',
				value: 'write',
				description: 'Write text content to a file in the sandbox',
				action: 'Write a file',
			},
			{
				name: 'Write Batch',
				value: 'writeBatch',
				description: 'Write multiple files at once',
				action: 'Write multiple files',
			},
		],
		default: 'read',
	},
];

export const fileFields: INodeProperties[] = [
	// ------------------------------------------------------------------
	// All file ops need sandboxId
	// ------------------------------------------------------------------
	{
		displayName: 'Sandbox ID',
		name: 'sandboxId',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['file'] } },
		default: '',
		placeholder: 'sbx-a1b2c3d4',
		description: 'The ID of the sandbox',
	},

	// ------------------------------------------------------------------
	// file: read, readBinary, exists, delete, write, makeDirectory
	// ------------------------------------------------------------------
	{
		displayName: 'File Path',
		name: 'path',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['read', 'readBinary', 'exists', 'delete', 'write', 'makeDirectory'],
			},
		},
		default: '',
		placeholder: '/home/user/output.txt',
		description: 'Absolute path inside the sandbox',
	},

	// ------------------------------------------------------------------
	// file: readBinary — binary property name
	// ------------------------------------------------------------------
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		displayOptions: {
			show: { resource: ['file'], operation: ['readBinary'] },
		},
		default: 'data',
		description: 'Name of the binary property to store the downloaded file in',
	},

	// ------------------------------------------------------------------
	// file: write
	// ------------------------------------------------------------------
	{
		displayName: 'File Content',
		name: 'data',
		type: 'string',
		required: true,
		displayOptions: {
			show: { resource: ['file'], operation: ['write'] },
		},
		default: '',
		typeOptions: { rows: 5 },
		description: 'Text content to write to the file',
	},

	// ------------------------------------------------------------------
	// file: writeBatch
	// ------------------------------------------------------------------
	{
		displayName: 'Files (JSON)',
		name: 'files',
		type: 'string',
		required: true,
		displayOptions: {
			show: { resource: ['file'], operation: ['writeBatch'] },
		},
		default: '[{"path":"/home/user/a.py","data":"x = 1"},{"path":"/home/user/b.py","data":"y = 2"}]',
		typeOptions: { rows: 5 },
		description:
			'JSON array of files to write. Each entry needs "path" and "data" fields.',
	},

	// ------------------------------------------------------------------
	// file: listDirectory
	// ------------------------------------------------------------------
	{
		displayName: 'Directory Path',
		name: 'directoryPath',
		type: 'string',
		required: true,
		displayOptions: {
			show: { resource: ['file'], operation: ['listDirectory'] },
		},
		default: '/home/user',
		placeholder: '/home/user',
		description: 'Absolute directory path inside the sandbox',
	},
];
