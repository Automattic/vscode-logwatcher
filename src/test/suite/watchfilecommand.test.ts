import { deepEqual, equal, match, notEqual } from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import { WriteStream, createWriteStream } from 'node:fs';
import { mkdtemp, rm, unlink, writeFile } from 'node:fs/promises';
import { EOL, platform, tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { TextEditor, commands, window } from 'vscode';
import { freeAllResources, getFilenames } from '../../resources';
import { waitForOutputWindow } from './utils';

const waitForVisibleRangesChange = (editor: TextEditor): Promise<void> =>
    new Promise((resolve) => {
        const disposable = window.onDidChangeTextEditorVisibleRanges((e) => {
            if (e.textEditor === editor) {
                disposable.dispose();
                resolve();
            }
        });
    });

const promisifiedWrite = (stream: WriteStream, data: string | Buffer): Promise<void> => new Promise((resolve) => stream.end(data, resolve));
const nextTick = (): Promise<void> => new Promise((resolve) => process.nextTick(resolve));
const delay = (): Promise<unknown> => setTimeout(platform() === 'win32' ? 1000 : 50);

suite('WatchFileCommand', function () {
    let tmpDir: string;

    this.beforeAll(async function () {
        tmpDir = await mkdtemp(join(tmpdir(), 'logwatcher-test-'));
    });

    this.afterEach(async function () {
        freeAllResources();
        await nextTick();
    });

    this.afterAll(async function () {
        await nextTick();
        await rm(tmpDir, { recursive: true, force: true });
    });

    this.timeout('win32' === platform() ? 20000 : 2000);

    test('smoke test', async function () {
        const filename = __filename;

        const [editor] = await Promise.all([
            waitForOutputWindow(`extension-output-`),
            commands.executeCommand('logwatcher.watchFile', filename),
        ]);

        notEqual(editor, undefined);
        match(editor?.document.fileName ?? '', new RegExp(`Watch ${filename.replace(/\\/gu, '\\\\')}$`, 'u'));
    });

    test('react to file creation', async function () {
        const fname = join(tmpDir, '0001.txt');

        const [editor, emitter] = await Promise.all([
            waitForOutputWindow(`extension-output-`),
            commands.executeCommand<EventEmitter>('logwatcher.watchFile', fname),
        ]);

        notEqual(editor, undefined);
        notEqual(emitter, undefined);

        await delay();
        await Promise.all([once(emitter, 'fileCreated'), writeFile(fname, '')]);
    });

    test('react to file modification', async function () {
        const fname = join(tmpDir, '0002.txt');

        const stream = createWriteStream(fname);
        const [editor, emitter] = await Promise.all([
            waitForOutputWindow(`extension-output-`),
            commands.executeCommand<EventEmitter>('logwatcher.watchFile', fname),
        ]);

        notEqual(editor, undefined);
        notEqual(emitter, undefined);

        await delay();

        const expectedContent = `this is a text${EOL}`;
        await Promise.all([
            waitForVisibleRangesChange(editor),
            once(emitter, 'fileChanged'),
            promisifiedWrite(stream, expectedContent),
        ]);

        const actual = editor.document.getText();
        equal(actual, expectedContent);
    });

    test('react to file removal', async function () {
        const fname = join(tmpDir, '0003.txt');

        await writeFile(fname, '');

        const [editor, emitter] = await Promise.all([
            waitForOutputWindow(`extension-output-`),
            commands.executeCommand<EventEmitter>('logwatcher.watchFile', fname),
        ]);

        notEqual(editor, undefined);
        notEqual(emitter, undefined);

        await delay();
        await Promise.all([waitForVisibleRangesChange(editor), once(emitter, 'fileDeleted'), unlink(fname)]);

        const actual = editor.document.getText();
        const expected = `*** File ${fname} has disappeared${EOL}`;
        equal(actual, expected);
    });

    test('preload last 10 lines', async function () {
        const fname = join(tmpDir, '0004.txt');

        const expectedContent = '1\n2\n3\n4\n5\n6\n7\n8\n9\nA\n';
        await writeFile(fname, `0\n${expectedContent}`);

        const [editor, emitter] = await Promise.all([
            waitForOutputWindow(`extension-output-`),
            commands.executeCommand<EventEmitter>('logwatcher.watchFile', fname),
        ]);

        notEqual(editor, undefined);
        notEqual(emitter, undefined);

        if (!editor.document.getText()) {
            await waitForVisibleRangesChange(editor);
        }

        const actual = editor.document.getText().replace(/\r\n/gu, '\n');
        equal(actual, expectedContent);
    });

    test('preload entire file if less than 10 lines', async function () {
        const fname = join(tmpDir, '0005.txt');

        const expectedContent = '1\n2\n3\n';
        await writeFile(fname, expectedContent);

        const [editor, emitter] = await Promise.all([
            waitForOutputWindow(`extension-output-`),
            commands.executeCommand<EventEmitter>('logwatcher.watchFile', fname),
        ]);

        notEqual(editor, undefined);
        notEqual(emitter, undefined);

        if (!editor.document.getText()) {
            await waitForVisibleRangesChange(editor);
        }

        const actual = editor.document.getText().replace(/\r\n/gu, '\n');
        equal(actual, expectedContent);
    });

    test('reuse existing output channel', async function () {
        const filename = __filename;

        const [_, emitter1] = await Promise.all([
            waitForOutputWindow(`extension-output-`),
            commands.executeCommand<EventEmitter>('logwatcher.watchFile', filename),
        ]);

        const emitter2 = await commands.executeCommand<EventEmitter>('logwatcher.watchFile', filename);

        equal(emitter1 === emitter2, true);
        notEqual(emitter1, null);
        notEqual(emitter2, null);

        const expected = [filename];
        const actual = getFilenames();
        deepEqual(actual, expected);
    });
});
