import { deepEqual, equal, notEqual } from 'assert/strict';
import { basename, join } from 'node:path';
import { EventEmitter } from 'node:events';
import { RelativePattern, Uri, window, workspace } from 'vscode';
import { Resource, addResource, freeAllResources, freeResource, getFilenames, getResource } from '../../resources';
import { waitForOutputWindow } from './utils';

async function createResource(filename: string): Promise<Resource> {
    const promise = waitForOutputWindow(`extension-output-`);
    const outputChannel = window.createOutputChannel(filename, 'log');
    const watcher = workspace.createFileSystemWatcher(
        new RelativePattern(Uri.file(filename), basename(filename)),
        false,
        false,
        false,
    );
    const emitter = new EventEmitter();

    outputChannel.show(true);
    await promise;
    return { outputChannel, watcher, emitter, disposables: [] };
}

suite('Resources', function () {
    this.afterEach(function () {
        freeAllResources();
    });

    test('addResource', async function () {
        const filename = __filename;
        const r = await createResource(filename);

        const added = addResource(filename, r);
        equal(added, true);

        const resource = getResource(filename);
        deepEqual(resource, r);
    });

    test('freeResource', async function () {
        let resource;
        const filename = __filename;

        const added = addResource(filename, await createResource(filename));
        equal(added, true);

        resource = getResource(filename);
        notEqual(resource, undefined);

        freeResource(filename);

        resource = getResource(filename);
        equal(resource, undefined);
    });

    test('freeAllResources', async function () {
        let resource;
        let added;
        const filename1 = __filename;
        const filename2 = join(__dirname, 'index.js');

        added = addResource(filename1, await createResource(filename1));
        equal(added, true);
        added = addResource(filename2, await createResource(filename2));
        equal(added, true);

        resource = getResource(filename1);
        notEqual(resource, undefined);
        resource = getResource(filename2);
        notEqual(resource, undefined);

        freeAllResources();

        resource = getResource(filename1);
        equal(resource, undefined);
        resource = getResource(filename2);
        equal(resource, undefined);
    });

    test('getFilenames', async function () {
        let added;
        const filename1 = __filename;
        const filename2 = join(__dirname, 'index.js');

        added = addResource(filename1, await createResource(filename1));
        equal(added, true);
        added = addResource(filename2, await createResource(filename2));
        equal(added, true);

        const expected = [filename1, filename2];
        const actual = getFilenames();

        deepEqual(actual, expected);
    });
});
