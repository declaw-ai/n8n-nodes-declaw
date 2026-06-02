import type { INodeProperties } from 'n8n-workflow';

export const snapshotOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['snapshot'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a snapshot of the sandbox state',
				action: 'Create a snapshot',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all snapshots for a sandbox',
				action: 'List snapshots',
			},
			{
				name: 'Restore',
				value: 'restore',
				description: 'Restore a sandbox from a snapshot',
				action: 'Restore from snapshot',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a snapshot',
				action: 'Delete a snapshot',
			},
		],
		default: 'create',
	},
];

export const snapshotFields: INodeProperties[] = [
	// ------------------------------------------------------------------
	// All snapshot ops need sandboxId
	// ------------------------------------------------------------------
	{
		displayName: 'Sandbox ID',
		name: 'sandboxId',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['snapshot'] } },
		default: '',
		placeholder: 'sbx-a1b2c3d4',
		description: 'The ID of the sandbox',
	},

	// ------------------------------------------------------------------
	// snapshot: restore — optional snapshotId (defaults to latest)
	// ------------------------------------------------------------------
	{
		displayName: 'Snapshot ID',
		name: 'restoreSnapshotId',
		type: 'string',
		displayOptions: {
			show: { resource: ['snapshot'], operation: ['restore'] },
		},
		default: '',
		placeholder: 'snap-a1b2c3d4',
		description:
			'ID of the snapshot to restore. Leave empty to restore from the latest snapshot.',
	},

	// ------------------------------------------------------------------
	// snapshot: delete — required snapshotId
	// ------------------------------------------------------------------
	{
		displayName: 'Snapshot ID',
		name: 'snapshotId',
		type: 'string',
		required: true,
		displayOptions: {
			show: { resource: ['snapshot'], operation: ['delete'] },
		},
		default: '',
		placeholder: 'snap-a1b2c3d4',
		description: 'ID of the snapshot to delete',
	},
];
