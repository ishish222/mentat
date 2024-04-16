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

let explain_single_system_str = `
You are an expert in the field of Solidity contract development. You are tasked with analyzing a flattened contractand provide 
an explanation of a specific component of the contract. 

You are given a code containing a flattened contract and you are expected to analyze the meaning of the component in context
of the flattened contract and provide a detailed explanation of the role of the component in the contract.

--
Please return the component map in the following format:

\`\`\`
{{
    "component": {{
        "name": "component_name",
        "explanation": "explanation_of_component",
    }}
}}
\`\`\`
`;

let explain_single_human_str = `
Please read the following contract:
--
{flattened_contract}
--
And explain the role of the component
--
{component_name}
--
You can use the following explanations of components to help you:
--
{component_explanations}
--
Please return the component map in the requested format.
`;

export const explain_single_prompt = ChatPromptTemplate.fromMessages([
    ["system", explain_single_system_str],
    ["human", explain_single_human_str],
]);