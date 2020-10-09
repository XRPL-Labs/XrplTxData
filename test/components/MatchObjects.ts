export const validTx = {
  result: {
    Account: expect.any(String),
    meta: expect.any(Object)
  },
  balanceChanges: expect.any(Object),
  resolvedBy: expect.any(String),
  host: expect.any(String)
}

export const validTxNotFound = {
  result: {
    status: expect.any(String),
    type: expect.any(String),
    error: expect.any(String),
    error_code: expect.any(Number)
  },
  balanceChanges: expect.any(Object),
  resolvedBy: expect.any(String),
  host: expect.any(String)
}
