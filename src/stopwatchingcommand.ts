import { window } from 'vscode';
import { freeResource, getFilenames } from './resources';

export async function stopWatchingCommandHandler(filename?: string): Promise<void> {
    filename ??= await window.showQuickPick([...getFilenames()], {
        canPickMany: false,
        placeHolder: 'Choose a file to stop watching',
    });

    freeResource(filename ?? '');
}
