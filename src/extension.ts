// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import MentatViewProvider from './providers/mentat-view-provider';
const workspace = require("solidity-workspace");
import { Mentat } from './mentat';
import { ExplanationNodeProvider, ExplanationNode } from './providers/tree-view-provider';
import { ExplanationWebview } from './providers/explanation-view-provider';
import * as dotenv from 'dotenv';
import * as path from 'path';

type ExtendedDocumentSymbol = vscode.DocumentSymbol & {
	explained: boolean;
	explanation: string;
	refers: ExtendedDocumentSymbol[];
  };

async function flatten(
	document: vscode.TextDocument,
): Promise<string | void> {
	const ws = new workspace.Workspace();
	const current_document = document;

	if (current_document) {
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

async function flatten_and_map(
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

	const flatten_and_map_result = await flatten(current_document);
	if (!flatten_and_map_result) {
		vscode.window.showErrorMessage('Error flattening contract.');
		return;
	}

	chatViewProvider.explainFlattenedContract(flatten_and_map_result);
}

async function query(
	chatViewProvider: MentatViewProvider,
): Promise<void> {
}

export function activate(context: vscode.ExtensionContext) {
	// Load environment variables (for Langsmith API key, etc.)
	console.log('Loading .env');
	dotenv.config({ path: path.resolve(context.extensionPath, '.env') });

	console.log('Activating Mentat extension');

	/*** Tree view tests */
	const rootPath =
  		vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
		? vscode.workspace.workspaceFolders[0].uri.fsPath
		: undefined;

	if(!rootPath) {
		vscode.window.showErrorMessage('No workspace found.');
		return;
	}

	let treeDataProvider = new ExplanationNodeProvider(context, rootPath);
	vscode.window.createTreeView('mentat.treeview', {treeDataProvider: treeDataProvider});

	const chatViewProvider = new MentatViewProvider(context, treeDataProvider, new Mentat(context));
	const explanationViewProvider = new ExplanationWebview(context);

	vscode.window.registerWebviewViewProvider('mentat.explanation', explanationViewProvider);

	context.subscriptions.push(
		vscode.commands.registerCommand("mentat.flatten_and_map", flatten_and_map_),
		vscode.commands.registerCommand("node.select", (node) => {
			explanationViewProvider.updateContent(node.explanation || "No explanation available.");
		}),
		vscode.commands.registerCommand("mentat.explain", (node) => explain__(node)),
		vscode.window.registerWebviewViewProvider("mentat.view", chatViewProvider, {
			webviewOptions: { retainContextWhenHidden: true }
		}),
	);

		
	async function explain__(node: ExplanationNode) {
		await chatViewProvider.explainNode(node);
	}

	async function flatten_and_map_() {
		await flatten_and_map(chatViewProvider);
	}

	async function query_() { 
		await query(chatViewProvider); 
	}

}

// This method is called when your extension is deactivated
export function deactivate() {
}