import { window } from 'vscode';
import { freeResource, getFilenames } from './resources';

export async function stopWatchingCommandHandler(): Promise<void> {
	const path = await window.showQuickPick([...getFilenames()], {
		canPickMany: false,
		placeHolder: 'Choose a file to stop watching',
	});

	if (path) {
		freeResource(path);
	}
}
