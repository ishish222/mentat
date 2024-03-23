import * as vscode from 'vscode';

export async function getSurroundingCode(uri: vscode.Uri, position: vscode.Position, lineRange: number = 30): Promise<string> {
    let document = await vscode.workspace.openTextDocument(uri);

    // Calculate start and end lines, ensuring they are within the document bounds
    let startLine = Math.max(position.line - lineRange, 0);
    let endLine = Math.min(position.line + lineRange, document.lineCount - 1);

    // Extract the text for the calculated range
    const range = new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);
    const text = document.getText(range);

    return text;
}


