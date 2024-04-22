import * as vscode from 'vscode';
import { OpenAI } from 'openai';
import { ChatOpenAI } from "@langchain/openai";
import { ChatOpenRouter, ChatOpenRouterCached } from "./openrouter";
import { parse_flattened_prompt_xml } from './prompts/flattening_prompt';
import { explain_single_prompt_xml } from './prompts/explain-single-node';
import { decompose_flattened_prompt_xml } from './prompts/decompose-contracts';
import { StringOutputParser } from "@langchain/core/output_parsers";
import { JsonOutputParser, XMLOutputParser } from "@langchain/core/output_parsers";
import { S3Cache } from "./s3-cache";
import { bool } from 'aws-sdk/clients/signer';

export class Mentat {
    private openAiApi?: OpenAI;
    private apiKey?: string;
    private apiModel?: string;
    private llm_cached?: ChatOpenRouterCached;
    private llm?: ChatOpenRouter;
    private chain?: any;
    private currentContract?: string;
    private accessKeyId?: string;
    private secretAccessKey?: string;
    private region?: string;
    private bucket?: string;
    private prefix?: string;

    constructor(private context: vscode.ExtensionContext) {
    }

    public async ensureLangsmith() {
        let use_langsmith = vscode.workspace.getConfiguration('mentat').get('traceLangsmith.LangsmithEnable');
        if(!use_langsmith) {
            return;
        }
        process.env.LANGCHAIN_TRACING_V2 = 'true';
    
        let LANGCHAIN_ENDPOINT: string|undefined = vscode.workspace.getConfiguration('mentat').get('traceLangsmith.LangsmithURL');
        let LANGCHAIN_API_KEY: string|undefined = vscode.workspace.getConfiguration('mentat').get('traceLangsmith.LangsmithAPIKey');
        let LANGCHAIN_PROJECT: string|undefined = vscode.workspace.getConfiguration('mentat').get('traceLangsmith.LangstmithProjectName');

        if(!(LANGCHAIN_ENDPOINT && LANGCHAIN_API_KEY && LANGCHAIN_PROJECT)) {
            if(!LANGCHAIN_ENDPOINT) {
                const endpointInput = await vscode.window.showInputBox({
                    prompt: "Please enter your Langsmith endpoint",
                    ignoreFocusOut: true,
                });
                LANGCHAIN_ENDPOINT = endpointInput!;
                vscode.workspace.getConfiguration('mentat').update('traceLangsmith.LangsmithURL', LANGCHAIN_ENDPOINT)
            }
            if(!LANGCHAIN_API_KEY) {
                const apiKeyInput = await vscode.window.showInputBox({
                    prompt: "Please enter your Langsmith API Key",
                    ignoreFocusOut: true,
                });
                LANGCHAIN_API_KEY = apiKeyInput!;
                vscode.workspace.getConfiguration('mentat').update('traceLangsmith.LangsmithAPIKey', LANGCHAIN_API_KEY)
            }
            if(!LANGCHAIN_PROJECT) {
                const projectInput = await vscode.window.showInputBox({
                    prompt: "Please enter your Langsmith project",
                    ignoreFocusOut: true,
                });
                LANGCHAIN_PROJECT = projectInput!;
                vscode.workspace.getConfiguration('mentat').update('traceLangsmith.LangstmithProjectName', LANGCHAIN_PROJECT)
            }
        }
        process.env.LANGCHAIN_ENDPOINT = LANGCHAIN_ENDPOINT!;
        process.env.LANGCHAIN_API_KEY = LANGCHAIN_API_KEY!;
        process.env.LANGCHAIN_PROJECT = LANGCHAIN_PROJECT!;
    }

    public async ensureApiKey() {
        this.apiKey = vscode.workspace.getConfiguration('mentat').get('openrouter.openrouterApiKey');

        if (!this.apiKey) {
            const apiKeyInput = await vscode.window.showInputBox({
                prompt: "Please enter your OpenRouter API Key",
                ignoreFocusOut: true,
            });
            this.apiKey = apiKeyInput!;
            vscode.workspace.getConfiguration('mentat').update('openrouter.openrouterApiKey', this.apiKey)
        }
    }

    public async ensureApiModel() {
        this.apiModel = vscode.workspace.getConfiguration('mentat').get('openrouter.openrouterModelName');

        if (!this.apiModel) {
            const apiModelInput = await vscode.window.showInputBox({
                prompt: "Please enter your OpenRouter API Model string",
                ignoreFocusOut: true,
            });
            this.apiModel = apiModelInput!;
            vscode.workspace.getConfiguration('mentat').update('openrouter.openrouterModelName', this.apiModel)
        }
    }

