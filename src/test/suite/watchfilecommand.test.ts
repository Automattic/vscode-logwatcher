import { deepEqual, equal, match, notEqual } from "node:assert";
import { EventEmitter, once } from "node:events";
import { WriteStream, createWriteStream } from "node:fs";
import { mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { TextEditor, commands, window } from "vscode";
import { freeAllResources, getFilenames, getResource } from "../../resources";

function getActiveTextEditor(): Promise<TextEditor | undefined> {
    if (window.activeTextEditor) {
        return Promise.resolve(window.activeTextEditor);
    }

    return new Promise((resolve) => {
        const disposable = window.onDidChangeActiveTextEditor((e) => {
            if (e) {
                disposable.dispose();
                resolve(e);
            }
        });
    });
}

function waitForOutputWindow(prefix: string): Promise<TextEditor> {
    return new Promise((resolve) => {
        const disposable = window.onDidChangeVisibleTextEditors((editors) => {
            const editor = editors.find(({ document }) => document.uri.scheme === "output" && document.uri.path.startsWith(prefix));
            if (editor) {
                disposable.dispose();
                resolve(editor);
            }
        });
    });
}

function promisifiedWrite(stream: WriteStream, data: string | Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
        stream.write(data, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

suite('WatchFileCommand', function () {
    this.afterEach(function () {
        freeAllResources();
    });

    this.timeout(60000);

    test('watchFileCommandHandler - smoke test', async function () {
        const filename = __filename;

        await commands.executeCommand('logwatcher.watchFile', filename);

        const editor = await getActiveTextEditor();
        notEqual(editor, undefined);
        match(editor?.document.fileName ?? '', new RegExp(`Watch ${filename}$`));
    });

    test('watchFileCommandHandler - reuse existing output channel', async function () {
        const filename = __filename;

        await commands.executeCommand('logwatcher.watchFile', filename);
        await commands.executeCommand('logwatcher.watchFile', filename);

        const expected = [filename];
        const actual = getFilenames();
        deepEqual(actual, expected);
    });

    test('watchFileCommandHandler - react to file creation', async function () {
        const path = await mkdtemp(join(tmpdir(), 'logwatcher-test-'));
        const fname = join(path, '0001.txt');

        try {
            const emitter = await commands.executeCommand<EventEmitter>('logwatcher.watchFile', fname);
            notEqual(emitter, undefined);

            await waitForOutputWindow(`extension-output-`);

            await Promise.all([
                once(emitter, 'fileCreated'),
                writeFile(fname, ''),
            ]);
        } finally {
            await rm(path, { recursive: true, force: true });
        }
    });

    test('watchFileCommandHandler - react to file modification', async function () {
        const path = await mkdtemp(join(tmpdir(), 'logwatcher-test-'));
        const fname = join(path, '0002.txt');

        const stream = createWriteStream(fname);

        try {
            const emitter = await commands.executeCommand<EventEmitter>('logwatcher.watchFile', fname);
            await waitForOutputWindow(`extension-output-`);

            const expectedContent = 'this is a text\n';
            await Promise.all([
                once(emitter, 'fileChanged'),
                promisifiedWrite(stream, expectedContent),
            ]);

            await setTimeout(50);
            const editor = await getActiveTextEditor();
            notEqual(editor, undefined);

            const actual = editor?.document.getText();
            equal(actual, expectedContent);
        } finally {
            await rm(path, { recursive: true, force: true });
        }
    });

    test('watchFileCommandHandler - react to file removal', async function () {
        const path = await mkdtemp(join(tmpdir(), 'logwatcher-test-'));
        const fname = join(path, '0003.txt');

        await writeFile(fname, '');

        try {
            const emitter = await commands.executeCommand<EventEmitter>('logwatcher.watchFile', fname);
            notEqual(emitter, undefined);

            await waitForOutputWindow(`extension-output-`);

            await Promise.all([
                once(emitter, 'fileDeleted'),
                unlink(fname),
            ]);

            await setTimeout(50);
            const editor = await getActiveTextEditor();
            notEqual(editor, undefined);

            const actual = editor?.document.getText();
            const expected = `*** File ${fname} has disappeared\n`;
            equal(actual, expected);
        } finally {
            await rm(path, { recursive: true, force: true });
        }
    });

    test('watchFileCommandHandler - preload last 10 lines', async function () {
        const path = await mkdtemp(join(tmpdir(), 'logwatcher-test-'));
        const fname = join(path, '0004.txt');

        const expectedContent = '1\n2\n3\n4\n5\n6\n7\n8\n9\nA\n';
        await writeFile(fname, `0\n${expectedContent}`);

        try {
            await commands.executeCommand('logwatcher.watchFile', fname);
            const { watcher } = getResource(fname) ?? {};
            notEqual(watcher, undefined);

            await setTimeout(50);
            const editor = await getActiveTextEditor();
            notEqual(editor, undefined);

            const actual = editor?.document.getText();
            equal(actual, expectedContent);
        } finally {
            await rm(path, { recursive: true, force: true });
        }
    });

    test('watchFileCommandHandler - preload entire file if less than 10 lines', async function () {
        const path = await mkdtemp(join(tmpdir(), 'logwatcher-test-'));
        const fname = join(path, '0005.txt');

        const expectedContent = '1\n2\n3\n';
        await writeFile(fname, expectedContent);

        try {
            await commands.executeCommand('logwatcher.watchFile', fname);
            const { watcher } = getResource(fname) ?? {};
            notEqual(watcher, undefined);

            await setTimeout(50);
            const editor = await getActiveTextEditor();
            notEqual(editor, undefined);

            const actual = editor?.document.getText();
            equal(actual, expectedContent);
        } finally {
            await rm(path, { recursive: true, force: true });
        }
    });
});
