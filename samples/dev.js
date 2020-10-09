const {TxData} = require('../dist/src/index')
// const {TxData} = require('xrpl-txdata')

const main = async () => {
  try {
    const txd = new TxData([
      'wss://xrpl.ws',
      'wss://s2.ripple.com'
    ], {
      EndpointTimeoutMs: 1500,
      OverallTimeoutMs: 9000
    })

    const tx = await txd.getOne('B34EFCDA6A9D6B19670E19ECD3CFD638177EED92B863756DD96CFD197B940515') // Real
    console.log(tx.host + ' replied', tx.result)

    const myBalanceChangesInXrp = tx.balanceChanges[tx.result.Account].filter(t => t.currency === 'XRP')
    console.log({
        SendingAccountXrpBalanceChange: Number(myBalanceChangesInXrp[0].value)
    })
  } catch (e) {
    console.log('Error', e)
  }
}

main()
