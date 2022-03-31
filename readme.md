# @terra-money/log-finder-ruleset

Terra standard ruleset for well known log patterns

## Example codes

```typescript
import {
  createActionRuleSet,
  createAmountRuleSet
  createLogMatcherForActions,
  createLogMatcherForAmounts,
  getTxCanonicalMsgs,
  getTxAmounts
} from "@terra-money/log-finder-ruleset"

// https://github.com/terra-money/tx-history-api
const tx = {
  "height": ...,
  "txhash": ...,
  "parsed_message": ...,
  "parsed_fee": ...,
  "logs": ...,
  "code": ...,
  "timestamp": ...,
  "tx": ...,
}

const address = "terra1..."
const network = "mainnet"
const { logs, parsed_message } = tx

// getTxCanonicalMsgs
const actionRuleset = createActionRuleSet(network)
const actionLogMatcher = createLogMatcherForActions(actionRuleset)
const actionMatchedMsg =  getTxCanonicalMsgs(logs, parsed_message, logMatcher);

console.log(actionMatchedMsg)

// getTxAmountInfo
const amountRuleset = createAmountRuleSet(network)
const amountLogMatcher = createLogMatcherForAmounts(amountRuleset)
const amountMatchedMsg = getTxAmounts(logs, parsed_message, amountLogMatcher, address)

console.log(amountMatchedMsg)

```
