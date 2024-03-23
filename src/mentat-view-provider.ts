import { OpenAI } from 'openai';
import * as vscode from 'vscode';
import { code_explanation_prompt_1 } from './mentat-chains';
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";


async function extractTextFromLocation(location: vscode.Location): Promise<string | undefined> {
    try {
        // Open the document referred to by the location's URI
        const document = await vscode.workspace.openTextDocument(location.uri);
        
        // Extract the text within the specified range from the document
        const text = document.getText(location.range);
        
        return text;
    } catch (error) {
        console.error("Failed to extract text from location:", error);
        return undefined;
    }
}
export default class MentatViewProvider implements vscode.WebviewViewProvider {
    private webView?: vscode.WebviewView;
    private openAiApi?: OpenAI;
    private apiKey?: string;
    private message?: any;
    private llm?: ChatOpenAI;
    private chain?: any;

    constructor(private context: vscode.ExtensionContext) {
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
                this.sendOpenAiApiRequest(data.value);
            }
        });

        if (this.message !== null) {
            this.sendMessageToWebView(this.message);
            this.message = null;
        }
    }

    public async ensureApiKey() {
        this.apiKey = await this.context.globalState.get('chatgpt-api-key') as string;

        if (!this.apiKey) {
            const apiKeyInput = await vscode.window.showInputBox({
                prompt: "Please enter your OpenAI API Key, can be located at https://openai.com/account/api-keys",
                ignoreFocusOut: true,
            });
            this.apiKey = apiKeyInput!;
            this.context.globalState.update('chatgpt-api-key', this.apiKey);
        }
    }

    public async sendOpenAiApiRequest(
        prompt: string, 
        definition: vscode.Location,
        locations: vscode.Location[]
    ) {
        await this.ensureApiKey();

        if (!this.webView) {
            await vscode.commands.executeCommand('mentat.view.focus');
        } else {
            this.webView?.show?.(true);
        }
    
        const definitionText = await extractTextFromLocation(definition);
        const locationTexts = await Promise.all(locations.map(extractTextFromLocation));

        const prompt_text = `Exmplaining symbol ${prompt}\n\nDefinition: ${definitionText}\n\nUsage 1: ${locationTexts[0]}\n\nUsage 2: ${locationTexts[1]}\n\nUsage 3: ${locationTexts[2]}`;

        this.sendMessageToWebView({ 
            type: 'operator', 
            symbol: prompt,
            definition: definitionText,
            usage_1: locationTexts[0],
            usage_2: locationTexts[1],
            usage_3: locationTexts[2]
         });


        try {
            /** querying */
            this.apiKey = await this.context.globalState.get('chatgpt-api-key') as string;

            vscode.window.showInformationMessage(`API Key: ${this.apiKey}`);
            this.llm = new ChatOpenAI({openAIApiKey: this.apiKey, modelName: 'gpt-3.5-turbo-16k', temperature: 0.0});
            //this.chain = code_explanation_prompt_1.pipe(this.llm).pipe(new JsonOutputParser());
            this.chain = code_explanation_prompt_1.pipe(this.llm).pipe(new StringOutputParser());

            let response = await this.chain.invoke({
                code_snippet: prompt, 
                definition: definitionText, 
                usage_1: locationTexts[0], 
                usage_2: locationTexts[1], 
                usage_3: locationTexts[2]
            });
            //let content = response.content;
            let content = response;

            this.sendMessageToWebView({ 
                type: 'assistant', 
                value: content
             });
        } catch (error: any) {
            await vscode.window.showErrorMessage("Error", error);
            return;
        }
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
                        <div style="text-align: center;">
                            <div>In progress...</div>
                            <div class="loader"></div>
                        </div>
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