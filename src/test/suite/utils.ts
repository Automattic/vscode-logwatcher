import { type TextEditor, window } from 'vscode';

export const waitForOutputWindow = (prefix: string): Promise<TextEditor> =>
    new Promise((resolve) => {
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
