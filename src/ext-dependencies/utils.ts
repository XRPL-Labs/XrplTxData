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
