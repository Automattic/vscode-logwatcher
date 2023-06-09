import { ExtensionContext, commands, workspace } from 'vscode';
import {
    watchFileCommandHandler,
    watchNginxAccessLogCommandHandler,
    watchNginxErrorLogCommandHandler,
} from './watchfilecommand';
import { stopWatchingCommandHandler } from './stopwatchingcommand';
import { freeAllResources } from './resources';

export async function activate(context: ExtensionContext): Promise<void> {
    context.subscriptions.push(
        commands.registerCommand('logwatcher.watchFile', watchFileCommandHandler),
        commands.registerCommand('logwatcher.stopWatching', stopWatchingCommandHandler),
        commands.registerCommand('logwatcher.watchNginxAccessLog', watchNginxAccessLogCommandHandler),
        commands.registerCommand('logwatcher.watchNginxErrorLog', watchNginxErrorLogCommandHandler),
    );

    const configuration = workspace.getConfiguration();
    const list = (configuration.get<string[]>('LogWatcher.watchFilesOnStartup') ?? []).filter(Boolean);
    const promises = list.map((filename) => commands.executeCommand('logwatcher.watchFile', filename, true));
    await Promise.all(promises);
}

export function deactivate(): void {
    freeAllResources();
}
