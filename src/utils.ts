export function extractTextFromString(text: string, startLine: number, startColumn: number, endLine: number, endColumn: number): string {
    // Split the text into an array of lines
    const lines = text.split('\n');

    // Extract the text within the specified range
    if (startLine === endLine) {
        // If the start and end are on the same line, return a substring of that line
        return lines[startLine].substring(startColumn, endColumn);
    } else {
        // If the start and end are on different lines, handle multi-line extraction
        const textLines = [];

        // Get the part of the text from the first line
        textLines.push(lines[startLine].substring(startColumn));

        // Get all the lines between the start and end lines
        for (let i = startLine + 1; i < endLine; i++) {
            textLines.push(lines[i]);
        }

        // Get the part of the text from the last line
        textLines.push(lines[endLine].substring(0, endColumn));

        // Join all the parts and return
        return textLines.join('\n');
    }
}
