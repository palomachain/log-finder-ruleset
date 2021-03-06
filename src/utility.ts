import { ReturningLogFinderResult } from "@terra-money/log-finder"
import { Tx } from "@terra-money/terra.js"
import { Action, Amount, LogFinderActionResult } from "./types"

const decodeBase64 = (str: string) => {
  try {
    return Buffer.from(str, "base64").toString()
  } catch {
    return str
  }
}

const BASE64_REGEX =
  /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/

const isBase64 = (value: string) => BASE64_REGEX.test(value)

const isBase64Extended = (value: string) =>
  // we are only interested in json-alike base64's, which generally start with "ey" ('{')
  value.startsWith("ey") &&
  // other checks
  isBase64(value)

const reviver = (_: string, value: any) =>
  typeof value === "string" && isBase64Extended(value)
    ? JSON.parse(decodeBase64(value), reviver)
    : value

const decodeExecuteMsg = (str: string | object) => {
  if (typeof str === "string" && isBase64Extended(str)) {
    const decoded = decodeBase64(str)
    try {
      return JSON.stringify(JSON.parse(decoded, reviver), null, 2)
    } catch {
      return decoded
    }
  }
  return JSON.stringify(str, undefined, 2)
}

export const defaultAction = (tx: Tx) => {
  const msgs = tx.body.messages

  const action: LogFinderActionResult[] = []
  const fragment = {
    type: "Unknown",
    attributes: [],
  }

  const result: LogFinderActionResult = {
    fragment,
    match: [],
  }

  msgs.forEach((msg) => {
    const msgInfo = msg.toData()
    if (msgInfo["@type"] === "/terra.wasm.v1beta1.MsgExecuteContract") {
      const { contract, execute_msg } = msgInfo

      // successful wasm decode
      try {
        const decodeMsg = JSON.parse(decodeExecuteMsg(execute_msg))
        const key = Object.keys(decodeMsg)[0]
        const transformed: Action = {
          msgType: "wasm/execute",
          canonicalMsg: [`Execute ${key || "default"} on ${contract}`],
          payload: fragment,
        }

        action.push({ ...result, transformed })
      } catch (e) {
        // comes here, then it's unknown
        action.push({
          ...result,
          transformed: {
            msgType: "wasm/execute",
            canonicalMsg: [`Execute default on ${contract}`],
            payload: fragment,
          },
        })
      }
    } else {
      const type = msg.toData()["@type"]
      const sliceIndex = type.indexOf("Msg")
      const renderType = type.slice(sliceIndex)

      const transformed: Action = {
        msgType: `terra/${renderType || "terra"}`,
        canonicalMsg: [renderType || "Unknown tx"],
        payload: fragment,
      }

      action.push({ ...result, transformed })
    }
  })

  return action
}

export const formatLogs = (
  data: ReturningLogFinderResult<Amount>,
  msgType: string,
  address: string,
  timestamp: string,
  txhash: string
) => {
  if (data.transformed) {
    const { transformed } = data
    const { type, withdraw_date } = transformed
    const logData = {
      ...data,
      timestamp: timestamp,
      txhash: txhash,
    }
    if (type === "delegate" && msgType === "MsgDelegate") {
      return {
        ...logData,
        transformed: { ...transformed, sender: address },
      }
    } else if (
      type === "unDelegate" &&
      msgType === "MsgUndelegate" &&
      withdraw_date
    ) {
      const now = new Date()
      const withdrawDate = new Date(withdraw_date)
      return {
        ...logData,
        transformed: {
          ...transformed,
          recipient: now > withdrawDate ? address : "",
        },
      }
    }
  }

  return { ...data, timestamp: timestamp, txhash: txhash }
}

export const attachDenom = (string: string) =>
  string.includes("uluna") ? `${string}` : `${string}uluna`
