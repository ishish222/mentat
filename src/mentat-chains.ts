require('dotenv').config();

import { ChatPromptTemplate } from '@langchain/core/prompts';


let code_explanation_system_str = `
You are an expert in the field of software development. You are tasked with analyzing a code snippet. You are given some context containing:
- definition of the code snippet
- four random instances of the code snippet usage

Your task is to explain what is the purpose of the code snippet. 

`;

let code_explanation_human_str = `
What is the purpose of the code snippet:
--
{code_snippet}
--
See definition:
--
{definition}
--
Random instances of the snippet usage:
--
Usage 1: {usage_1}

Usage 2: {usage_2}

Usage 3: {usage_3}
--
`;

export const code_explanation_prompt_1 = ChatPromptTemplate.fromMessages([
    ["system", code_explanation_system_str],
    ["human", code_explanation_human_str],
]);

/**
 *  Chain for breaking down a flattened contract into its components
 */

let contract_breakdown_system_str = `
You are an export in the field of Solidity contract development. You are tasked with analyzing a flattened contract. You are given some context containing:
- contract name
- flattened contract sourcecode

Your task is to break down the contract into its components.
`

let contract_breakdown_human_str = `
Please break down the following flattened contract into its components:
--
{flattened_contract}
--
`

export const contract_breakdown_prompt_1 = ChatPromptTemplate.fromMessages([
    ["system", contract_breakdown_system_str],
    ["human", contract_breakdown_human_str],
]);