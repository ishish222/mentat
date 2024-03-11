// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

function analyzeCode(code: string): string {
	let results = `Oh you mean ${code}? Yeah, looks good.`;
	return results;
}

function getWebviewContent(analysisResults: string): string {
	return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta
			name="viewport"
			content="width=device-width, initial-scale=1.0"
		>
		<title>Analysis Results</title>
	</head>
	<body>
		<h1>Analysis Results</h1>
		<p>${analysisResults}</p>
	</body>
	</html>`;
}

export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "mentat" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('mentat.analyze', function () {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return; // No open text editor
        }

        const selection = activeEditor.selection;
        const text = activeEditor.document.getText(selection);

        // Analyze the selected text
        const analysisResults = analyzeCode(text);

        // Display the results in a WebviewPanel
        const panel = vscode.window.createWebviewPanel(
            'analysisResults', // Identifies the type of the webview. Used internally
            'Analysis Results', // Title of the panel displayed to the user
            vscode.ViewColumn.One, // Editor column to show the new webview panel in.
            {} // Webview options. More details can be found in the documentation
        );

        // Set the content of the webview panel
        panel.webview.html = getWebviewContent(analysisResults);
    });

    context.subscriptions.push(disposable);}

// This method is called when your extension is deactivated
export function deactivate() {}