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
		await mentantQuery('=> '); 
	}

	async function mentantQuery(userInput: string) {
		if (!userInput) {
			return;
		}

		let editor = vscode.window.activeTextEditor;

        if (!editor) {
            return;
        }

		const document = editor.document;
		const selection = editor.selection;
		const wordRange = document.getWordRangeAtPosition(selection.start);
		
		if (!wordRange) {
			vscode.window.showInformationMessage('No word is selected.');
			return;
		}
		
		const word = document.getText(wordRange);

		vscode.window.showInformationMessage(`Retrieving symbols for ${document.uri}`);
		const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
            'vscode.executeDocumentSymbolProvider', document.uri);

		userInput += `Will analyze references to ${word}, `

		let is_symbol = false;

		if (symbols) {
			userInput += `Symbols found: ${symbols}, `
			const matchingSymbols = symbols.filter(symbol => symbol.name === word);
			if (matchingSymbols.length > 0) {
				// Found matching symbols - process them
				vscode.window.showInformationMessage(`Found symbols: ${matchingSymbols.map(symbol => symbol.name).join(', ')}`);
				// Do something with the matching symbols
				is_symbol = true;
				userInput += 'which is a symbol. ';
			} else {
				vscode.window.showInformationMessage('No matching symbols found');
				is_symbol = false;
				userInput += 'which is NOT a symbol. ';
			}
		}
		else {
			vscode.window.showInformationMessage('No symbols found');
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


// This method is called when your extension is deactivated
export function deactivate() {
}