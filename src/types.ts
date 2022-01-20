import {
  ReturningLogFinderTransformer,
  LogFinderRule,
  LogFragment,
} from "@terra-money/log-finder"

export interface Action {
  msgType: string
  canonicalMsg: string[]
  payload: LogFragment
}

export interface Amount {
  type: string
  amount: string
  sender?: string
  recipient?: string
  withdraw_date?: string
}

export interface Msg {
  type: string
  message: any
}

export interface Log {
  events: Event[]
}

export interface Event {
  type: string
  attributes: Attributes[]
}

export interface Attributes {
  key: string
  value: string
}

export interface LogFindersActionRuleSet {
  rule: LogFinderRule
  transform: ReturningLogFinderTransformer<Action>
}

export interface LogFindersAmountRuleSet {
  rule: LogFinderRule
  transform: ReturningLogFinderTransformer<Amount>
}

export interface LogFinderActionResult {
  fragment: LogFragment
  match: {
    key: string
    value: string
  }[]
  height?: number
  transformed?: Action
  txhash?: string
}

export interface LogFinderAmountResult {
  fragment: LogFragment
  match: {
    key: string
    value: string
  }[]
  height?: number
  transformed?: Amount
}