    public async ensureCacheConfig() {
        this.accessKeyId = vscode.workspace.getConfiguration('mentat').get('cache.S3CacheAWSRoleKeyId');
        this.secretAccessKey = vscode.workspace.getConfiguration('mentat').get('cache.S3CacheAWSRoleSecretKey');
        this.region = vscode.workspace.getConfiguration('mentat').get('cache.S3CacheAWSRegion');
        this.bucket = vscode.workspace.getConfiguration('mentat').get('cache.S3CacheBucket');
        this.prefix = vscode.workspace.getConfiguration('mentat').get('cache.S3CachePrefix');

        if(!(this.accessKeyId && this.secretAccessKey && this.region && this.bucket && this.prefix)) {
            if(!this.accessKeyId) {
                const accessKeyIdInput = await vscode.window.showInputBox({
                    prompt: "Please enter your AWS S3 cache access key ID",
                    ignoreFocusOut: true,
                });
                this.accessKeyId = accessKeyIdInput!;
                vscode.workspace.getConfiguration('mentat').update('cache.S3CacheAWSRoleKeyId', this.accessKeyId)
            }
            if(!this.secretAccessKey) {
                const secretAccessKeyInput = await vscode.window.showInputBox({
                    prompt: "Please enter your AWS S3 cache secret access key",
                    ignoreFocusOut: true,
                });
                this.secretAccessKey = secretAccessKeyInput!;
                vscode.workspace.getConfiguration('mentat').update('cache.S3CacheAWSRoleSecretKey', this.secretAccessKey)
            }
            if(!this.region) {
                const regionInput = await vscode.window.showInputBox({
                    prompt: "Please enter your AWS S3 cache region",
                    ignoreFocusOut: true,
                });
                this.region = regionInput!;
                vscode.workspace.getConfiguration('mentat').update('cache.S3CacheAWSRegion', this.region)
            }
            if(!this.bucket) {
                const bucketInput = await vscode.window.showInputBox({
                    prompt: "Please enter your AWS S3 cache bucket",
                    ignoreFocusOut: true,
                });
                this.bucket = bucketInput!;
                vscode.workspace.getConfiguration('mentat').update('cache.S3CacheBucket', this.bucket)
            }
            if(!this.prefix) {
                const prefixInput = await vscode.window.showInputBox({
                    prompt: "Please enter your AWS S3 cache prefix",
                    ignoreFocusOut: true,
                });
                this.prefix = prefixInput!;
                vscode.workspace.getConfiguration('mentat').update('cache.S3CachePrefix', this.prefix)
            }
        }
    }

    private async ensureLLMCached() {
        if(!this.llm_cached) {
            await this.ensureLangsmith();
            await this.ensureApiKey();
            await this.ensureApiModel();
            await this.ensureCacheConfig();
            

            let cache = new S3Cache({
                accessKeyId: this.accessKeyId!,
                secretAccessKey: this.secretAccessKey!,
                region: this.region!
            }, 
            this.bucket!,
            this.prefix!
            );
            this.llm_cached = new ChatOpenRouterCached(this.apiModel!, this.apiKey!, cache);
        }
    }

