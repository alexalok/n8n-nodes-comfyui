import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { Jimp } from 'jimp';
import { ITask } from './ITask';

export class ImageTask implements ITask {
	async execute(
		this: IExecuteFunctions,
		file: any,
		apiUrl: string,
		headers: Record<string, string>,
		outputFormat: string,
		jpegQuality: number,
	): Promise<INodeExecutionData> {
		const imageUrl = `${apiUrl}/view?filename=${file.filename}&subfolder=${
			file.subfolder || ''
		}&type=${file.type || ''}`;
		try {
			const imageData = await this.helpers.request({
				method: 'GET',
				url: imageUrl,
				encoding: null,
				headers,
			});
			const image = await Jimp.read(Buffer.from(imageData));
			let outputBuffer: Buffer;
			if (outputFormat === 'jpeg') {
				outputBuffer = await image.getBuffer('image/jpeg', { quality: jpegQuality });
			} else {
				outputBuffer = await image.getBuffer('image/png');
			}
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
						fileType: 'image',
						fileSize: Math.round((outputBuffer.length / 1024) * 10) / 10 + ' kB',
						fileExtension: outputFormat,
						mimeType: `image/${outputFormat}`,
					},
				},
			};
			return item;
		} catch (error) {
			console.error(`[ComfyUI] Failed to download image ${file.filename}:`, error);
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
