import { ChatOpenAI } from "@langchain/openai";
import { BaseCache } from '@langchain/core/caches';

const OPENROUTER_BASE_URL = 'https://openrouter.ai';

export class ChatOpenRouterCached extends ChatOpenAI {

    constructor(
        public modelName: string, 
        public openAIApiKey: string|undefined,
        public maxTokens: number,
        public cache: BaseCache|undefined,  
        ) {
        super({
            openAIApiKey: openAIApiKey,
            modelName: modelName,
            maxTokens: maxTokens,
            temperature: 0.0,
            cache: cache,
        },
        {
            basePath: `${OPENROUTER_BASE_URL}/api/v1`,
            baseOptions: {
              headers: {
              },
            }
        });
    }

    public async queryMentat(prompt: string): Promise<string> {
        return 'test';    
    }
}

export class ChatOpenRouter extends ChatOpenAI {

    constructor(
        public modelName: string, 
        public openAIApiKey: string|undefined,
        public maxTokens: number
        ) {
        super({
            openAIApiKey: openAIApiKey,
            modelName: modelName,
            temperature: 0.0,
        },
        {
            basePath: `${OPENROUTER_BASE_URL}/api/v1`,
            baseOptions: {
              headers: {
              },
            }
        });
    }

    public async queryMentat(prompt: string): Promise<string> {
        return 'test';    
    }
}