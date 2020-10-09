const {TxData} = require('xrpl-txdata')

const someTxHash = 'B34EFCDA6A9D6B19670E19ECD3CFD638177EED92B863756DD96CFD197B940515'

const tx = (new TxData()).getOne(someTxHash).thenN(tx => {
  console.log(tx.result)

  const xrpBalanceChange = tx.balanceChanges[tx.result.Account].filter(t => t.currency === 'XRP')
  console.log(Number(xrpBalanceChange[0].value))  
})
