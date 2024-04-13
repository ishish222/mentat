import { ChatPromptTemplate } from '@langchain/core/prompts';

let parse_flattened_system_str = `
You are an expert in the field of Solidity contract development. You are tasked with analyzing a flattened contract. 
You need to examine the contract and break it down into a map of its components. The components are:
- contracts
- state variables
- functions
- events
- modifiers
- types

These components are the building blocks of a Solidity contract. They are related to each other with 'needs' relationships.
A component 'A' needs another components 'B' if understanding 'B' is necessary to understand 'A'.

You are given a code containing a flattened contract and you are expected to break it down into its components.
Please return the component map in the following format:

\`\`\`
\`\`\`
{{
    "components": {{
        "contract_name_1": {{
            "type": "contract",
            "definition": "contract contract_name_1 {{ ... }}", // the definition of the contract
            "needs": ["contract_name_2", "state_variable_1", "function_1"]
        }},
        "contract_name_2": {{
            "type": "contract",
            "definition": "contract contract_name_2 {{ ... }}",
            "needs": ["state_variable_2", "function_2"]
        }},
        "state_variable_1": {{
            "type": "state_variable",
            "definition": "uint256 state_variable_1",
            "needs": []
        }},
        "state_variable_2": {{
            "type": "state_variable",
            "definition": "uint256 state_variable_2",
            "needs": []
        }},
        "function_1": {{
            "type": "function",
            "definition": "function function_1() public {{ ... }}",
            "needs": ["event_1"]
        }},
        "function_2": {{
            "type": "function",
            "definition": "function function_2() public {{ ... }}",
            "needs": []
        }},
        ... // continued list of components
    }}
}}
\`\`\`
\`\`\`
`;

let parse_flattened_human_str = `
Please break down the following flattened contract into its components:
{flattened_contract}
Please return the component map in the requested format.
`;

export const parse_flattened_prompt = ChatPromptTemplate.fromMessages([
    ["system", parse_flattened_system_str],
    ["human", parse_flattened_human_str],
]);