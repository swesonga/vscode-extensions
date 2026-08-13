import * as vscode from 'vscode';

export interface ReplacementPair {
	search: string;
	replace: string;
}

export function applyReplacements(text: string, pairs: readonly ReplacementPair[]): string {
	return pairs.reduce((result, pair) => {
		if (pair.search.length === 0) {
			return result;
		}

		return result.replaceAll(pair.search, pair.replace);
	}, text);
}

export function activate(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('multiReplace.replaceInCurrentDocument', replaceInCurrentDocument),
		vscode.commands.registerCommand('multiReplace.openSettings', () => openSettings(context))
	);
}

async function replaceInCurrentDocument(): Promise<void> {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		void vscode.window.showErrorMessage('MultiReplace: No document is currently open.');
		return;
	}

	const pairs = getReplacementPairs();
	if (pairs.length === 0) {
		const selection = await vscode.window.showInformationMessage(
			'MultiReplace: No search and replacement pairs are configured.',
			'Open Settings'
		);
		if (selection === 'Open Settings') {
			await vscode.commands.executeCommand('multiReplace.openSettings');
		}
		return;
	}

	const document = editor.document;
	const originalText = document.getText();
	const replacedText = applyReplacements(originalText, pairs);
	if (replacedText === originalText) {
		void vscode.window.showInformationMessage('MultiReplace: No matches found.');
		return;
	}

	const fullDocument = new vscode.Range(document.positionAt(0), document.positionAt(originalText.length));
	const applied = await editor.edit(editBuilder => editBuilder.replace(fullDocument, replacedText));
	if (!applied) {
		void vscode.window.showErrorMessage('MultiReplace: The document could not be edited.');
	}
}

function getReplacementPairs(): ReplacementPair[] {
	const configured = vscode.workspace
		.getConfiguration('multiReplace')
		.get<unknown[]>('replacements', []);

	return configured.filter((value): value is ReplacementPair => {
		if (typeof value !== 'object' || value === null) {
			return false;
		}

		const pair = value as Record<string, unknown>;
		return typeof pair.search === 'string' && typeof pair.replace === 'string';
	});
}

function openSettings(context: vscode.ExtensionContext): void {
	const panel = vscode.window.createWebviewPanel(
		'multiReplace.settings',
		'MultiReplace Settings',
		vscode.ViewColumn.Active,
		{ enableScripts: true }
	);

	panel.webview.html = getSettingsHtml(panel.webview, getReplacementPairs());
	panel.webview.onDidReceiveMessage(async (message: unknown) => {
		if (!isSaveMessage(message)) {
			return;
		}

		await vscode.workspace
			.getConfiguration('multiReplace')
			.update('replacements', message.pairs, vscode.ConfigurationTarget.Global);
		void vscode.window.showInformationMessage('MultiReplace settings saved.');
	}, undefined, context.subscriptions);
}

function isSaveMessage(message: unknown): message is { type: 'save'; pairs: ReplacementPair[] } {
	if (typeof message !== 'object' || message === null) {
		return false;
	}

	const candidate = message as { type?: unknown; pairs?: unknown };
	return candidate.type === 'save'
		&& Array.isArray(candidate.pairs)
		&& candidate.pairs.every(pair => typeof pair === 'object'
			&& pair !== null
			&& typeof (pair as Record<string, unknown>).search === 'string'
			&& typeof (pair as Record<string, unknown>).replace === 'string');
}

function getSettingsHtml(webview: vscode.Webview, pairs: readonly ReplacementPair[]): string {
	const nonce = getNonce();
	const serializedPairs = JSON.stringify(pairs).replace(/</g, '\\u003c');

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
	<title>MultiReplace Settings</title>
	<style>
		body { padding: 24px; color: var(--vscode-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family); }
		h1 { font-size: 22px; font-weight: 600; margin: 0 0 8px; }
		p { color: var(--vscode-descriptionForeground); margin: 0 0 20px; }
		table { width: 100%; border-collapse: collapse; table-layout: fixed; }
		th { text-align: left; font-weight: 600; padding: 8px; border-bottom: 1px solid var(--vscode-panel-border); }
		td { padding: 6px 8px; vertical-align: middle; }
		.action-column { width: 42px; }
		input { box-sizing: border-box; width: 100%; padding: 6px 8px; color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, transparent); }
		input:focus { outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px; }
		button { padding: 7px 12px; color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0; cursor: pointer; }
		button:hover { background: var(--vscode-button-hoverBackground); }
		.icon-button { width: 30px; height: 30px; padding: 0; color: var(--vscode-foreground); background: transparent; font-size: 20px; line-height: 30px; }
		.icon-button:hover { background: var(--vscode-toolbar-hoverBackground); }
		.toolbar { display: flex; gap: 8px; margin-top: 16px; }
		.secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
		.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
	</style>
</head>
<body>
	<h1>MultiReplace</h1>
	<p>Pairs are applied to the current document from top to bottom. Search values are literal and case-sensitive.</p>
	<table aria-label="Search and replacement pairs">
		<thead><tr><th>Search for</th><th>Replace with</th><th class="action-column"><span aria-label="Actions"></span></th></tr></thead>
		<tbody id="pairs"></tbody>
	</table>
	<div class="toolbar">
		<button id="add" class="secondary" type="button">Add row</button>
		<button id="save" type="button">Save</button>
	</div>
	<script nonce="${nonce}">
		const vscode = acquireVsCodeApi();
		const initialPairs = ${serializedPairs};
		const tableBody = document.getElementById('pairs');

		function addRow(pair = { search: '', replace: '' }) {
			const row = document.createElement('tr');
			row.innerHTML = '<td><input class="search" aria-label="Search for" type="text"></td>'
				+ '<td><input class="replace" aria-label="Replace with" type="text"></td>'
				+ '<td><button class="icon-button remove" type="button" title="Remove row" aria-label="Remove row">&times;</button></td>';
			row.querySelector('.search').value = pair.search;
			row.querySelector('.replace').value = pair.replace;
			row.querySelector('.remove').addEventListener('click', () => row.remove());
			tableBody.appendChild(row);
		}

		initialPairs.forEach(addRow);
		if (initialPairs.length === 0) addRow();
		document.getElementById('add').addEventListener('click', () => addRow());
		document.getElementById('save').addEventListener('click', () => {
			const pairs = [...tableBody.querySelectorAll('tr')].map(row => ({
				search: row.querySelector('.search').value,
				replace: row.querySelector('.replace').value
			}));
			vscode.postMessage({ type: 'save', pairs });
		});
	</script>
</body>
</html>`;
}

function getNonce(): string {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let nonce = '';
	for (let index = 0; index < 32; index++) {
		nonce += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return nonce;
}

export function deactivate(): void {}