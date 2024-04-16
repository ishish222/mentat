import * as vscode from 'vscode';

export class ExplanationWebview implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    
    constructor(private context: vscode.ExtensionContext) {}

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
        this._view.webview.options = {
            enableScripts: true
        };

        this._view.webview.html = this.getHtmlForWebview();

        // When the view is disposed, set the reference to undefined
        this._view.onDidDispose(() => {
            this._view = undefined;
        }, null, this.context.subscriptions);
    }

    public updateContent(content: string): void {
        if (this._view) {
            this._view.webview.html = this.getHtmlForWebview(content);
        }
    }

    private getHtmlForWebview(content: string = "Select a node to see its explanation.") {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Explanation</title>
</head>
<body>
    <p>${content}</p>
</body>
</html>`;
    }
}
