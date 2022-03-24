import { ReturningLogFinderResult } from "@terra-money/log-finder"
import { Action, Amount, LogFinderActionResult, Msg } from "./types"

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

export const formatLogs = (
  data: ReturningLogFinderResult<Amount>,
  msgType: string,
  address: string
) => {
  if (data.transformed) {
    const { transformed } = data
    const { type, withdraw_date } = transformed
    const logData = { ...data }
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

  return { ...data }
}

export const attachDenom = (string: string) =>
  string.includes("uluna") ? `${string}` : `${string}uluna`

export const defaultResults = (msgs: Msg[]): LogFinderActionResult[] =>
  msgs.map((msg) => defaultResult(msg))

export const defaultResult = (msg: Msg): LogFinderActionResult => {
  const fragment = {
    type: "Unknown",
    attributes: [],
  }

  const result: LogFinderActionResult = {
    fragment,
    match: [],
  }

  if (msg.type === "wasm/MsgExecuteContract") {
    const contract = msg.message.contract
    const executeMsg = msg.message.execute_msg

    // successful wasm decode
    try {
      const decodeMsg = JSON.parse(decodeExecuteMsg(executeMsg))
      const key =
        typeof decodeMsg === "string" ? Object.keys(decodeMsg)[0] : decodeMsg

      const transformed: Action = {
        msgType: "wasm/execute",
        canonicalMsg: [`Execute ${key || "default"} on ${contract}`],
        payload: fragment,
      }

      return { ...result, transformed }
    } catch (e) {
      // comes here, then it's unknown
      return {
        ...result,
        transformed: {
          msgType: "wasm/execute",
          canonicalMsg: [`Execute default on ${contract}`],
          payload: fragment,
        },
      }
    }
  } else {
    const msgTypes = msg.type.split("/")
    const transformed: Action = {
      msgType: `terra/${msgTypes[0] || "terra"}`,
      canonicalMsg: [msgTypes[1] || "Unknown tx"],
      payload: fragment,
    }

    return { ...result, transformed }
  }
}
