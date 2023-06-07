import { window } from 'vscode';
import { freeResource, getFilenames } from './resources';

export async function stopWatchingCommandHandler(filename?: string): Promise<void> {
    if (typeof filename === 'undefined') {
        filename = await window.showQuickPick([...getFilenames()], {
            canPickMany: false,
            placeHolder: 'Choose a file to stop watching',
        });
    }

    freeResource(filename ?? '');
}
