import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { ITask } from './ITask';

export class VideoTask implements ITask {
	async execute(
		this: IExecuteFunctions,
		file: any,
		apiUrl: string,
		headers: Record<string, string>,
		outputFormat: string,
		jpegQuality: number,
	): Promise<INodeExecutionData> {
		const videoUrl = `${apiUrl}/view?filename=${file.filename}&subfolder=${
			file.subfolder || ''
		}&type=${file.type || ''}`;
		try {
			const videoData = await this.helpers.request({
				method: 'GET',
				url: videoUrl,
				encoding: null,
				headers,
			});
			const outputBuffer = Buffer.from(videoData);
			const fileExtension = file.filename.split('.').pop()?.toLowerCase() || '';
			let mimeType = 'application/octet-stream';
			if (fileExtension === 'mp4') mimeType = 'video/mp4';
			else if (fileExtension === 'webm') mimeType = 'video/webm';
			else if (fileExtension === 'mov') mimeType = 'video/quicktime';
			else if (fileExtension === 'avi') mimeType = 'video/x-msvideo';
			else if (fileExtension === 'gif') mimeType = 'image/gif';
			else if (fileExtension === 'webp') mimeType = 'image/webp';
			const outputBase64 = outputBuffer.toString('base64');
			const item: INodeExecutionData = {
				json: {
					filename: file.filename,
					type: file.type,
					subfolder: file.subfolder || '',
					data: outputBase64,
				},
				binary: {
					data: {
						fileName: file.filename,
						data: outputBase64,
						fileType: mimeType.startsWith('video/') ? 'video' : 'image',
						fileSize: Math.round((outputBuffer.length / 1024) * 10) / 10 + ' kB',
						fileExtension: fileExtension,
						mimeType: mimeType,
					},
				},
			};
			return item;
		} catch (error) {
			console.error(`[ComfyUI] Failed to download video ${file.filename}:`, error);
			return {
				json: {
					filename: file.filename,
					type: file.type,
					subfolder: file.subfolder || '',
					error: error.message,
				},
			};
		}
	}
}
