// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import MentatViewProvider from './mentat-view-provider';
import { getSurroundingCode } from './utils';
const parser = require('@solidity-parser/parser');
const workspace = require("solidity-workspace");
import { contract_breakdown_prompt_1 } from './mentat-chains';
import { Mentat } from './mentat';



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

function findSymbolContainingPosition(symbols: vscode.DocumentSymbol[], position: vscode.Position): vscode.DocumentSymbol | undefined {
    for (const symbol of symbols) {
        if (symbol.range.contains(position) && (
				symbol.kind === vscode.SymbolKind.Function
				|| symbol.kind === vscode.SymbolKind.Method
				|| symbol.kind === vscode.SymbolKind.Constructor
				|| symbol.kind === vscode.SymbolKind.Class
				|| symbol.kind === vscode.SymbolKind.Interface
				|| symbol.kind === vscode.SymbolKind.Object
				|| symbol.kind === vscode.SymbolKind.Struct
				)
			) {
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

	const symbol = findSymbolContainingPosition(symbols, location.range.start);

	if (!symbol) {
        vscode.window.showErrorMessage('No containing function found for the selected position.');
        return;
    }

	return new vscode.Location(location.uri, symbol.range);
}

function flattenSymbols(symbols: vscode.DocumentSymbol[], kinds: vscode.SymbolKind[]): vscode.DocumentSymbol[] {
    const flattened: vscode.DocumentSymbol[] = [];

    const helper = (symbols: vscode.DocumentSymbol[]) => {
        for (const symbol of symbols) {
            if (kinds.includes(symbol.kind)) {
                flattened.push(symbol);
            }
            if (symbol.children && symbol.children.length > 0) {
                helper(symbol.children);
            }
        }
    };

    helper(symbols);
    return flattened;
}


async function list_workspace_symbols_() {
	const allSymbols: vscode.DocumentSymbol[] = [];
  
	const files = await vscode.workspace.findFiles('**/*.sol', '**/node_modules/**', 100);
    
    for (const file of files) {
      const document = await vscode.workspace.openTextDocument(file);
      const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
		'vscode.executeDocumentSymbolProvider',
		document.uri
		);

		if (symbols && symbols.length > 0) {
			// Flatten the symbols including their children
			const kinds = [
				vscode.SymbolKind.Class, 
				vscode.SymbolKind.Method,
				vscode.SymbolKind.Constructor,
				vscode.SymbolKind.Function,
				vscode.SymbolKind.Struct
			];
			allSymbols.push(...flattenSymbols(symbols, kinds));
		}
    }

	return allSymbols;
}

function isWithin(symbolLocation: vscode.Location, referenceLocation: vscode.Location): boolean {
    if (symbolLocation.uri.toString() !== referenceLocation.uri.toString()) {
        return false;
    }
	
	const [symbolStart, symbolEnd] = [symbolLocation.range.start, symbolLocation.range.end];
    const [refStart, refEnd] = [referenceLocation.range.start, referenceLocation.range.end];

    return (refStart.isAfterOrEqual(symbolStart) && refEnd.isBeforeOrEqual(symbolEnd));
}

async function findReferences(symbol: ExtendedDocumentSymbol): Promise<vscode.Location[]> {
    //const position = symbol.range.start;

	const document = await vscode.workspace.openTextDocument(symbol.location.uri);
	const declarationLine = document.lineAt(symbol.range.start.line).text;
	const symbolNameIndex = declarationLine.indexOf(symbol.name);

	if (symbolNameIndex !== -1) {
		const references: vscode.Location[] = await vscode.commands.executeCommand(
			'vscode.executeReferenceProvider', 
			symbol.location.uri, 
			new vscode.Position(symbol.range.start.line, symbolNameIndex)
		);
		return references || [];
	}


    // Execute the command to find references. This returns locations where the symbol is referenced.
    //const references: vscode.Location[] = await vscode.commands.executeCommand(
     //   'vscode.executeReferenceProvider', 
     //   symbol.location.uri, 
    //    new vscode.Position(symbol.range.start.line, symbol.range.start.character+10)
    //);
	console.log(`Symbol ${symbol.name} not found in the declaration line: ${declarationLine}`);
    return [];
}

type ExtendedDocumentSymbol = vscode.DocumentSymbol & {
	explained: boolean;
	explanation: string;
	refers: ExtendedDocumentSymbol[];
  };

async function flatten_contract(
	document: vscode.TextDocument,
): Promise<string | void> {
	const ws = new workspace.Workspace();
	const current_document = document;

	if (current_document) {
		vscode.window.showInformationMessage(`Flattening contract in file ${current_document.uri.fsPath}.`);
		try {
			await ws.add(current_document.uri.fsPath, { content: current_document.getText() });
			await ws.withParserReady();
			
			let sourceUnit = ws.get(current_document.uri.fsPath);
			if (!sourceUnit) {
				console.error(`ERROR: could not find parsed sourceUnit for file ${current_document.uri.fsPath}`)
				return undefined;
			}
			let flat = sourceUnit.flatten();
			console.log('Flattened source unit:');	
			return flat;
		}
		catch (error) {
			console.error(`Error adding file to the workspace: ${error}`);
		}
	}
	else
		console.error('No active document found.');
}

async function explain(
	chatViewProvider: MentatViewProvider,
): Promise<void> {
	const current_document = vscode.window.activeTextEditor?.document;
	if(!current_document) {
		vscode.window.showErrorMessage('No active document found.');
		return;
	}
	
	const selection = vscode.window.activeTextEditor?.selection;
	if (!selection) {
		vscode.window.showErrorMessage('No selection found.');
		return;
	}

	const flatten_contract_result = await flatten_contract(current_document);
	if (!flatten_contract_result) {
		vscode.window.showErrorMessage('Error flattening contract.');
		return;
	}

	chatViewProvider.explainFlattenedContract(flatten_contract_result);
}

async function parse_file() {
	const ws = new workspace.Workspace();

	if (vscode.workspace.workspaceFolders) {
		console.log('Loading workspace...');
		//ws.loadWorkspace(vscode.workspace.workspaceFolders[0].uri.fsPath);
		
		const current_document = vscode.window.activeTextEditor?.document;
		if (current_document) {
			console.log(`Adding file ${current_document.uri.fsPath} to the workspace.`);
			ws.add(current_document.uri.fsPath, { content: current_document.getText() });
			ws.withParserReady().then(() => {
				let sourceUnit = ws.get(current_document.uri.fsPath);
				if (!sourceUnit) {
                    console.error(`ERROR: could not find parsed sourceUnit for file ${current_document.uri.fsPath}`)
                    return;
                }
				let flat = sourceUnit.flatten();
				console.log('Flattened source unit:');	
				console.log(flat);
			})
			.catch((error: any) => {
				console.error('Error adding file to the workspace.');
			});
		}
	}
	else
		vscode.window.showErrorMessage('No workspace folder found.');

	console.log('Parsing file...');
}

export function activate(context: vscode.ExtensionContext) {

	console.log('Activating Mentat extension');

	const chatViewProvider = new MentatViewProvider(context, new Mentat(context));
		
	context.subscriptions.push(
		vscode.commands.registerCommand("mentat.analyze", mentantQuery_),
		vscode.commands.registerCommand("mentat.parse_file", parse_file),
		vscode.commands.registerCommand("mentat.flatten_contract", explain_),
		vscode.window.registerWebviewViewProvider("mentat.view", chatViewProvider, {
			webviewOptions: { retainContextWhenHidden: true }
		})
	);

	async function explain_() {
		await explain(chatViewProvider);
	}

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