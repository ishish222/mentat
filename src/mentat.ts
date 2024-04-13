import * as vscode from 'vscode';
import { OpenAI } from 'openai';
import { ChatOpenAI } from "@langchain/openai";
import { ChatOpenRouter } from "./openrouter";

export class Mentat {
    private openAiApi?: OpenAI;
    private apiKey?: string;
    private llm?: ChatOpenAI;
    private chain?: any;

    constructor(private context: vscode.ExtensionContext) {
    }

    public async ensureApiKey() {
        this.apiKey = await this.context.globalState.get('openrouter-api-key') as string;

        if (!this.apiKey) {
            const apiKeyInput = await vscode.window.showInputBox({
                prompt: "Please enter your OpenRouter API Key",
                ignoreFocusOut: true,
            });
            this.apiKey = apiKeyInput!;
            this.context.globalState.update('openrouter-api-key', this.apiKey);
        }
    }

    private async ensureLLM() {
        if(!this.llm) {
            await this.ensureApiKey();
            //this.llm = new ChatOpenAI({openAIApiKey: this.apiKey, modelName: 'gpt-3.5-turbo-16k', temperature: 0.0});
            this.llm = new ChatOpenRouter('gpt-3.5-turbo-16k', this.apiKey);
        }
    }

    public async queryMentat(prompt: string): Promise<string> {
        await this.ensureLLM();
        // select the proper prompt
        // combine into a chain with output parser
        // invoke the chain
        // parse the response
        // return the response

        return 'test';    
    }

    public async parseFlattenedContract(flattened_contract: string): Promise<string> {
        await this.ensureLLM();
        // select the proper prompt
        // combine into a chain with output parser
        // invoke the chain
        // parse the response
        // return the response

        return 'test';    
    }
}