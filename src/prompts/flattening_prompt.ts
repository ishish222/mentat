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

/** XML version */

let example_1_xml = `
Human:

Please break down the following flattened contract into its components:

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

Please return the component map in the requested format.

Assistant:

\`\`\`
<response>
    <thinking>
        <step num="1">Thinking step 1</step>
        <step num="2">Thinking step 2</step>
        <step num="3">Thinking step 3</step>
        <step num="4">Thinking step 4</step>
        <step num="5">Thinking step 5</step>
    </thinking>
    <components>
        <component>
            <name>EtherWallet</name>
            <type>contract</type>
            <needs>
                <need>EtherWallet:owner</need>
                <need>EtherWallet:constructor</need>
                <need>EtherWallet:receive</need>
                <need>EtherWallet:withdraw</need>
                <need>EtherWallet:getBalance</need>
            </needs>
        </component>
        <component>
            <name>EtherWallet:owner</name>
            <type>state_variable</type>
        </component>
        <component>
            <name>EtherWallet:constructor</name>
            <type>function</type>
            <needs>
                <need>EtherWallet:owner</need>
            </needs>
        </component>
        <component>
            <name>EtherWallet:receive</name>
            <type>function</type>
            <needs></needs>
        </component>
        <component>
            <name>EtherWallet:withdraw</name>
            <type>function</type>
            <needs>
                <need>EtherWallet:owner</need>
            </needs>
        </component>
        <component>
            <name>EtherWallet:getBalance</name>
            <type>function</type>
            <needs></needs>
        </component>
    </components>
</response>
\`\`\`
`

let parse_flattened_system_xml_str = `
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

We need the response to be parsable as XML so we can't have any additional chatter in the response. If you want to comment, 
fit it into the XML format.

Example execution:

<examples>
<example num="1">
${example_1_xml}
</example>
</examples>

Please follow these thinking steps:

<thinking_steps>
    <step num="1">Take a deep breath and focus</step>
    <step num="2">Read the code carefully</step>
    <step num="3">Identify the components</step>
    <step num="4">Map the components</step>
    <step num="5">Return the map in the requested format</step>
</thinking_steps>

Please return the component map in the following format:

<output_format>
\`\`\`
<response>
    <thinking>
        <step num="1">Thinking step 1</step>
        <step num="2">Thinking step 2</step>
        <step num="3">Thinking step 3</step>
        <step num="4">Thinking step 4</step>
        <step num="5">Thinking step 5</step>
    </thinking>
    <components>
        <component>
            <name>Name of component 1</name>
            <type>Type of component 1</type>
            <needs>
                <need>Name of needed component 1</need>
                <need>Name of needed component 2</need>
                // additional needs
            </needs>
        </component>
        <component>
            <name>Name of component 2</name>
            <type>Type of component 2</type>
            <needs>
                <need>Name of needed component 1</need>
                <need>Name of needed component 2</need>
                // additional needs
            </needs>
        </component>
        ... // continued list of components
    </components>
</response>
\`\`\`
</output_format>
`;


let parse_flattened_human_xml_str = `
Please break down the following flattened contract into its components:

<flattened_contract_source>
{flattened_contract}
</flattened_contract_source>

Please return the component map in the requested format.
`;

export const parse_flattened_prompt_xml = ChatPromptTemplate.fromMessages([
    ["system", parse_flattened_system_xml_str],
    ["human", parse_flattened_human_xml_str],
]);