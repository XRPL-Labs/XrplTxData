const {TxData, utils} = require('../dist/src')

// const someTxHash = 'B34EFCDA6A9D6B19670E19ECD3CFD638177EED92B863756DD96CFD197B940515'
const someTxHash = '8F3CE0481EF31A1BE44AD7D744D286B0F440780CD0056951948F93A803D47F8B'

const tx = (new TxData()).getOne(someTxHash).then(tx => {
  // console.log(tx.result)

  const xrpBalanceChange = tx.balanceChanges[tx.result.Account].filter(t => t.currency === 'XRP')
  // console.log(Number(xrpBalanceChange[0].value))

  console.dir(tx.balanceChanges, {depth: 40})
})
