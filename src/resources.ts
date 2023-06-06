import type { EventEmitter } from 'node:events';
import type { FileSystemWatcher, OutputChannel } from 'vscode';

interface Resource {
	outputChannel: OutputChannel;
	watcher: FileSystemWatcher;
	emitter: EventEmitter;
}

const resources = new Map<string, Resource>();

export function addResource(path: string, outputChannel: OutputChannel, watcher: FileSystemWatcher, emitter: EventEmitter): boolean {
	if (!resources.has(path)) {
		resources.set(path, { outputChannel, watcher, emitter });
		return true;
	}

	return false;
}

export function freeResource(path: string): void {
	if (resources.has(path)) {
		const resource = resources.get(path) as Resource;
		doFreeResource(resource);
		resources.delete(path);
	}
}

function doFreeResource(resource: Resource): void {
	resource.outputChannel.dispose();
	resource.watcher.dispose();
	resource.emitter.removeAllListeners();
}

export function freeAllResources(): void {
	resources.forEach(doFreeResource);
	resources.clear();
}

export function getFilenames(): string[] {
	return [...resources.keys()];
}

export function getResource(path: string): Resource | undefined {
	return resources.get(path);
}
