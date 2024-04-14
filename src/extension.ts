// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import MentatViewProvider from './mentat-view-provider';
const workspace = require("solidity-workspace");
import { Mentat } from './mentat';
import { NodeDependenciesProvider } from './tree-view-provider';

process.env["LANGCHAIN_TRACING_V2"] = "true";
process.env["LANGCHAIN_ENDPOINT"] = "https://api.smith.langchain.com";
process.env["LANGCHAIN_API_KEY"] = "ls__2435653e5df148fbbbe4266969dc6a7b"; // IDK why cwd is being set to /, dotenv is not working
process.env["LANGCHAIN_PROJECT"] = "mentat";

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

async function query(
	chatViewProvider: MentatViewProvider,
): Promise<void> {
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
				console.log('Parsed source unit:');	
				for (let su of Object.values(ws.sourceUnits)) {
					console.log(su.ast);
				}

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

	console.log('Loading Mentat extension...');

	console.log('Activating Mentat extension');

	/*** Tree view tests */
	const rootPath =
  		vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
		? vscode.workspace.workspaceFolders[0].uri.fsPath
		: undefined;
	let treeDataProvider = new NodeDependenciesProvider(rootPath);
	vscode.window.createTreeView('mentat.treeview', {treeDataProvider: treeDataProvider});

	const chatViewProvider = new MentatViewProvider(context, treeDataProvider, new Mentat(context));

	context.subscriptions.push(
		vscode.commands.registerCommand("mentat.analyze", query_), // remove
		vscode.commands.registerCommand("mentat.parse_file", parse_file),
		vscode.commands.registerCommand("mentat.flatten_contract", explain_),
		vscode.window.registerWebviewViewProvider("mentat.view", chatViewProvider, {
			webviewOptions: { retainContextWhenHidden: true }
		})
	);

	async function explain_() {
		await explain(chatViewProvider);
	}

	async function query_() { 
		await query(chatViewProvider); 
	}

}

// This method is called when your extension is deactivated
export function deactivate() {
}