import type { EventEmitter } from 'node:events';
import type { Disposable, FileSystemWatcher, OutputChannel } from 'vscode';

export interface Resource {
    outputChannel: OutputChannel;
    watcher: FileSystemWatcher;
    emitter: EventEmitter;
    disposables?: Disposable[];
}

const resources = new Map<string, Resource>();

export function addResource(path: string, resource: Resource): boolean {
    if (!resources.has(path)) {
        resources.set(path, resource);
        return true;
    }

    return false;
}

function doFreeResource(resource: Resource): void {
    if (resource.disposables) {
        resource.disposables.forEach((disposable) => disposable.dispose());
    }

    resource.outputChannel.dispose();
    resource.watcher.dispose();
    resource.emitter.removeAllListeners();
}

export function freeResource(path: string): void {
    const resource = resources.get(path);
    if (resource) {
        doFreeResource(resource);
        resources.delete(path);
    }
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
