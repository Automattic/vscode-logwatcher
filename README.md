# Log Watcher

[![CI](https://github.com/Automattic/vscode-logwatcher/actions/workflows/ci.yml/badge.svg)](https://github.com/Automattic/vscode-logwatcher/actions/workflows/ci.yml)
[![Dependency Review](https://github.com/Automattic/vscode-logwatcher/actions/workflows/dependency-review.yml/badge.svg)](https://github.com/Automattic/vscode-logwatcher/actions/workflows/dependency-review.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=Automattic_vscode-logwatcher&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=Automattic_vscode-logwatcher)

A Visual Studio Code extension that watches log files for changes and outputs those changes to the "Output" tab in real time, similar to `tail -F`. 

The Log Watcher extension was created specifically to support the [GitHub Codespaces](https://docs.wpvip.com/technical-references/developing-with-github-codespaces/) package designed for developing [WordPress VIP](https://docs.wpvip.com/) applications. 
 
Some commands such as `Watch nginx access.log` will only work as expected within GitHub Codespaces for WordPress VIP. These commands expect log files to be located at a specific, preconfigured file path. 

## Features

![Log Watcher](https://github.com/Automattic/vscode-logwatcher/assets/7810770/f3849fa6-09cf-4936-9d26-12a25ca1dd18)

### Available Commands

  * **Log Watcher: Watch File…**: Start watching a specific file for changes.
  * **Log Watcher: Stop Watching File…**: Stop watching a specific file.

More than one `Watch File` commands can run simultaneously.

#### Commands configured for WordPress VIP
  * **Log Watcher: Watch nginx access.log**: Watch `/var/log/nginx/access.log` for changes.
  * **Log Watcher: Watch nginx error.log**: Watch `/var/log/nginx/error.log` for changes.

### Settings

  * **Log Watcher: Automatically Show Changes** (`LogWatcher.automaticallyShowChanges`): Enabled by default. When a watched file is updated, Log Watcher will shift focus to that file in the "Output" tab.
  * **Log Watcher: Watch Files On Startup** (`LogWatcher.watchFilesOnStartup`): An editable list of files that will be watched by default on startup by Log Watcher.

## Installation

1. Run the [`Install Extension`](https://code.visualstudio.com/docs/editor/extension-gallery#_install-an-extension) command from the [Command Palette](https://code.visualstudio.com/Docs/editor/codebasics#_command-palette).
2. Search for and select `Log Watcher`.

For non-WordPress VIP users, installing the [Log File Highlighter](https://marketplace.visualstudio.com/items?itemName=emilast.LogFileHighlighter) extension is also recommended for adding color highlighting to log files.

## Changelogs

For changelogs of every release version, refer to the [Releases section of our GitHub project](https://github.com/Automattic/vscode-logwatcher/releases).

## Acknowledgements

[Log icons created by Flat Icons](https://www.flaticon.com/free-icons/log).
