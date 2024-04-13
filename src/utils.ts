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

export function uniqueLocations(locations: vscode.Location[]): vscode.Location[] {
    const uniqueKey = (loc: vscode.Location) => `${loc.uri.toString()}:${loc.range.start.line}-${loc.range.end.line}`;
    const seen = new Set();
    const unique = [];
  
    for (const loc of locations) {
      const key = uniqueKey(loc);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(loc);
      }
    }
  
    return unique.slice(0, 3); // Limit to 3 locations
  }