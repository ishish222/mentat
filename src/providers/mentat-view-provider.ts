import * as vscode from 'vscode';
import { Mentat } from '../mentat';
import { ExplanationNodeProvider } from './tree-view-provider';
import { ExplanationNode } from './tree-view-provider';

export default class MentatViewProvider implements vscode.WebviewViewProvider {
    private webView?: vscode.WebviewView;
    private message?: any;

    constructor(
        private context: vscode.ExtensionContext, 
        private treeDataProvider: ExplanationNodeProvider,
        private mentat: Mentat
    ) {
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

    public async explainFlattenedContract(flattened_contract: string) {
        // focus on mentat view
        if (!this.webView) {
            await vscode.commands.executeCommand('mentat.view.focus');
        } else {
            this.webView?.show?.(true);
        }

        let message = `Requesting mapping of the flattened contract.`;
        
        this.sendMessageToWebView({ 
            type: 'operator', 
            value: message
        });

        console.log('parsing flattened contract')
        let output = await this.mentat.parseFlattenedContract(flattened_contract);

        this.treeDataProvider.clearExplanationNodes();
        this.treeDataProvider.loadExplanationNodes_xml(output);
        this.treeDataProvider.refresh();

        this.sendMessageToWebView({ 
            type: 'assistant', 
            value: 'Mapping retrieved'
        });
    }

    public async explainNode(node: ExplanationNode) {
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

        let output = await this.mentat.explainNode(node.label, explanations);
        
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