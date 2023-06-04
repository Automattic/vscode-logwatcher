import { FileSystemWatcher, OutputChannel } from 'vscode';

interface Resource {
	outputChannel: OutputChannel;
	watcher: FileSystemWatcher;
}

const resources = new Map<string, Resource>();

export function addResource(path: string, outputChannel: OutputChannel, watcher: FileSystemWatcher): void {
	resources.set(path, { outputChannel, watcher });
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
