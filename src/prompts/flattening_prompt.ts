import { ChatPromptTemplate } from '@langchain/core/prompts';

let example_1 = `
Human:

Please break down the following flattened contract into its components:
--
/** 
 *  SourceUnit: /Users/tsalacinski/Projects/2024-03-07-vscode/solidity-by-example.github.io/contracts/src/app/ether-wallet/EtherWallet.sol
*/

////// SPDX-License-Identifier-FLATTEN-SUPPRESS-WARNING: MIT
pragma solidity ^0.8.24;

contract EtherWallet {{
    address payable public owner;

    constructor() {{
        owner = payable(msg.sender);
    }}

    receive() external payable {{}}

    function withdraw(uint256 _amount) external {{
        require(msg.sender == owner, "caller is not owner");
        payable(msg.sender).transfer(_amount);
    }}

    function getBalance() external view returns (uint256) {{
        return address(this).balance;
    }}
}}

--
Please return the component map in the requested format.

Assistant:

\`\`\`
{{
    "components": {{
        "EtherWallet": {{
            "type": "contract",
            "needs": ["EtherWallet:owner", "EtherWallet:constructor", "EtherWallet:receive", "EtherWallet:withdraw", "EtherWallet:getBalance"]
        }},
        "EtherWallet:owner": {{
            "type": "state_variable",
            "needs": []
        }},
        "EtherWallet:constructor": {{
            "type": "function",
            "needs": ["EtherWallet:owner"]
        }},
        "EtherWallet:receive": {{
            "type": "function",
            "needs": []
        }},
        "EtherWallet:withdraw": {{
            "type": "function",
            "needs": ["EtherWallet:owner"]
        }},
        "EtherWallet:getBalance": {{
            "type": "function",
            "needs": []
        }}
    }}
}}
\`\`\`
`

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

You are given a code containing a flattened contract and you are expected to break it down into its components. Note: we need 
all contracts mapped. 

Examples:
--
Example1:
${example_1}
--
Please return the component map in the following format:

\`\`\`
{{
    "components": {{
        "contract_name_1": {{
            "type": "contract",
            "needs": ["contract_name_2", "state_variable_1", "function_1"]
        }},
        "contract_name_2": {{
            "type": "contract",
            "needs": ["state_variable_2", "function_2"]
        }},
        "state_variable_1": {{
            "type": "state_variable",
            "needs": []
        }},
        "state_variable_2": {{
            "type": "state_variable",
            "needs": []
        }},
        "function_1": {{
            "type": "function",
            "needs": ["event_1"]
        }},
        "function_2": {{
            "type": "function",
            "needs": []
        }},
        ... // continued list of components
    }}
}}
\`\`\`
`;

let parse_flattened_human_str = `
Please break down the following flattened contract into its components:
--
{flattened_contract}
--
Please return the component map in the requested format.
`;

export const parse_flattened_prompt = ChatPromptTemplate.fromMessages([
    ["system", parse_flattened_system_str],
    ["human", parse_flattened_human_str],
]);

let parse_flattened_human_xml_str = `
Please break down the following flattened contract into its components:
<flattened_contract_source>
{flattened_contract}
</flattened_contract_source>
Please return the component map in the requested format.
`;
/*
export const parse_flattened_prompt_xml = ChatPromptTemplate.fromMessages([
    ["system", parse_flattened_system_xml_str],
    ["human", parse_flattened_human_xml_str],
]);*/