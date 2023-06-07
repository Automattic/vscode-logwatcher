import { deepEqual, equal, notEqual } from 'assert/strict';
import { basename, join } from 'node:path';
import { EventEmitter } from 'node:events';
import { RelativePattern, Uri, window, workspace } from 'vscode';
import { Resource, addResource, freeAllResources, freeResource, getFilenames, getResource } from '../../resources';

function createResource(filename: string): Resource {
    const outputChannel = window.createOutputChannel(filename);
    const watcher = workspace.createFileSystemWatcher(
        new RelativePattern(Uri.file(filename), basename(filename)),
        false,
        false,
        false,
    );
    const emitter = new EventEmitter();

    return { outputChannel, watcher, emitter };
}

suite('Resources', function () {
    this.afterEach(function () {
        freeAllResources();
    });

    test('addResource', function () {
        const filename = __filename;
        const r = createResource(filename);

        const added = addResource(filename, r);
        equal(added, true);

        const resource = getResource(filename);
        deepEqual(resource, r);
    });

    test('freeResource', function () {
        let resource;
        const filename = __filename;

        const added = addResource(filename, createResource(filename));
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

        added = addResource(filename1, createResource(filename1));
        equal(added, true);
        added = addResource(filename2, createResource(filename2));
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

        added = addResource(filename1, createResource(filename1));
        equal(added, true);
        added = addResource(filename2, createResource(filename2));
        equal(added, true);

        const expected = [filename1, filename2];
        const actual = getFilenames();

        deepEqual(actual, expected);
    });
});
