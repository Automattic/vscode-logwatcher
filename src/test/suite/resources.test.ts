import { deepEqual, equal, notEqual } from 'assert/strict';
import { basename, join } from 'node:path';
import { EventEmitter } from 'node:events';
import { FileSystemWatcher, OutputChannel, RelativePattern, Uri, window, workspace } from 'vscode';
import { addResource, freeAllResources, freeResource, getFilenames, getResource } from '../../resources';

function createResource(filename: string): [OutputChannel, FileSystemWatcher, EventEmitter] {
    const channel = window.createOutputChannel(filename);
    const watcher = workspace.createFileSystemWatcher(
        new RelativePattern(Uri.file(filename), basename(filename)),
        false, false, false
    );
    const emitter = new EventEmitter();

    return [channel, watcher, emitter];
}

suite('Resources', function () {
    this.afterEach(function () {
        freeAllResources();
    });

    test('addResource', function () {
        const filename = __filename;
        const [channel, watcher, emitter] = createResource(filename);

        const added = addResource(filename, channel, watcher, emitter);
        equal(added, true);

        const resource = getResource(filename);
        notEqual(resource, undefined);
        equal(resource?.outputChannel, channel);
        equal(resource?.watcher, watcher);
    });

    test('freeResource', function () {
        let resource;
        const filename = __filename;
        const [channel, watcher, emitter] = createResource(filename);

        const added = addResource(filename, channel, watcher, emitter);
        equal(added, true);

        resource = getResource(filename);
        notEqual(resource, undefined);

        freeResource(filename);

        resource = getResource(filename);
        equal(resource, undefined);
    });

    test('freeAllResources', function () {
        let resource;
        let added;
        const filename1 = __filename;
        const filename2 = join(__dirname, 'index.js');
        const [channel1, watcher1, emitter1] = createResource(filename1);
        const [channel2, watcher2, emitter2] = createResource(filename2);

        added = addResource(filename1, channel1, watcher1, emitter1);
        equal(added, true);
        added = addResource(filename2, channel2, watcher2, emitter2);
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

    test('getFilenames', function () {
        let added;
        const filename1 = __filename;
        const filename2 = join(__dirname, 'index.js');
        const [channel1, watcher1, emitter1] = createResource(filename1);
        const [channel2, watcher2, emitter2] = createResource(filename2);

        added = addResource(filename1, channel1, watcher1, emitter1);
        equal(added, true);
        added = addResource(filename2, channel2, watcher2, emitter2);
        equal(added, true);

        const expected = [filename1, filename2];
        const actual = getFilenames();

        deepEqual(actual, expected);
    });
});
