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
	use_cache: boolean = true,
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

	chatViewProvider.explainFlattenedContract(flatten_and_map_result, use_cache);
}

async function query(
	chatViewProvider: MentatViewProvider,
): Promise<void> {
}

export function activate(context: vscode.ExtensionContext) {
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

	const mentat = new Mentat(context);
	const chatViewProvider = new MentatViewProvider(context, treeDataProvider, mentat);
	const explanationViewProvider = new ExplanationWebview(context);

	vscode.window.registerWebviewViewProvider('mentat.explanation', explanationViewProvider);
	vscode.window.registerWebviewViewProvider("mentat.view", chatViewProvider, {
		webviewOptions: { retainContextWhenHidden: true }
	})

	async function explain__(node: ExplanationNode) {
		await chatViewProvider.explainNode(node, true);
	}

	async function explain_wo_cache_(node: ExplanationNode) {
		await chatViewProvider.explainNode(node, false);
	}

	async function flatten_and_map_() {
		let use_cache = vscode.workspace.getConfiguration('mentat').get('cache.S3CacheEnable');
		if(use_cache) {
			await flatten_and_map(chatViewProvider, true);
		}
		else {
			await flatten_and_map(chatViewProvider, false);
		}
	}

	async function flatten_and_map_wo_cache_() {
		await flatten_and_map(chatViewProvider, false);
	}

	async function query_() { 
		await query(chatViewProvider); 
	}

	async function changeModel_() {
		const apiModelString = await vscode.window.showInputBox({
			prompt: "Please enter your OpenRouter model string",
			ignoreFocusOut: true,
		});
		context.globalState.update('openrouter-api-model', apiModelString);
		vscode.window.showInformationMessage(`Model string updated to: ${apiModelString}`);
	}		

	context.subscriptions.push(
		vscode.commands.registerCommand("mentat.change_model", changeModel_),
		vscode.commands.registerCommand("mentat.flatten_and_map_wo_cache", flatten_and_map_wo_cache_),
		vscode.commands.registerCommand("mentat.flatten_and_map", flatten_and_map_),
		vscode.commands.registerCommand("node.select", (node) => {
			explanationViewProvider.updateContent(node.explanation || "No explanation available.");
		}),
		vscode.commands.registerCommand("mentat.explain", (node) => explain__(node)),
		vscode.commands.registerCommand("mentat.explain_wo_cache", (node) => explain_wo_cache_(node)),
	);


}

// This method is called when your extension is deactivated
export function deactivate() {
}