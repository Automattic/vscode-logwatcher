import { deepEqual, equal, match, notEqual } from 'node:assert';
import { EventEmitter, once } from 'node:events';
import { WriteStream, createWriteStream } from 'node:fs';
import { mkdtemp, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TextEditor, commands, window } from 'vscode';
import { freeAllResources, getFilenames } from '../../resources';

function waitForOutputWindow(prefix: string): Promise<TextEditor> {
    return new Promise((resolve) => {
        const disposable = window.onDidChangeVisibleTextEditors((editors) => {
            const editor = editors.find(
                ({ document }) => document.uri.scheme === 'output' && document.uri.path.startsWith(prefix),
            );
            if (editor) {
                disposable.dispose();
                resolve(editor);
            }
        });
    });
}

function waitForVisibleRangesChange(editor: TextEditor): Promise<void> {
    return new Promise((resolve) => {
        const disposable = window.onDidChangeTextEditorVisibleRanges((e) => {
            if (e.textEditor === editor) {
                disposable.dispose();
                resolve();
            }
        });
    });
}

function promisifiedWrite(stream: WriteStream, data: string | Buffer): Promise<void> {
    return new Promise((resolve) => {
        stream.end(data, resolve);
    });
}

suite('WatchFileCommand', function () {
    this.afterEach(function () {
        freeAllResources();
    });

    this.timeout(5000);

    test('watchFileCommandHandler - smoke test', async function () {
        const filename = __filename;

        const [editor] = await Promise.all([
            waitForOutputWindow(`extension-output-`),
            commands.executeCommand('logwatcher.watchFile', filename),
        ]);

        notEqual(editor, undefined);
        match(editor?.document.fileName ?? '', new RegExp(`Watch ${filename.replace(/\\/gu, '\\\\')}$`, 'u'));
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
            const [editor, emitter] = await Promise.all([
                waitForOutputWindow(`extension-output-`),
                commands.executeCommand<EventEmitter>('logwatcher.watchFile', fname),
            ]);

            notEqual(editor, undefined);
            notEqual(emitter, undefined);

            await Promise.all([once(emitter, 'fileCreated'), writeFile(fname, '')]);
        } finally {
            await rm(path, { recursive: true, force: true });
        }
    });

    test('watchFileCommandHandler - react to file modification', async function () {
        const path = await mkdtemp(join(tmpdir(), 'logwatcher-test-'));
        const fname = join(path, '0002.txt');

        const stream = createWriteStream(fname);

        try {
            const [editor, emitter] = await Promise.all([
                waitForOutputWindow(`extension-output-`),
                commands.executeCommand<EventEmitter>('logwatcher.watchFile', fname),
            ]);

            notEqual(editor, undefined);
            notEqual(emitter, undefined);

            const expectedContent = 'this is a text\n';
            await Promise.all([
                waitForVisibleRangesChange(editor),
                once(emitter, 'fileChanged'),
                promisifiedWrite(stream, expectedContent),
            ]);

            const actual = editor.document.getText();
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
            const [editor, emitter] = await Promise.all([
                waitForOutputWindow(`extension-output-`),
                commands.executeCommand<EventEmitter>('logwatcher.watchFile', fname),
            ]);

            notEqual(editor, undefined);
            notEqual(emitter, undefined);

            await Promise.all([waitForVisibleRangesChange(editor), once(emitter, 'fileDeleted'), unlink(fname)]);

            const actual = editor.document.getText();
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
            const [editor, emitter] = await Promise.all([
                waitForOutputWindow(`extension-output-`),
                commands.executeCommand<EventEmitter>('logwatcher.watchFile', fname),
            ]);

            notEqual(editor, undefined);
            notEqual(emitter, undefined);

            if (!editor.document.getText()) {
                await waitForVisibleRangesChange(editor);
            }

            const actual = editor.document.getText();
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
            const [editor, emitter] = await Promise.all([
                waitForOutputWindow(`extension-output-`),
                commands.executeCommand<EventEmitter>('logwatcher.watchFile', fname),
            ]);

            notEqual(editor, undefined);
            notEqual(emitter, undefined);

            if (!editor.document.getText()) {
                await waitForVisibleRangesChange(editor);
            }

            const actual = editor.document.getText();
            equal(actual, expectedContent);
        } finally {
            await rm(path, { recursive: true, force: true });
        }
    });
});
