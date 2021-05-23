import {BigNumber} from 'bignumber.js'

export const dropsToXRP = (drops: BigNumber): BigNumber => {
  return drops.dividedBy(1000000)
}

export const normalizeNode = (affectedNode: any): any => {
  const diffType = Object.keys(affectedNode)[0]
  const node = affectedNode[diffType]
  return Object.assign({}, {
    ...node,
    diffType,
    entryType: node.LedgerEntryType,
    ledgerIndex: node.LedgerIndex,
    newFields: node.NewFields || {},
    finalFields: node.FinalFields || {},
    previousFields: node.PreviousFields || {}
  })
}

export const normalizeNodes = (metadata: any): any => {
  if (!metadata.AffectedNodes) {
    return []
  }
  return metadata.AffectedNodes.map(normalizeNode)
}

// Supports regular 3 char currency code
// Supports HEX currency code
// Supports HEX currency code based on XLS15d
export const currencyCodeFormat = (string: string, maxLength = 12): string => {
  if(string.length === 3 && string.trim().toLowerCase() !== 'xrp') {
    // Normal currency code
    return string.trim()
  }
  if(string.match(/^[a-fA-F0-9]{40}$/) && !isNaN(parseInt(string, 16))) {
    // HEX currency code
    const hex = string.toString().replace(/(00)+$/g, '')
    if (hex.startsWith('02')) {
      const xlf15d = Buffer.from(hex, 'hex').slice(8).toString('utf-8').slice(0, maxLength).trim()
      if (xlf15d.match(/[a-zA-Z0-9]{3,}/) && xlf15d.toLowerCase() !== 'xrp') {
        return xlf15d
      }
    }
    const decodedHex = Buffer.from(hex, 'hex').toString('utf-8').slice(0, maxLength).trim()
    if (decodedHex.match(/[a-zA-Z0-9]{3,}/) && decodedHex.toLowerCase() !== 'xrp') {
      return decodedHex
    }
  }
  return '???'
}

// XLS-14d Sample implementation,
//   https://gist.github.com/WietseWind/5ffbf67cd982a7e9bd8f0ded52e60fe3
//   https://hash.xrp.fans/8F3CE0481EF31A1BE44AD7D744D286B0F440780CD0056951948F93A803D47F8B
export const xrplValueToNft = (value: string | number): number | boolean => {
  const data = String(Number(value)).split(/e/i)

  const finish = (returnValue: string): number | boolean => {
    const unsignedReturnValue = returnValue.replace(/^\-/, '')
    if (data.length > 1 && unsignedReturnValue.slice(0, 2) === '0.' && Number(data[1]) < -70) {
      // Positive below zero amount, could be NFT
      return (sign === '-' ? -1 : 1) * Number(
        (unsignedReturnValue.slice(2) + '0'.repeat(83 - unsignedReturnValue.length))
          .replace(/^0+/, '')
      )
    }
    return false
  }

  if (data.length === 1) {
    // Regular (non-exponent)
    return false
  }

  let z = ''
  const sign = value < 0 ? '-' : ''
  const str = data[0].replace('.', '')
  let mag = Number(data[1]) + 1

  if (mag < 0) {
    z = sign + '0.'
    while (mag++) {
      z += '0'
    }
    return finish(z + str.replace(/^\-/, ''))
  }
  mag -= str.length

  while (mag--) {
    z += '0'
  }
  return finish(str + z)
}

export const nftValuetoXrpl = (value: string | number, accountBalance?: string | number): string => {
  const unsignedValue = String(value).replace(/^-/, '')
  const sign = unsignedValue.length < String(value).length ? '-' : ''

  // accountBalance: xrpl string notation, optional, if intention to force NFT check
  if (typeof accountBalance !== 'undefined' && xrplValueToNft(accountBalance) === false) {
    throw new Error('Source balance is not NFT-like')
  }
  if (!unsignedValue.match(/^[0-9]+$/)) {
    throw new Error('Only non-float & non-scientific notation values accepted')
  }

  return sign + '0.' + '0'.repeat(81 - unsignedValue.length) + unsignedValue
}
