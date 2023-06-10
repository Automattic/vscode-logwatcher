import { EventEmitter } from 'node:events';
import { FileHandle, open } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { FileStat, OutputChannel, RelativePattern, Uri, window, workspace } from 'vscode';
import { Resource, addResource, getResource } from './resources';

async function getFileToWatch(): Promise<string | undefined> {
    const result = await window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
    });

    return result?.[0].fsPath;
}

function statFile(filename: string): Thenable<FileStat | null> {
    return workspace.fs.stat(Uri.file(filename)).then(
        (fstat) => fstat,
        () => null,
    );
}

async function readInitialData(filename: string, size: number): Promise<string | Error> {
    if (size <= 0) {
        return '';
    }

    const READ_BUFFER_SIZE = 8192;
    const NUMBER_OF_LINES = 10;

    let data: string;
    let fd: FileHandle | undefined;
    try {
        const buffer = Buffer.alloc(size < READ_BUFFER_SIZE ? size : READ_BUFFER_SIZE);
        fd = await open(filename, 'r');
        await fd.read(buffer, 0, buffer.length, size - buffer.length);
        data = buffer.toString('ascii');

        const lines = data.split('\n');
        // If the file ends with a new line, the last line is empty, so we need to amend the number of lines
        const amendment = lines[lines.length - 1].length > 0 ? 0 : 1;
        if (lines.length <= NUMBER_OF_LINES + amendment) {
            // If file size is greater than the size of the buffer, we may need to throw away the first line
            // because it may be incomplete
            return size > buffer.length ? lines.slice(1).join('\n') : data;
        }

        return lines.slice(-NUMBER_OF_LINES - amendment).join('\n');
    } catch (err) {
        return err as Error;
    } finally {
        await fd?.close();
    }
}

function maybeShowOutput(outputChannel: OutputChannel, preserveFocus?: boolean | undefined): void {
    const configuration = workspace.getConfiguration();
    const show = configuration.get<boolean>('LogWatcher.automaticallyShowChanges');
    if (show) {
        outputChannel.show(preserveFocus);
    }
}

async function setUpWatcher(filename: string): Promise<Resource | null> {
    const emitter = new EventEmitter();
    const outputChannel = window.createOutputChannel(`Watch ${filename}`, 'log');
    const output = outputChannel;
    const stats = await statFile(filename);
    let offset = stats?.size ?? 0;

    if (offset) {
        const data = await readInitialData(filename, offset);
        if (typeof data === 'string') {
            outputChannel.append(data);
        } else {
            await window.showErrorMessage(`Failed to read file ${filename}: ${data.message}`);
            outputChannel.dispose();
            return null;
        }
    }

    const watcher = workspace.createFileSystemWatcher(
        new RelativePattern(Uri.file(dirname(filename)), basename(filename)),
        false,
        false,
        false,
    );

    const resource = {
        outputChannel,
        watcher,
        emitter,
        disposables: [],
    };

    watcher.onDidDelete(() => {
        offset = 0;
        output.appendLine(`*** File ${filename} has disappeared`);
        maybeShowOutput(output, true);
        process.nextTick(() => emitter?.emit('fileDeleted', filename));
    }, null, resource.disposables);

    watcher.onDidCreate(() => {
        offset = 0;
        process.nextTick(() => emitter?.emit('fileCreated', filename));
    }, null, resource.disposables);

    watcher.onDidChange(async () => {
        let fd: FileHandle | undefined;
        let stats: FileStat | null;
        try {
            [fd, stats] = await Promise.all([open(filename, 'r'), statFile(filename)]);

            if (stats) {
                const buffer = Buffer.alloc(stats.size - offset);
                await fd.read(buffer, 0, buffer.length, offset);
                offset += buffer.length;
                output.append(buffer.toString('ascii'));
            }
        } catch (err) {
            output.appendLine(`*** Failed to read file ${filename}: ${(err as Error).message}`);
        } finally {
            await fd?.close();
        }

        maybeShowOutput(output, true);
        process.nextTick(() => emitter?.emit('fileChanged', filename));
    }, null, resource.disposables);

    addResource(filename, resource);
    return resource;
}

async function doWatchFile(filename: string, quiet = false): Promise<EventEmitter | null> {
    let resource = getResource(filename) ?? await setUpWatcher(filename);

    if (!resource) {
        return null;
    }

    const { outputChannel, emitter } = resource;
    if (!quiet) {
        maybeShowOutput(outputChannel);
    }

    return emitter;
}

export async function watchFileCommandHandler(filename?: string, quiet = false): Promise<unknown> {
    if (typeof filename === 'undefined') {
        filename = await getFileToWatch();
    }

    return filename ? doWatchFile(filename, quiet) : null;
}

export function watchNginxAccessLogCommandHandler(): Promise<unknown> {
    const filename = '/var/log/nginx/access.log';
    return doWatchFile(filename);
}

export function watchNginxErrorLogCommandHandler(): Promise<unknown> {
    const filename = '/var/log/nginx/error.log';
    return doWatchFile(filename);
}