    private async ensureLLM() {
        if(!this.llm) {
            await this.ensureLangsmith();
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

    public async decomposeFlattenedContract(
        flattened_contract: string, 
        use_cache: bool = true
    ): Promise<Object> {
        if(use_cache) {
            await this.ensureLLMCached();
            this.currentContract = flattened_contract;
            if(this.llm_cached) {
                // select the proper prompt
                // combine into a chain with output parser
                let prompt = decompose_flattened_prompt_xml;
                let llm = this.llm_cached;

                let output_parser = new XMLOutputParser();
                let chain = prompt.pipe(llm).pipe(output_parser);

                // invoke the chain
                let response = await chain.invoke({
                    "flattened_contract": flattened_contract,
                });
                
                // return the response
                return response;
            }
        }
        else {
            await this.ensureLLM();
            this.currentContract = flattened_contract;
            if(this.llm) {
                // select the proper prompt
                // combine into a chain with output parser

                let prompt = decompose_flattened_prompt_xml;
                let llm = this.llm;

                let output_parser = new XMLOutputParser();
                let chain = prompt.pipe(llm).pipe(output_parser);

                // invoke the chain
                let response = await chain.invoke({
                    "flattened_contract": flattened_contract,
                });
                
                // return the response
                return response;
            }
        }
        return 'LLM error';    
    }

    public async mapContract(
        contract_source: string, 
        use_cache: bool = true
    ): Promise<Object> {
        if(use_cache) {
            await this.ensureLLMCached();
            
            if(this.llm_cached) {
                // select the proper prompt
                // combine into a chain with output parser
                let prompt = parse_flattened_prompt_xml;
                let llm = this.llm_cached;

                let output_parser = new XMLOutputParser();
                let chain = prompt.pipe(llm).pipe(output_parser);

                // invoke the chain
                let response = await chain.invoke({
                    "flattened_contract": contract_source,
                });
                
                // return the response
                return response;
            }
        }
        else {
            await this.ensureLLM();
            
            if(this.llm) {
                // select the proper prompt
                // combine into a chain with output parser

                let prompt = parse_flattened_prompt_xml;
                let llm = this.llm;

                let output_parser = new XMLOutputParser();
                let chain = prompt.pipe(llm).pipe(output_parser);

                // invoke the chain
                let response = await chain.invoke({
                    "flattened_contract": contract_source,
                });
                
                // return the response
                return response;
            }
        }
        return 'LLM error';    
    }

    public async parseFlattenedContract(
        flattened_contract: string, 
        use_cache: bool = true
    ): Promise<Object> {
        if(use_cache) {
            await this.ensureLLMCached();
            this.currentContract = flattened_contract;
            if(this.llm_cached) {
                // select the proper prompt
                // combine into a chain with output parser
                //let prompt = parse_flattened_prompt;
                let prompt = parse_flattened_prompt_xml;
                let llm = this.llm_cached;
                //let output_parser = new StringOutputParser();
                //let output_parser = new JsonOutputParser();
                let output_parser = new XMLOutputParser();
                let chain = prompt.pipe(llm).pipe(output_parser);

                // invoke the chain
                let response = await chain.invoke({
                    "flattened_contract": flattened_contract,
                });
                
                // return the response
                return response;
            }
        }
        else {
            await this.ensureLLM();
            this.currentContract = flattened_contract;
            if(this.llm) {
                // select the proper prompt
                // combine into a chain with output parser
                //let prompt = parse_flattened_prompt;
                let prompt = parse_flattened_prompt_xml;
                let llm = this.llm;
                //let output_parser = new StringOutputParser();
                //let output_parser = new JsonOutputParser();
                let output_parser = new XMLOutputParser();
                let chain = prompt.pipe(llm).pipe(output_parser);

                // invoke the chain
                let response = await chain.invoke({
                    "flattened_contract": flattened_contract,
                });
                
                // return the response
                return response;
            }
        }
        return 'LLM error';    
    }

    public async explainNode(
        node_label: string, 
        explanations: string[],
        use_cache: bool = true
    ): Promise<Object> {
        if(use_cache) {
            await this.ensureLLMCached();
            if(this.llm_cached) {
                // select the proper prompt
                // combine into a chain with output parser
                //let prompt = explain_single_prompt;
                let prompt = explain_single_prompt_xml;
                let llm = this.llm_cached;
                //let output_parser = new StringOutputParser();
                //let output_parser = new JsonOutputParser();
                let output_parser = new XMLOutputParser();
                let chain = prompt.pipe(llm).pipe(output_parser);

                // invoke the chain
                let response = await chain.invoke({
                    "flattened_contract": this.currentContract,
                    "component_name": node_label,
                    "component_explanations": explanations
                });
                
                // return the response
                return response;
            }
        }
        else {
            await this.ensureLLM();
            if(this.llm) {
                // select the proper prompt
                // combine into a chain with output parser
                //let prompt = explain_single_prompt;
                let prompt = explain_single_prompt_xml;
                let llm = this.llm;
                //let output_parser = new StringOutputParser();
                //let output_parser = new JsonOutputParser();
                let output_parser = new XMLOutputParser();
                let chain = prompt.pipe(llm).pipe(output_parser);

                //console.log('explanations:', explanations.join('\n--\n'));
                // invoke the chain
                let response = await chain.invoke({
                    "flattened_contract": this.currentContract,
                    "component_name": node_label,
                    "component_explanations": explanations
                });
                
                // return the response
                return response;
            }
        }
        return 'LLM error';    
    }
}