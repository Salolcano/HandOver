# End to end

A record of one handover walked through the deployed Handover contract on GenLayer Studio Next (chain 61997). Every transaction below is a link to the explorer so each step can be reviewed.

## Deployment

| Item | Value |
|---|---|
| Network | GenLayer Studio Next, chain 61997 |
| Contract | [0x2C1Bc8ADeb0Ee04979B9bA7DdBB398B70bd95347](https://explorer-studio-next.genlayer.com/address/0x2C1Bc8ADeb0Ee04979B9bA7DdBB398B70bd95347) |

## Evidence page

One public page was registered as evidence:

1. [example.com](https://example.com)

## Checklist

1. The page says the domain is for use in illustrative examples. (mandatory)

## Transactions

All ten were sent to the contract, listed oldest first. The explorer does not decode method names, so the function column follows the lifecycle order in the README and ARCHITECTURE.md.

| # | Step | Function | Evidence page | Transaction |
|---|---|---|---|---|
| 1 | Write the handover | `create_handover` | none | [0x23ca9a7ca894047ee82e83ead4d5e7ceaa27fb8b78208cfb85a1092c9fa6b58a](https://explorer-studio-next.genlayer.com/tx/0x23ca9a7ca894047ee82e83ead4d5e7ceaa27fb8b78208cfb85a1092c9fa6b58a) |
| 2 | Freeze the checklist | `freeze_handover` | none | [0x943dfe367e42095ea73876acd728bb15927851552a0214432098d76a11878dd3](https://explorer-studio-next.genlayer.com/tx/0x943dfe367e42095ea73876acd728bb15927851552a0214432098d76a11878dd3) |
| 3 | Register evidence | `submit_evidence` | [example.com](https://example.com) | PASTE-TX-3-HASH-HERE |
| 4 | Request verification | `request_verification` | [example.com](https://example.com) | [0x34db09ada36ab4df33f904917bac7deffcb928ef083837a701540311f3e0c1b3](https://explorer-studio-next.genlayer.com/tx/0x34db09ada36ab4df33f904917bac7deffcb928ef083837a701540311f3e0c1b3) |
| 5 | Accept the verdict | `accept_verification` | n/a | [0xd1447ac506c834da5b3ac40dbc8d830eee4bbea468b07834bf30428638c51310](https://explorer-studio-next.genlayer.com/tx/0xd1447ac506c834da5b3ac40dbc8d830eee4bbea468b07834bf30428638c51310) |
| 6 | Finalize and pay | `finalize_handover` | n/a | [0xb2115b4530753a332b30d3878eadd7777f8ffa7cce5641a09ec43e41a836043f](https://explorer-studio-next.genlayer.com/tx/0xb2115b4530753a332b30d3878eadd7777f8ffa7cce5641a09ec43e41a836043f) |
| 7 | Additional call | see note below | n/a | [0xd97bfbfe89db1dbd193658f2aa83fb54d568bfd6a2b4b72754e4c741ba073a61](https://explorer-studio-next.genlayer.com/tx/0xd97bfbfe89db1dbd193658f2aa83fb54d568bfd6a2b4b72754e4c741ba073a61) |
| 8 | Additional call | see note below | n/a | [0x9f9b89a831b688f22a036223ec002a97b9c1fe08dbe3f5b6e9bae29833e91085](https://explorer-studio-next.genlayer.com/tx/0x9f9b89a831b688f22a036223ec002a97b9c1fe08dbe3f5b6e9bae29833e91085) |
| 9 | Additional call | see note below | n/a | [0xf7900ebbdfb1eafdb4a708319077c611f4e54f4ac4ab6c39949635f989862422](https://explorer-studio-next.genlayer.com/tx/0xf7900ebbdfb1eafdb4a708319077c611f4e54f4ac4ab6c39949635f989862422) |
| 10 | Additional call | see note below | n/a | [0x0e5e161d1414cc6e7e480145e228a1f0c3ccae23f2ec5914a3b8e6ef54b24908](https://explorer-studio-next.genlayer.com/tx/0x0e5e161d1414cc6e7e480145e228a1f0c3ccae23f2ec5914a3b8e6ef54b24908) |

### Note on calls 7 to 10

The lifecycle has six calls after deployment: `create_handover`, `freeze_handover`, `submit_evidence`, `request_verification`, `accept_verification` and `finalize_handover`. Ten calls were sent, so four are additional calls, such as a funding call, a helper authorization or a repeated step. Open each link to read its call data and confirm.

## Reproduce

Follow the steps in `END-TO-END.md` of the repository, using one checklist item.

Raw page address for the evidence, as the contract fetches it:

- https://example.com
