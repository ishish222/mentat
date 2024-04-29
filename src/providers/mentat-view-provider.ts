import * as vscode from 'vscode';
import { Mentat } from '../mentat';
import { serializeNode, deserializeNode } from './tree-view-provider';
import { ExplanationNodeProvider, ExplanationNode, ExplanationNodeContract } from './tree-view-provider';
const workspace = require("solidity-workspace");

export default class MentatViewProvider implements vscode.WebviewViewProvider {
    private webView?: vscode.WebviewView;
    private message?: any;
    private currentWorkspace?: workspace.Workspace;
    private currentDocument?: vscode.TextDocument;
    private currentFlattenedContract?: string;
    private trees = new Map<string, string>();

    constructor(
        private context: vscode.ExtensionContext, 
        private treeDataProvider: ExplanationNodeProvider,
        private mentat: Mentat
    ) {
    }

    public async saveTree() {
        if (this.currentDocument) {
            const serializedTree = this.treeDataProvider.tree.map(node => serializeNode(node));
            let stringified = JSON.stringify(serializedTree);
            this.trees.set(this.currentDocument.uri.fsPath, stringified);
        }
    }

    public async loadTree() {
        this.currentDocument = vscode.window.activeTextEditor?.document;
        if (this.currentDocument) {
            const treeJson = this.trees.get(this.currentDocument.uri.fsPath);
            if (treeJson) {
                const serializedTree = JSON.parse(treeJson) as any[];
                const deserializedTree = serializedTree.map(serializedNode => deserializeNode(null, serializedNode));
                this.treeDataProvider.tree = deserializedTree;
                this.treeDataProvider.refresh();
            }
        }
    }

    public async saveTrees(context: vscode.ExtensionContext) {
        const treeData = Array.from(this.trees.entries());
        const serializedData = JSON.stringify(treeData);
        context.globalState.update('trees', serializedData);
    }

    public async loadTrees(context: vscode.ExtensionContext) {
        const serializedData = context.globalState.get<string>('trees');
        if (serializedData) {
            const treeData = JSON.parse(serializedData) as Array<[string, string]>;
            const trees = new Map<string, string>(treeData);
            this.trees = trees;
    
            // If needed, load the tree for the current document
            this.loadTree();
        }
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this.webView = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        webviewView.webview.html = this.getHtml(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            if (data.type === 'queryMentat') {
                this.mentat.queryMentat(data.value);
            }
        });

        if (this.message !== null) { //what does this do?
            this.sendMessageToWebView(this.message);
            this.message = null;
        }
    }

    public async updateModel(model_name: string) {
        this.mentat.updateModel(model_name);
    }

    public async flattenContract(
        document: vscode.TextDocument,
    )
    {
        this.currentDocument = document;
        this.currentWorkspace = new workspace.Workspace();

		try {
			await this.currentWorkspace.add(this.currentDocument.uri.fsPath, { content: this.currentDocument.getText() });
			await this.currentWorkspace.withParserReady();
			
			let sourceUnit = this.currentWorkspace.get(this.currentDocument.uri.fsPath);
			if (!sourceUnit) {
				console.error(`ERROR: could not find parsed sourceUnit for file ${this.currentDocument.uri.fsPath}`)
				return undefined;
			}
			this.currentFlattenedContract = sourceUnit.flatten();
            console.log(`Flattened source unit: ${this.currentFlattenedContract}`);
		}
		catch (error) {
			console.error(`Error adding file to the workspace: ${error}`);
		}
    }

    public async decomposeFlattenedContract(
        use_cache: boolean = true,
        inv_cache: boolean = false
    )
    {
        if (!this.webView) {
            await vscode.commands.executeCommand('mentat.view.focus');
        } else {
            this.webView?.show?.(true);
        }

        let message = `Requesting decomposition of the flattened contract.`;
        
        this.sendMessageToWebView({ 
            type: 'operator', 
            value: message
        });

        console.log('decomposing flattened contract')
        let output = await this.mentat.decomposeFlattenedContract(this.currentFlattenedContract, use_cache, inv_cache);

        this.treeDataProvider.clearExplanationNodes();
        this.treeDataProvider.loadExplanationNodes_xml(true, output);
        this.treeDataProvider.refresh();

        this.sendMessageToWebView({ 
            type: 'assistant', 
            value: 'Mapping retrieved'
        });
    }

    public async mapContract(
        node: ExplanationNodeContract,
        use_cache: boolean = true,
        inv_cache: boolean = false
    )
    {
        if (!this.webView) {
            await vscode.commands.executeCommand('mentat.view.focus');
        } else {
            this.webView?.show?.(true);
        }

        let message = `Requesting mapping of the contract.`;
        
        this.sendMessageToWebView({ 
            type: 'operator', 
            value: message
        });

        let output = await this.mentat.mapContract(node, this.currentFlattenedContract, use_cache, inv_cache);

        node.clearExplanationNodeContracts();
        node.loadExplanationNodes_xml(output);
        this.treeDataProvider.refresh();

        this.sendMessageToWebView({ 
            type: 'assistant', 
            value: 'Mapping retrieved'
        });
    }

    public async explainNode(
        node: ExplanationNode,
        use_cache: boolean = true,
        inv_cache: boolean = false
    ) {
        // check if all children are explained
        let all_explained = true;
        node.children.forEach((child) => {
            if (!child.explained) {
                all_explained = false;
            }
        });

        if(!all_explained) {
            vscode.window.showErrorMessage('Please explain all dependencies first.');
            return;
        }

        this.sendMessageToWebView({ 
            type: 'operator', 
            value: `Requesting explanation for ${node.label}`
        });

        let explanations: string[] = [];
        node.children.forEach((child) => {
            if (child.explained) {
                
                explanations.push(`<explanation>${child.explanation}</explanation>`);
            }
        });

        let output = await this.mentat.explainNode(node, explanations, use_cache, inv_cache);
        
        node.explanation = output.explanation[1].explanation;
        node.explained = true;
        this.treeDataProvider.refresh();

        this.sendMessageToWebView({ 
            type: 'assistant', 
            value: 'Explanation retrieved'
        });

        return output;
    }

    public sendMessageToWebView(message: any) {
        if (this.webView) {
            this.webView?.webview.postMessage(message);
        } else {
            this.message = message;
        }
    }

    private getHtml(webview: vscode.Webview) {

        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'mentat.js'));
        const stylesMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'mentat.css'));
        const scriptIcon = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'icon_white.svg'));

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${stylesMainUri}" rel="stylesheet">
				<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
				<script src="https://cdn.tailwindcss.com"></script>
			</head>
			<body class="overflow-hidden">
				<div class="flex flex-col h-screen">
					<div class="flex-1 overflow-y-auto" id="chat-history"></div>
					<div id="in-progress" class="p-4 flex items-center hidden">
                        <img class="loader-svg" src="${scriptIcon}" alt="Description of SVG"/>
                    </div>
					<div class="p-4 flex items-center">
						<div class="flex-1">
							<textarea type="text" rows="2" class="border p-2 w-full" id="question-input"></textarea>
						</div>
					</div>
				</div>
				<script src="${scriptUri}"></script>
			</body>
			</html>`;
    }
}