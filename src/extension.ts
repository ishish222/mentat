// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import MentatViewProvider from './mentat-view-provider';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

export function activate(context: vscode.ExtensionContext) {

	console.log('Activating Mentat extension');

	const chatViewProvider = new MentatViewProvider(context);
		
	context.subscriptions.push(
		vscode.commands.registerCommand("mentat.analyze", mentantQuery_),
		vscode.window.registerWebviewViewProvider("mentat.view", chatViewProvider, {
			webviewOptions: { retainContextWhenHidden: true }
		})
	);

	async function mentantQuery_() { 
		await mentantQuery('Looking for refs to:'); 
	}

	async function mentantQuery(userInput: string) {
		if (!userInput) {
			return;
		}

		let editor = vscode.window.activeTextEditor;

		let code = ''

		if (editor) {
			const document = editor.document;
			const selection = editor.selection;
			const wordRange = document.getWordRangeAtPosition(selection.start);
			
			if (!wordRange) {
				vscode.window.showInformationMessage('No word is selected.');
				return;
			}
			
			// Use VS Code's built-in command to execute 'Find All References'
			const locations = await vscode.commands.executeCommand<vscode.Location[]>(
				'vscode.executeReferenceProvider',
				document.uri,
				wordRange.start
				);

			if (!locations || locations.length === 0) {
				vscode.window.showInformationMessage('No references found for the selected word.');
				return;
			}

			chatViewProvider.sendOpenAiApiRequest(userInput, locations);
		}
	}
}


// This method is called when your extension is deactivated
export function deactivate() {
}