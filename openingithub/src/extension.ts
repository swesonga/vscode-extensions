// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "openingithub" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('openingithub.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from OpenInGitHub!');
	});

	// Register the "Open in GitHub" command
	const openInGitHubDisposable = vscode.commands.registerCommand('openingithub.openInGitHub', async (uri?: vscode.Uri) => {
		try {
			// If no URI is provided (e.g., called from editor context), use the active editor's file
			let filePath: string;
			
			if (uri) {
				filePath = uri.fsPath;
			} else {
				const activeEditor = vscode.window.activeTextEditor;
				if (!activeEditor) {
					vscode.window.showErrorMessage('No file is currently open');
					return;
				}
				filePath = activeEditor.document.uri.fsPath;
			}
			
			const gitHubUrl = await getGitHubUrl(filePath);
			
			if (gitHubUrl) {
				vscode.env.openExternal(vscode.Uri.parse(gitHubUrl));
			} else {
				vscode.window.showErrorMessage('Could not determine GitHub URL for this file. Make sure this is a Git repository with a GitHub remote.');
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Error opening GitHub URL: ${error}`);
		}
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(openInGitHubDisposable);
}

async function getGitHubUrl(filePath: string): Promise<string | null> {
	const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
	if (!workspaceFolder) {
		return null;
	}

	try {
		const { exec } = require('child_process');
		const { promisify } = require('util');
		const execAsync = promisify(exec);

		// Get git remote URL
		const { stdout: remoteUrl } = await execAsync('git remote get-url origin', {
			cwd: workspaceFolder.uri.fsPath
		});

		// Convert git URL to GitHub web URL
		const githubWebUrl = convertGitUrlToWebUrl(remoteUrl.trim());
		if (!githubWebUrl) {
			return null;
		}

		// Get relative path from workspace root
		const relativePath = path.relative(workspaceFolder.uri.fsPath, filePath);
		
		// Get current branch
		const { stdout: currentBranch } = await execAsync('git rev-parse --abbrev-ref HEAD', {
			cwd: workspaceFolder.uri.fsPath
		});

		// Construct GitHub file URL
		const fileUrl = `${githubWebUrl}/blob/${currentBranch.trim()}/${relativePath.replace(/\\/g, '/')}`;
		
		return fileUrl;
	} catch (error) {
		console.error('Error getting GitHub URL:', error);
		return null;
	}
}

function convertGitUrlToWebUrl(gitUrl: string): string | null {
	// Handle HTTPS URLs
	if (gitUrl.startsWith('https://github.com/')) {
		return gitUrl.replace(/\.git$/, '');
	}
	
	// Handle SSH URLs
	if (gitUrl.startsWith('git@github.com:')) {
		const repoPath = gitUrl.replace('git@github.com:', '').replace(/\.git$/, '');
		return `https://github.com/${repoPath}`;
	}
	
	return null;
}

// This method is called when your extension is deactivated
export function deactivate() {}
