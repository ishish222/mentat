import { ChatPromptTemplate } from '@langchain/core/prompts';

let example_1_xml = `
Human:

Please break down the following flattened contract file into its component contracts:

<flattened_contract_source>
</flattened_contract_source>

Please return the component map in the requested format.

Assistant:

\`\`\`
<response>
    <thinking>
        <step num="1"I took a deep breath and focused</step>
        <step num="2">I carefully read through the flattened contract</step>
        <step num="3">I identified individual components of the contract</step>
        <step num="4">I mapped the components according to the rules</step>
        <step num="5">I created the following responseaccording to the output_schema</step>
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

let decompose_flattened_system_xml_str = `
You are an expert in the field of Solidity contract development. You are tasked with analyzing a flattened contract file. 
You need to examine the file and break it down into a map of its contracts. The contracts are:
- contracts

<rules>
  <rule num = "1">These contracts are the building blocks of an application. They are related to each other with 'needs' relationships. A contract 'A' needs another contracts 'B' if understanding 'B' is necessary to understand 'A'.</rule>
  <rule num = "2">You are given a code containing a flattened contract and you are expected to break it down into its contracts. Note: we need all contracts mapped.</rule>
  <rule num = "3">We need the response to be parsable as XML so we can't have any additional chatter in the response. If you want to comment, fit it into the output_schema.</rule>
  <rule num = "4">No chatter outside output_schema!</rule>
</rules>

Example execution:

<examples>
<example num="1">
</example>
</examples>

Please follow these thinking steps:

<thinking_steps>
    <step num="1">Take a deep breath and focus</step>
    <step num="2">Read the code carefully</step>
    <step num="3">Identify the contracts</step>
    <step num="4">Map the contracts</step>
    <step num="5">Return the map in the requested format</step>
</thinking_steps>

Please return the contract map in the following format:

<output_schema>
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
            <name>Name of contract 1</name>
            <source_code>Source code of contract 1</source_code>
            <needs>
                <need>Name of needed contract 1</need>
                <need>Name of needed contract 2</need>
            </needs>
        </component>
        <component>
            <name>Name of contract 2</name>
            <source_code>Source code of contract 2</source_code>
            <needs>
                <need>Name of needed contract 1</need>
                <need>Name of needed contract 2</need>
                // additional needs
            </needs>
        </component>
        ... // continued list of contracts
    </components>
</response>
\`\`\`
</output_schema>
`;


let decompose_flattened_human_xml_str = `
Please break down the following flattened contract file into its component contracts and map dependencies:

<flattened_contract_source>
{flattened_contract}
</flattened_contract_source>

Please return the component map in the requested output_schema.
`;

export const decompose_flattened_prompt_xml = ChatPromptTemplate.fromMessages([
    ["system", decompose_flattened_system_xml_str],
    ["human", decompose_flattened_human_xml_str],
]);