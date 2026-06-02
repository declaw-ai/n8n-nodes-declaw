import type {
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';

export interface DeclawRequestOptions {
	method: IHttpRequestMethods;
	path: string;
	body?: object;
	qs?: Record<string, string | number | boolean>;
	encoding?: 'arraybuffer';
	json?: boolean;
	returnFullResponse?: boolean;
}

export async function declawApiRequest(
	this: IExecuteFunctions,
	options: DeclawRequestOptions,
): Promise<unknown> {
	const credentials = await this.getCredentials('declawApi');
	const baseUrl = (credentials.apiUrl as string).replace(/\/+$/, '');

	const requestOptions: IHttpRequestOptions = {
		method: options.method,
		url: `${baseUrl}${options.path}`,
		json: options.json !== false,
	};

	if (options.body) {
		requestOptions.body = options.body;
	}

	if (options.qs && Object.keys(options.qs).length > 0) {
		requestOptions.qs = options.qs;
	}

	if (options.encoding) {
		requestOptions.encoding = options.encoding;
	}

	if (options.returnFullResponse) {
		requestOptions.returnFullResponse = true;
	}

	return this.helpers.httpRequestWithAuthentication.call(this, 'declawApi', requestOptions);
}
