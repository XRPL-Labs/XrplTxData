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
      // 'ws://localhost',
      // 'wss://s1.ripple.com',
      // 'wss://xrpl.ws',
      // 'wss://s2.ripple.com',
      // 'wss://xrpl.link'
      'wss://testnet.xrpl-labs.com'
    ], {
      EndpointTimeoutMs: 1000,
      OverallTimeoutMs: 7500,
      AllowNoFullHistory: true
    })

    txd.getOne('85E19A60511544759C3F6EF814EDCDDE606640991CDDE5409354D21112F91EAA', 20)
      .then(tx => {
        log(`TX`, tx)
      })

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

    // txd.end()
  } catch (e) {
    log({caughtError: (e as any).message})
  }
}

main()
