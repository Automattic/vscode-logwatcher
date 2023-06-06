import { deepEqual, equal, match, notEqual } from "node:assert";
import { freeAllResources, getFilenames, getResource } from "../../resources";
import { FileSystemWatcher, RelativePattern, TextEditor, Uri, commands, window, workspace } from "vscode";
import { access, mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { WriteStream, createWriteStream, writeFileSync } from "node:fs";

async function getActiveTextEditor(): Promise<TextEditor | undefined> {
    if (window.activeTextEditor) {
        return window.activeTextEditor;
    }

    return new Promise((resolve) => {
        const disposable = window.onDidChangeActiveTextEditor((e) => {
            disposable.dispose();
            resolve(e);
        });
    });
}

function waitForFileCreation(watcher: FileSystemWatcher): Promise<void> {
    return new Promise((resolve) => {
        const disposable = watcher.onDidCreate(() => {
            disposable.dispose();
            resolve();
        });
    });
}

function waitForFileChange(watcher: FileSystemWatcher): Promise<void> {
    return new Promise((resolve) => {
        const disposable = watcher.onDidChange(() => {
            disposable.dispose();
            resolve();
        });
    });
}

function waitForFileDeletion(watcher: FileSystemWatcher): Promise<void> {
    return new Promise((resolve) => {
        const disposable = watcher.onDidDelete(() => {
            disposable.dispose();
            resolve();
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
            await commands.executeCommand('logwatcher.watchFile', fname);
            const { watcher, outputChannel } = getResource(fname) ?? {};
            notEqual(watcher, undefined);

            await setTimeout(50);
            outputChannel?.hide();

            await Promise.all([
                waitForFileCreation(watcher!),
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
            await commands.executeCommand('logwatcher.watchFile', fname);
            const { watcher } = getResource(fname) ?? {};
            notEqual(watcher, undefined);

            await setTimeout(50);
            const expectedContent = 'this is a text\n';
            await Promise.all([
                waitForFileChange(watcher!),
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
            await commands.executeCommand('logwatcher.watchFile', fname);
            const { watcher } = getResource(fname) ?? {};
            notEqual(watcher, undefined);

            await setTimeout(50);
            await Promise.all([
                waitForFileDeletion(watcher!),
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
