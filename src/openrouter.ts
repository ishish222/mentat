import { ChatOpenAI } from "@langchain/openai";

const OPENROUTER_BASE_URL = 'https://openrouter.ai';

export class ChatOpenRouter extends ChatOpenAI {

    constructor(
        private model_name: string, 
        private openai_api_key: string|undefined,        
        ) {
        super({
            openAIApiKey: openai_api_key,
            modelName: model_name,
            temperature: 0.0,
        },
        {
            basePath: `${OPENROUTER_BASE_URL}/api/v1`,
            baseOptions: {
              headers: {
              },
            },
        });
    }

    public async queryMentat(prompt: string): Promise<string> {
        return 'test';    
    }
}