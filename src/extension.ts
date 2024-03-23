// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import MentatViewProvider from './mentat-view-provider';
import { getSurroundingCode } from './utils';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

async function find_definition(document: vscode.Uri, wordRange: vscode.Position) {
	let definitionLocations = await vscode.commands.executeCommand<vscode.Location[]>(
		'vscode.executeDefinitionProvider',
		document,
		wordRange
	);
	return definitionLocations;
}

async function find_references(document: vscode.Uri, wordRange: vscode.Position) {
	let referenceLocations = await vscode.commands.executeCommand<vscode.Location[]>(
		'vscode.executeReferenceProvider',
		document,
		wordRange
		);
	return referenceLocations;
}

async function findSymbolContainingPosition(symbols: vscode.DocumentSymbol[], position: vscode.Position): Promise<vscode.DocumentSymbol | undefined> {
    for (const symbol of symbols) {
        if (symbol.range.contains(position) && symbol.kind === vscode.SymbolKind.Function) {
            return symbol;
        }

        // Recursively search in children
        if (symbol.children && symbol.children.length > 0) {
            const found = findSymbolContainingPosition(symbol.children, position);
            if (found) {
                return found;
            }
        }
    }

    return undefined;
}

async function find_containing_location(location: vscode.Location) {
	let symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
		'vscode.executeDocumentSymbolProvider', location.uri);

	if (!symbols) {
		vscode.window.showErrorMessage('No symbols found in document.');
		return;
	}

	const symbol = await findSymbolContainingPosition(symbols, location.range.start);

	if (!symbol) {
        vscode.window.showErrorMessage('No containing function found for the selected position.');
        return;
    }

	return new vscode.Location(location.uri, symbol.range);
}

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
		const word = document.getText(wordRange);
		
		if (!wordRange) {
			vscode.window.showInformationMessage('No word is selected.');
			return;
		}

		// Find the definition of the word
		let definitionLocations = await find_definition(document.uri, selection.start);

		if (!definitionLocations || definitionLocations.length === 0) {
			vscode.window.showErrorMessage('No definition found for the selected word.');
			return;
		}
		
		// Use VS Code's built-in command to execute 'Find All References'
		let referenceLocations = await find_references(document.uri, selection.start);

		if (!referenceLocations || referenceLocations.length === 0) {
			vscode.window.showErrorMessage('No references found for the selected word.');
			return;
		}
		let randomReferences = referenceLocations.sort(() => Math.random() - Math.random()).slice(0, 3);
		
		let referenceContainingLocations = [];
		for (const location of randomReferences) {
			let contLocation = await find_containing_location(location);
			if(contLocation) {
				referenceContainingLocations.push(contLocation); // Ensure correct handling based on contLocation's actual type (Range or Location?)
			}
		}
        // Assuming we're taking the first definition location
		chatViewProvider.sendOpenAiApiRequest(word, definitionLocations[0], referenceContainingLocations);
	}
}


// This method is called when your extension is deactivated
export function deactivate() {
}