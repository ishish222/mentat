// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import MentatViewProvider from './providers/mentat-view-provider';
const workspace = require("solidity-workspace");
import { Mentat } from './mentat';
import { ExplanationNodeProvider, ExplanationNode } from './providers/tree-view-provider';
import { ExplanationWebview } from './providers/explanation-view-provider';

async function query(
	metntatViewProvider: MentatViewProvider,
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
	const metntatViewProvider = new MentatViewProvider(context, treeDataProvider, mentat);
	metntatViewProvider.loadTrees(context);

	const explanationViewProvider = new ExplanationWebview(context);

	vscode.window.registerWebviewViewProvider('mentat.explanation', explanationViewProvider);
	vscode.window.registerWebviewViewProvider("mentat.view", metntatViewProvider, {
		webviewOptions: { retainContextWhenHidden: true }
	})

	async function explain_(node: ExplanationNode) {
		await metntatViewProvider.explainNode(node, true);
	}

	async function decompose_() {
		let current_document = vscode.window.activeTextEditor?.document;
		await metntatViewProvider.flattenContract(current_document);
		let use_cache = vscode.workspace.getConfiguration('mentat').get('cache.S3CacheEnable');
		if(use_cache) {
			await metntatViewProvider.decomposeFlattenedContract(true);
		}
		else {
			await metntatViewProvider.decomposeFlattenedContract(false);
		}
	}

	async function map_contract_(node: ExplanationNode) {
		let use_cache = vscode.workspace.getConfiguration('mentat').get('cache.S3CacheEnable');
		if(use_cache) {
			await metntatViewProvider.mapContract(node);
		}
		else {
			await metntatViewProvider.mapContract(node);
		}

	}

	async function query_() { 
		await query(metntatViewProvider); 
	}

	async function changeModel_() {
		const apiModelString = await vscode.window.showInputBox({
			prompt: "Please enter your OpenRouter model string",
			ignoreFocusOut: true,
		});
		context.globalState.update('openrouter-api-model', apiModelString);
		vscode.window.showInformationMessage(`Model string updated to: ${apiModelString}`);
	}		

	async function node_select_(node: ExplanationNode) {
		explanationViewProvider.updateContent(node.explanation || "No explanation available.");
	}

	async function save_() {
		metntatViewProvider.saveTree()
	}

	context.subscriptions.push(
		vscode.commands.registerCommand("mentat.change_model", changeModel_),
		vscode.commands.registerCommand("mentat.decompose", decompose_),
		vscode.commands.registerCommand("mentat.map_contract", (node) => map_contract_(node)),
		vscode.commands.registerCommand("mentat.map_contract_wo_cache", (node) => map_contract_(node)),
		vscode.commands.registerCommand("mentat.refresh_tree", () => treeDataProvider.refresh()),
		vscode.commands.registerCommand("mentat.explain", (node) => explain_(node)),
		vscode.commands.registerCommand("mentat.save_tree", () => metntatViewProvider.saveTree()),
		vscode.commands.registerCommand("mentat.save_trees", () => metntatViewProvider.saveTrees(context)),
		vscode.commands.registerCommand("mentat.load_tree", () => metntatViewProvider.loadTree()),
		vscode.commands.registerCommand("node.select", (node) => node_select_(node)),
	);

}

// This method is called when your extension is deactivated
export function deactivate() {
	
}