import { ChatPromptTemplate } from '@langchain/core/prompts';

let example_1_xml = `
Human:


Please break down the following flattened contract file into its component contracts and map dependencies:

<flattened_contract_source>

/** 
 *  SourceUnit: /Users/tsalacinski/Projects/2024-03-07-code4arena/2023-06-lybra/contracts/lybra/miner/esLBRBoost.sol
*/
            
////// SPDX-License-Identifier-FLATTEN-SUPPRESS-WARNING: MIT
// OpenZeppelin Contracts v4.4.1 (utils/Context.sol)

pragma solidity ^0.8.0;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {{
    function _msgSender() internal view virtual returns (address) {{
        return msg.sender;
    }}

    function _msgData() internal view virtual returns (bytes calldata) {{
        return msg.data;
    }}
}}




/** 
 *  SourceUnit: /Users/tsalacinski/Projects/2024-03-07-code4arena/2023-06-lybra/contracts/lybra/miner/esLBRBoost.sol
*/
            
////// SPDX-License-Identifier-FLATTEN-SUPPRESS-WARNING: MIT
// OpenZeppelin Contracts (last updated v4.9.0) (access/Ownable.sol)

pragma solidity ^0.8.0;

////import "../utils/Context.sol";

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the owner account will be the one that deploys the contract. This
 * can later be changed with {{transferOwnership}}.
 *
 * This module is used through inheritance. It will make available the modifier
 * \`onlyOwner\`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {{
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor() {{
        _transferOwnership(_msgSender());
    }}

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {{
        _checkOwner();
        _;
    }}

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {{
        return _owner;
    }}

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {{
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
    }}

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * \`onlyOwner\` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {{
        _transferOwnership(address(0));
    }}

    /**
     * @dev Transfers ownership of the contract to a new account (\`newOwner\`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {{
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }}

    /**
     * @dev Transfers ownership of the contract to a new account (\`newOwner\`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {{
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }}
}}


/** 
 *  SourceUnit: /Users/tsalacinski/Projects/2024-03-07-code4arena/2023-06-lybra/contracts/lybra/miner/esLBRBoost.sol
*/

////// SPDX-License-Identifier-FLATTEN-SUPPRESS-WARNING: GPL-3.0

pragma solidity ^0.8.17;

////import "@openzeppelin/contracts/access/Ownable.sol";

contract esLBRBoost is Ownable {{
    esLBRLockSetting[] public esLBRLockSettings;
    mapping(address => LockStatus) public userLockStatus;

    // Define a struct for the lock settings
    struct esLBRLockSetting {{
        uint256 duration;
        uint256 miningBoost;
    }}

    // Define a struct for the user's lock status
    struct LockStatus {{
        uint256 unlockTime;
        uint256 duration;
        uint256 miningBoost;
    }}

    // Constructor to initialize the default lock settings
    constructor() {{
        esLBRLockSettings.push(esLBRLockSetting(30 days, 20 * 1e18));
        esLBRLockSettings.push(esLBRLockSetting(90 days, 30 * 1e18));
        esLBRLockSettings.push(esLBRLockSetting(180 days, 50 * 1e18));
        esLBRLockSettings.push(esLBRLockSetting(365 days, 100 * 1e18));
    }}

    // Function to add a new lock setting
    function addLockSetting(esLBRLockSetting memory setting) external onlyOwner {{
        esLBRLockSettings.push(setting);
    }}

    // Function to set the user's lock status
    function setLockStatus(uint256 id) external {{
        esLBRLockSetting memory _setting = esLBRLockSettings[id];
        LockStatus memory userStatus = userLockStatus[msg.sender];
        if (userStatus.unlockTime > block.timestamp) {{
            require(userStatus.duration <= _setting.duration, "Your lock-in period has not ended, and the term can only be extended, not reduced.");
        }}
        userLockStatus[msg.sender] = LockStatus(block.timestamp + _setting.duration, _setting.duration, _setting.miningBoost);
    }}

    // Function to get the user's unlock time
    function getUnlockTime(address user) external view returns (uint256 unlockTime) {{
        unlockTime = userLockStatus[user].unlockTime;
    }}

    /**
     * @notice calculate the user's mining boost based on their lock status
     * @dev Based on the user's userUpdatedAt time, finishAt time, and the current time,
     * there are several scenarios that could occur, including no acceleration, full acceleration, and partial acceleration.
     */
    function getUserBoost(address user, uint256 userUpdatedAt, uint256 finishAt) external view returns (uint256) {{
        uint256 boostEndTime = userLockStatus[user].unlockTime;
        uint256 maxBoost = userLockStatus[user].miningBoost;
        if (userUpdatedAt >= boostEndTime || userUpdatedAt >= finishAt) {{
            return 0;
        }}
        if (finishAt <= boostEndTime || block.timestamp <= boostEndTime) {{
            return maxBoost;
        }} else {{
            uint256 time = block.timestamp > finishAt ? finishAt : block.timestamp;
            return ((boostEndTime - userUpdatedAt) * maxBoost) / (time - userUpdatedAt);
        }}
    }}
}}


</flattened_contract_source>

Please return the component map in the requested output_schema.

Assistant:

\`\`\`
<response>
    <thinking>
        <step num="1">Take a deep breath and focus</step>
        <step num="2">Read the code carefully</step>
        <step num="3">Identify the contracts</step>
        <step num="4">Map the contracts</step>
        <step num="5">Return the map in the requested format</step>
    </thinking>
    <components>
        <component>
            <name>Context</name>
            <needs>
            </needs>
        </component>
        <component>
            <name>Ownable</name>
            <needs>
                <need>Context</need>
            </needs>
        </component>
        <component>
            <name>esLBRBoost</name>
            <needs>
                <need>Ownable</need>
            </needs>
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
  <rule num = "3">Please HTML escape the characters '<', '>', and '&' in between xml tags.</rule>
  <rule num = "4">We need the response to be parsable as XML so we can't have any additional chatter in the response. If you want to comment, fit it into the output_schema.</rule>
  <rule num = "5">No chatter outside output_schema!</rule>
</rules>

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
            <needs>
                <need>Name of needed contract 1</need>
                <need>Name of needed contract 2</need>
            </needs>
        </component>
        <component>
            <name>Name of contract 2</name>
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