import {TxData, TxResult} from '../src/'
import Debug from 'debug'
import {MockedServer} from './components/MockedServer'
import {validTx, validTxNotFound} from './components/MatchObjects'
import fixtures from './fixtures.json'

// const log = Debug('txdata:tests')

beforeAll(MockedServer)

describe('TxData Tests', () => {
  it('Should fetch & close one (.getOne) existing TX', async () => {
    const TxD = new TxData()
    const tx = await TxD.getOne('2434F57A60F5D847F1C348663DC510620A15F1D86009BDFA6587159EED2573DD')

    expect(tx).toMatchObject(validTx)
  })

  it('Should not allow fetching a second tx when in ended state', async () => {
    const TxD = new TxData()
    // Get the first one
    const tx = await TxD.getOne('2434F57A60F5D847F1C348663DC510620A15F1D86009BDFA6587159EED2573DD')

    // Get another one
    expect(TxD.getOne('2434F57A60F5D847F1C348663DC510620A15F1D86009BDFA6587159EED2573DE'))
      .rejects
      .toThrowError('TxData object ended (.getOne() / .end() called)')
  })

  it('Should fetch a non existing TX', async () => {
    const TxD = new TxData()
    const tx = await TxD.getOne('2434F57A60F5D847F1C348663DC510620A15F1D86009BDFA6587159EED2573DE')

    expect(tx).toMatchObject(validTxNotFound)
  })

  it('Should fetch multiple existing TXs, end & be ended', async () => {
    const TxD = new TxData()

    const tx1 = await TxD.get('2434F57A60F5D847F1C348663DC510620A15F1D86009BDFA6587159EED2573DE')
    expect(tx1).toMatchObject(validTxNotFound)

    const tx2 = await TxD.get('2434F57A60F5D847F1C348663DC510620A15F1D86009BDFA6587159EED2573DD')
    expect(tx2).toMatchObject(validTx)

    const tx3 = await TxD.get('A17E4DEAD62BF705D9B73B4EAD2832F1C55C6C5A0067327A45E497FD8D31C0E3')
    expect(tx3).toMatchObject(validTx)

    expect(TxD.end()).toBe(undefined)

    expect(TxD.get('2434F57A60F5D847F1C348663DC510620A15F1D86009BDFA6587159EED2573DE'))
      .rejects
      .toThrowError('TxData object ended (.getOne() / .end() called)')
  })

  // Timeout checking
  it('Should reject on timeout', async () => {
    const c = {
      Servers: ['wss://xrpl.ws', 'wss://xrpl.link', 'wss://s2.ripple.com'],
      Options: {EndpointTimeoutMs: 10, OverallTimeoutMs: 50}
    }

    const TxD = new TxData(c.Servers, c.Options)

    expect(TxD.get('2434F57A60F5D847F1C348663DC510620A15F1D86009BDFA6587159EED2573DD'))
      .rejects
      .toThrowError('Max. lookup time (for all endpoints) reached without receiving a valid response')
  })

  it('Parse balances for transactions (fetched & not found)', async () => {
    const TxD = new TxData()

    const hash1 = '2434F57A60F5D847F1C348663DC510620A15F1D86009BDFA6587159EED2573DD'
    const tx1 = await TxD.get(hash1)
    expect(tx1).toMatchObject(validTx)
    const match1 = fixtures.balanceChanges[hash1]

    const hash2 = 'A17E4DEAD62BF705D9B73B4EAD2832F1C55C6C5A0067327A45E497FD8D31C0E3'
    const tx2 = await TxD.get(hash2)
    expect(tx2).toMatchObject(validTx)
    const match2 = fixtures.balanceChanges[hash2]

    // log(tx1.balanceChanges)
    // log(tx2.balanceChanges)

    expect(tx1.balanceChanges).toMatchObject(match1)
    expect(tx2.balanceChanges).toMatchObject(match2)

    const tx3 = await TxD.get('2434F57A60F5D847F1C348663DC510620A15F1D86009BDFA6587159EED2573DE')
    expect(tx3.balanceChanges).toEqual({})
  })

  it('Throw on invalid server list', async () => {
    expect(async () => {
      const TxD = new TxData(['localhost', 'some://invalid/server', 'anotherInvalidServer'])
      return await TxD.get('2434F57A60F5D847F1C348663DC510620A15F1D86009BDFA6587159EED2573DD')
    }).rejects.toThrowError('All endpoints are invalid')
  })

  /**
   * Tests done
   */
})
