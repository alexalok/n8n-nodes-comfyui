import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

export interface ITask {
	execute(
		this: IExecuteFunctions,
		file: any,
		apiUrl: string,
		headers: Record<string, string>,
		outputFormat: string,
		jpegQuality: number,
	): Promise<INodeExecutionData>;
}
