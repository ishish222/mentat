import { ChatPromptTemplate } from '@langchain/core/prompts';

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

/* XML version */
let example_1_xml = `
Human:

Please read the following contract:

<flattened_contract_source>
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

</flattened_contract_source>

And explain the role of the component

<component_name>EtherWallet:receive</component_name>

Please return the component map in the requested format.

Assistant:

\`\`\`
<explanation>
    <name>EtherWallet:receive</name>
    <explanation>
The 'receive' function in the 'EtherWallet' contract is a special function that is executed whenever Ether is sent to the contract's address without specifying a function to call. This function is part of the Ethereum's fallback mechanism, which allows contracts to receive Ether without explicitly defining a function to handle the transfer.

In the context of the 'EtherWallet' contract, the 'receive' function serves as a way to accept Ether deposits into the contract. When Ether is sent to the contract's address, the 'receive' function is automatically executed, and the Ether is stored in the contract's balance. This allows users to send Ether to the contract, which can then be withdrawn using the 'withdraw' function.

The 'receive' function is marked as 'external', which means it can only be called from outside the contract, and not from other functions within the contract. It is also marked as 'payable', which allows it to receive Ether.
    </explanation>
</explanation>\`\`\`
`

let explain_single_system_xml_str = `
You are an expert in the field of Solidity contract development. You are tasked with analyzing a flattened contractand provide 
an explanation of a specific component of the contract. 

You are given a code containing a flattened contract and you are expected to analyze the meaning of the component in context
of the flattened contract and provide a detailed explanation of the role of the component in the contract.

Examples:

<examples>
<example num="1">
${example_1_xml}
</example>
</examples>

Please return the component map in the following format:

\`\`\`
<explanation>
    <name>Name of the component</name>
    <explanation>Explanation of the component's role</explanation>
</explanation>
\`\`\`
`;

let explain_single_human_xml_str = `
Please read the following contract:

<flattened_contract_source>
{flattened_contract}
</flattened_contract_source>

And explain the role of the component

<component_name>{component_name}</component_name>

You can use the following explanations of components to help you:
<component_explanations>
{component_explanations}
</component_explanations>

Please return the component map in the requested format.
`;


export const explain_single_prompt_xml = ChatPromptTemplate.fromMessages([
    ["system", explain_single_system_xml_str],
    ["human", explain_single_human_xml_str],
]);