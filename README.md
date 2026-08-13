# VS Code Extensions

Each extension is maintained as an independent package in its own subfolder:

| Extension | Folder | Description |
| --- | --- | --- |
| OpenInGitHub | [openingithub](openingithub) | Opens repository files on GitHub. |
| MultiReplace | [multireplace](multireplace) | Applies configurable search and replacement pairs to the active document. |

Install dependencies and run scripts from the extension folder you are working on. For example:

```powershell
Set-Location multireplace
npm install
npm run compile
```

Open an extension subfolder directly in VS Code and press `F5` to launch its Extension Development Host.