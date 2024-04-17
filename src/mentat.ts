import * as vscode from 'vscode';
import { OpenAI } from 'openai';
import { ChatOpenAI } from "@langchain/openai";
import { ChatOpenRouter } from "./openrouter";
import { parse_flattened_prompt } from './prompts/flattening_prompt';
import { explain_single_prompt } from './prompts/explain-single-node';
import { StringOutputParser } from "@langchain/core/output_parsers";
import { JsonOutputParser } from "@langchain/core/output_parsers";

export class Mentat {
    private openAiApi?: OpenAI;
    private apiKey?: string;
    private apiModel?: string;
    private llm?: ChatOpenRouter;
    private chain?: any;
    private currentContract?: string;

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

    public async ensureApiModel() {
        this.apiModel = await this.context.globalState.get('openrouter-api-model') as string;

        if (!this.apiModel) {
            const apiModelInput = await vscode.window.showInputBox({
                prompt: "Please enter your OpenRouter API Model string",
                ignoreFocusOut: true,
            });
            this.apiModel = apiModelInput!;
            this.context.globalState.update('openrouter-api-model', this.apiModel);
        }
    }

    private async ensureLLM() {
        if(!this.llm) {
            await this.ensureApiKey();
            await this.ensureApiModel();
            this.llm = new ChatOpenRouter(this.apiModel!, this.apiKey!);
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
        this.currentContract = flattened_contract;
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

    public async explainNode(node_label: string, explanations: string[]): Promise<Object> {
        await this.ensureLLM();
        if(this.llm) {
            // select the proper prompt
            // combine into a chain with output parser
            let prompt = explain_single_prompt;
            let llm = this.llm;
            //let output_parser = new StringOutputParser();
            let output_parser = new JsonOutputParser();
            let chain = prompt.pipe(llm).pipe(output_parser);

            //console.log('explanations:', explanations.join('\n--\n'));
            // invoke the chain
            let response = await chain.invoke({
                "flattened_contract": this.currentContract,
                "component_name": node_label,
                "component_explanations": explanations.join('\n--\n')
            });
            
            // return the response
            return response;
        }
        return 'LLM error';    
    }
}