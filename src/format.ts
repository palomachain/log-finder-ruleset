import { ReturningLogFinderResult } from "@terra-money/log-finder"
import { collector } from "./collector"
import { defaultResult, defaultResults, formatLogs } from "./utility"
import {
  LogFinderActionResult,
  LogFinderAmountResult,
  Amount,
  Action,
  Event,
  Log,
  Msg,
} from "./types"

//return array [log][matched logs]
export const getTxCanonicalMsgs = (
  logs: Log[],
  msgs: Msg[],
  logMatcher: (events: Event[]) => ReturningLogFinderResult<Action>[][],
  getAllMsg?: boolean
): LogFinderActionResult[][] => {
  try {
    const matched: LogFinderActionResult[][] = logs.map((log, index) => {
      const matchLog = logMatcher(log.events)

      if (!matchLog.flat().length && getAllMsg) {
        const msg = msgs[index]
        matchLog[index] = [defaultResult(msg)]
      }

      const matchedPerLog: LogFinderActionResult[] = matchLog
        .flat()
        .filter(Boolean)
        .map((data) => ({ ...data }))
      return matchedPerLog
    })

    const logMatched = matched.map((match) => collector(match))

    if (!logMatched.flat().length) {
      // not matched rulesets or transaction failed or log is null (old network)
      const defaultLogs = defaultResults(msgs)
      return getAllMsg ? defaultLogs.map((log) => [log]) : [defaultLogs]
    }

    return logMatched
  } catch {
    const fragment = {
      type: "Unknown",
      attributes: [],
    }
    const transformed: Action = {
      msgType: "unknown/terra",
      canonicalMsg: ["Unknown tx"],
      payload: fragment,
    }

    return [[{ fragment, match: [], transformed }]]
  }
}

export const getTxAmounts = (
  logs: Log[],
  msgs: Msg[],
  logMatcher: (events: Event[]) => ReturningLogFinderResult<Amount>[][],
  address: string
): LogFinderAmountResult[][] | undefined => {
  try {
    const matched: LogFinderAmountResult[][] = logs.map((log, index) => {
      const matchLog = logMatcher(log.events)
      const matchedPerLog: LogFinderAmountResult[] = matchLog
        .flat()
        .filter(Boolean)
        .map((data) => {
          const msgType = msgs[index].type.split("/")[1]
          return formatLogs(data, msgType, address)
        })

      return matchedPerLog
    })

    return matched.flat().length > 0 ? matched : undefined
  } catch {
    return undefined
  }
}
