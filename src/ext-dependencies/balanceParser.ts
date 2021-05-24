import {BigNumber} from 'bignumber.js'
import {dropsToXRP, normalizeNodes, currencyCodeFormat, xrplValueToNft} from './utils'
import {groupBy, mapValues, map, isEmpty, compact, flatten} from 'lodash'
import {AnyJson} from '../index'

/**
 * From: https://github.com/ripple/ripple-lib-extensions/tree/master/transactionparser/src
 */

type ValueObject = {
  value: string | number
}

type BalanceChange = {
  counterparty: string
  currency: string
  value: string
}

type FormattedBalanceChange = {
  counterparty: string
  currency: string
  value: string
  formatted: {
    value: string
    currency: string
  }
}

export type BalanceChanges = {
  [key: string]: BalanceChange[]
}

export type FormattedBalanceChanges = {
  [key: string]: FormattedBalanceChange[]
}

const groupByAddress = (balanceChanges: any) => {
  const grouped = groupBy(balanceChanges, node => {
    return node.address
  })
  return mapValues(grouped, group => {
    return map(group, node => {
      return node.balance
    })
  })
}

const parseValue = (value: ValueObject | string | number) => {
  const v: string | number = typeof value !== 'string' && typeof value !== 'number'
    ? (typeof value === 'object' && value ? value.value : value)
    : value
  return new BigNumber(v)
}

const parseXRPQuantity = (node: any, valueParser: any) => {
  const value = valueParser(node)

  if (value === null) {
    return null
  }

  return {
    address: node.finalFields.Account || node.newFields.Account,
    balance: {
      counterparty: '',
      currency: 'XRP',
      value: dropsToXRP(value).toString()
    }
  }
}

const flipTrustlinePerspective = (quantity: any) => {
  const negatedBalance = (new BigNumber(quantity.balance.value)).negated()
  return {
    address: quantity.balance.counterparty,
    balance: {
      counterparty: quantity.address,
      currency: quantity.balance.currency,
      value: negatedBalance.toString()
    }
  }
}

const parseTrustlineQuantity = (node: any, valueParser: any) => {
  const value = valueParser(node)

  if (value === null) {
    return null
  }

  const fields = isEmpty(node.newFields) ? node.finalFields : node.newFields
  const result = {
    address: fields.LowLimit.issuer,
    balance: {
      counterparty: fields.HighLimit.issuer,
      currency: fields.Balance.currency,
      value: value.toString()
    }
  }
  return [result, flipTrustlinePerspective(result)]
}

const parseQuantities = (metadata: AnyJson, valueParser: any) => {
  const values = normalizeNodes(metadata).map((node: any) => {
    if (node.entryType === 'AccountRoot') {
      return [parseXRPQuantity(node, valueParser)]
    } else if (node.entryType === 'RippleState') {
      return parseTrustlineQuantity(node, valueParser)
    }
    return []
  })
  return groupByAddress(compact(flatten(values)))
}

export const parseBalanceChanges = (metadata: AnyJson): FormattedBalanceChanges => {
  const quantities = parseQuantities(metadata, (node: any) => {
    let value = null
    if (node.newFields.Balance) {
      value = parseValue(node.newFields.Balance)
    } else if (node.previousFields.Balance && node.finalFields.Balance) {
      value = parseValue(node.finalFields.Balance).minus(parseValue(node.previousFields.Balance))
    }
    return value === null ? null : value.isZero() ? null : value
  })
  const formatted = Object.keys(quantities).reduce((a: FormattedBalanceChanges, b: string): FormattedBalanceChanges => {
    const formattedQuantities = quantities[b].map(q => {
      return Object.assign(q, {
        formatted: {
          value: q.counterparty !== '' && q.value.match(/e/)
           ? String(xrplValueToNft(q.value))
           : q.value,
          currency: q.currency === 'XRP' && q.counterparty === ''
            ? 'XRP'
            : currencyCodeFormat(q.currency)
        }
      })
    })
    Object.assign(a, {[b]: formattedQuantities})
    return a
  }, {})
  // console.dir(formatted, {depth: 40})
  return formatted
}
