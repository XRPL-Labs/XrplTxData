import Debug from 'debug'
import {TxData, TxResult} from '../src/'

const log = Debug('txdata:sample')

// Possible erorrs:
//   OBJECT_IN_ENDED_STATE
//   ENDPOINTS_INVALID
//   ALL_CONNECTIONS_FAILED
//   MAX_LOOKUP_TIME_REACHED

log('Starting...')

const main = async () => {
  try {
    const txd = new TxData([
      'ws://localhost',
      'wss://s1.ripple.com',
      'wss://xrpl.ws',
      'wss://s2.ripple.com',
      'wss://xrpl.link'
    ], {
      EndpointTimeoutMs: 1000,
      OverallTimeoutMs: 7500
    })

    const tx = await txd.getOne('B34EFCDA6A9D6B19670E19ECD3CFD638177EED92B863756DD96CFD197B940515') // Real
    log(`TX`, await tx)

    // const txE = await txd.get('B34EFCDA6A9D6B19670E19ECD3CFD638177EED92B863756DD96CFD197B940516')
    // log({txE})

    // const txV = await txd.get('2434F57A60F5D847F1C348663DC510620A15F1D86009BDFA6587159EED2573DD') // Real
    // log(txV)
    // const account = (txV.result as TxResult)?.Account
    // if (account) {
    //   log(
    //     txV.balanceChanges[account]
    //       .filter(r => r.counterparty === '' && r.currency === 'XRP')
    //       .map(r => Number(r.value))
    //   )
    // }
    // log(txV.balanceChanges)

    txd.end()

    // setTimeout(async () => {
    //   const tx = await txd.get('B34EFCDA6A9D6B19670E19ECD3CFD638177EED92B863756DD96CFD197B940517')
    //   log(`\n\nTX4`, await tx)
    // }, 900)
  } catch (e) {
    log({caughtError: e.message})
  }
}

main()
