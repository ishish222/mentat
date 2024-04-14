import * as vscode from 'vscode';
import { OpenAI } from 'openai';
import { ChatOpenAI } from "@langchain/openai";
import { ChatOpenRouter } from "./openrouter";
import { parse_flattened_prompt } from './prompts/flattening_prompt';
import { StringOutputParser } from "@langchain/core/output_parsers";
import { JsonOutputParser } from "@langchain/core/output_parsers";

export class Mentat {
    private openAiApi?: OpenAI;
    private apiKey?: string;
    private llm?: ChatOpenRouter;
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
            //this.llm = new ChatOpenRouter('gpt-3.5-turbo-16k', this.apiKey);
            this.llm = new ChatOpenRouter('gpt-4-turbo', this.apiKey);
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

    public async parseFlattenedContract(flattened_contract: string): Promise<Object> {
        await this.ensureLLM();
        if(this.llm) {
            // select the proper prompt
            // combine into a chain with output parser
            let prompt = parse_flattened_prompt;
            let llm = this.llm;
            //let output_parser = new StringOutputParser();
            let output_parser = new JsonOutputParser();
            let chain = prompt.pipe(llm).pipe(output_parser);

            // invoke the chain
            let response = await chain.invoke({
                "flattened_contract": flattened_contract,
            });
            
            // return the response
            return response;
        }
        return 'LLM error';    
    }
}