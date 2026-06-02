import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class DeclawApi implements ICredentialType {
	name = 'declawApi';
	displayName = 'Declaw API';
	icon = { light: 'file:../nodes/Declaw/declaw.svg', dark: 'file:../nodes/Declaw/declaw.svg' } as const;
	documentationUrl = 'https://docs.declaw.ai/api-reference/authentication';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'dcl_...',
			description:
				'Your Declaw API key. Find it at your Declaw dashboard or create one via the CLI.',
		},
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'string',
			default: 'https://api.declaw.ai',
			description:
				'Base URL for the Declaw API. Change this for self-hosted or on-prem deployments.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.apiUrl}}',
			url: '/auth/me',
		},
	};
}
