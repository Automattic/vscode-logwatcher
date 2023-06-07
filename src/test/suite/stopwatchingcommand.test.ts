import { equal, notEqual } from 'node:assert';
import { commands } from 'vscode';
import { waitForOutputWindow } from './utils';
import { getFilenames } from '../../resources';

suite('StopWatchingCommand', function () {
    test('cancel effect of watchFileCommand', async function () {
        const filename = __filename;

        const [editor] = await Promise.all([
            waitForOutputWindow(`extension-output-`),
            commands.executeCommand('logwatcher.watchFile', filename),
        ]);

        notEqual(editor, undefined);

        await commands.executeCommand('logwatcher.stopWatching', filename);

        const filenames = getFilenames();
        equal(filenames.indexOf(filename), -1);
    });
});
