import { deepEqual, equal, notEqual,  } from 'assert/strict';
import { basename } from 'node:path';
import { FileSystemWatcher, OutputChannel, RelativePattern, Uri, window, workspace } from 'vscode';
import { addResource, freeAllResources, freeResource, getFilenames, getResource } from '../../resources';
import { join } from 'path';

function createChannelAndWatcher(filename: string): [OutputChannel, FileSystemWatcher] {
    const channel = window.createOutputChannel(filename);
    const watcher = workspace.createFileSystemWatcher(
        new RelativePattern(Uri.file(filename), basename(filename)),
        false, false, false
    );

    return [channel, watcher];
}

suite('Resources', function () {
    this.afterEach(function () {
        freeAllResources();
    });

    test('addResource', function () {
        const filename = __filename;
        const [channel, watcher] = createChannelAndWatcher(filename);

        const added = addResource(filename, channel, watcher);
        equal(added, true);

        const resource = getResource(filename);
        notEqual(resource, undefined);
        equal(resource?.outputChannel, channel);
        equal(resource?.watcher, watcher);
    });

    test('freeResource', function () {
        let resource;
        const filename = __filename;
        const [channel, watcher] = createChannelAndWatcher(filename);

        const added = addResource(filename, channel, watcher);
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
        const [channel1, watcher1] = createChannelAndWatcher(filename1);
        const [channel2, watcher2] = createChannelAndWatcher(filename2);

        added = addResource(filename1, channel1, watcher1);
        equal(added, true);
        added = addResource(filename2, channel2, watcher2);
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
        const [channel1, watcher1] = createChannelAndWatcher(filename1);
        const [channel2, watcher2] = createChannelAndWatcher(filename2);

        added = addResource(filename1, channel1, watcher1);
        equal(added, true);
        added = addResource(filename2, channel2, watcher2);
        equal(added, true);

        const expected = [filename1, filename2];
        const actual = getFilenames();

        deepEqual(actual, expected);
    });
});
