import { ExtensionContext, commands } from 'vscode';
import { watchFileCommandHandler, watchNginxAccessLogCommandHandler, watchNginxErrorLogCommandHandler } from './watchfilecommand';
import { stopWatchingCommandHandler } from './stopwatchingcommand';
import { freeAllResources } from './resources';

export function activate(context: ExtensionContext): void {
	context.subscriptions.push(
		commands.registerCommand('logwatcher.watchFile', watchFileCommandHandler),
		commands.registerCommand('logwatcher.stopWatching', stopWatchingCommandHandler),
		commands.registerCommand('logwatcher.watchNginxAccessLog', watchNginxAccessLogCommandHandler),
		commands.registerCommand('logwatcher.watchNginxErrorLog', watchNginxErrorLogCommandHandler),
	);
}

export function deactivate(): void {
	freeAllResources();
}
