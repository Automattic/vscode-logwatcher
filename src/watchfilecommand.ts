import { basename, dirname } from 'node:path';
import { open } from 'node:fs/promises';
import { FileStat, RelativePattern, Uri, window, workspace } from 'vscode';
import { addResource, getResource } from './resources';

async function getFileToWatch(): Promise<string | undefined> {
	const result = await window.showOpenDialog({
		canSelectFiles: true,
		canSelectFolders: false,
		canSelectMany: false,
	});

	return result?.[0].fsPath;
}

function statFile(filename: string): Thenable<FileStat | null> {
	try {
		return workspace.fs.stat(Uri.file(filename));
	} catch (err) {
		return Promise.resolve(null);
	}
}

async function readInitialData(filename: string, size: number): Promise<string | Error> {
	if (size <= 0) {
		return '';
	}

	const READ_BUFFER_SIZE = 8192;
	const NUMBER_OF_LINES = 10;

	let data: string;
	try {
		const buffer = Buffer.alloc(size < READ_BUFFER_SIZE ? size : READ_BUFFER_SIZE);
		const fd = await open(filename, 'r');
		await fd.read(buffer, 0, buffer.length, size - buffer.length);
		data = buffer.toString('ascii');
		if (size - buffer.length > 0) {
			const lines = data.split('\n');
			// Ignore the very first line, as it may be incomplete
			// `+1` is to account for the last newline character (we will have an empty line in the end of the array)
			data = lines.slice(lines.length > (NUMBER_OF_LINES + 1) ? -(NUMBER_OF_LINES + 1) : 1).join('\n');
		}
	} catch (err) {
		return err as Error;
	}

	return data;
}

async function doWatchFile(filename: string): Promise<void> {
	let { outputChannel } = getResource(filename) ?? {};

	if (!outputChannel) {
		outputChannel = window.createOutputChannel(`Watch ${filename}`);
		const output = outputChannel;
		let offset: number;
		const stats = await statFile(filename);
		offset = stats?.size ?? 0;

		if (offset) {
			const data = await readInitialData(filename, offset);
			if (typeof data === 'string') {
				outputChannel.append(data);
			} else {
				await window.showErrorMessage(`Failed to read file ${filename}: ${data.message}`);
				outputChannel.dispose();
				return;
			}
		}

		const watcher = workspace.createFileSystemWatcher(
			new RelativePattern(Uri.file(dirname(filename)), basename(filename)),
			false, false, false
		);

		watcher.onDidDelete(() => {
			offset = 0;
			output.appendLine(`*** File ${filename} has disappeared`);
			output.show();
		});

		watcher.onDidCreate(() => {
			offset = 0;
		});

		watcher.onDidChange(async () => {
			try {
				const [fd, stats] = await Promise.all([
					open(filename, 'r'),
					statFile(filename),
				]);

				if (stats) {
					const buffer = Buffer.alloc(stats.size - offset);
					await fd.read(buffer, 0, buffer.length, offset);
					offset += buffer.length;
					output.append(buffer.toString('ascii'));
				}
			} catch (err) {
				output.appendLine(`*** Failed to read file ${filename}: ${(err as Error).message}`);
			}
			output.show();
		});

		addResource(filename, outputChannel, watcher);
	}

	outputChannel.show();
}

export async function watchFileCommandHandler(): Promise<unknown> {
	const filename = await getFileToWatch();
	if (!filename) {
		return;
	}

	return doWatchFile(filename);
}

export function watchNginxAccessLogCommandHandler(): Promise<unknown> {
	const filename = '/var/log/nginx/access.log';
	return doWatchFile(filename);
}

export function watchNginxErrorLogCommandHandler(): Promise<unknown> {
	const filename = '/var/log/nginx/error.log';
	return doWatchFile(filename);
}
