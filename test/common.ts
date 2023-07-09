import {TxData, TxResult, utils} from '../src/'
import Debug from 'debug'
import {MockedServer} from './components/MockedServer'
import {validTx, validTxNotFound} from './components/MatchObjects'
import fixtures from './fixtures.json'

// const log = Debug('txdata:tests')

beforeAll(MockedServer)

describe('Utils test', () => {
  const floatString = '0.000000000000000000000000000000000000000000000000000000000000000000000000000000001'

  it('Should encode NFT amount', () => {
    expect(utils.nftValuetoXrpl(1)).toEqual(floatString)
  })

  it('Should decode NFT amount', () => {
    expect(utils.xrplValueToNft('1e-81')).toEqual(1)
  })

  it('Should parse normal currency code', () => {
    expect(utils.currencyCodeFormat('USD')).toEqual('USD')
  })

  it('Should parse HEX currency code', () => {
    expect(utils.currencyCodeFormat('534F4C4F00000000000000000000000000000000'))
      .toEqual('SOLO')
  })

  it('Should parse XLS 15 d currency code', () => {
    expect(utils.currencyCodeFormat('021D001703B37004416E205852504C204E46543F'))
      .toEqual('An XRPL NFT?')
  })

  it('Should parse "XRP" hex as invalid', () => {
    expect(utils.currencyCodeFormat('7872700000000000000000000000000000000000'))
      .toEqual('???')
  })

  it('Should parse "XRP" as string as invalid', () => {
    expect(utils.currencyCodeFormat('XRP'))
      .toEqual('???')
  })
})

describe('TxData Tests', () => {
  it('Should fetch & close one (.getOne) existing TX', async () => {
    const TxD = new TxData()
    const tx = await TxD.getOne('2434F57A60F5D847F1C348663DC510620A15F1D86009BDFA6587159EED2573DD')

    expect(tx).toMatchObject(validTx)
  })

  it('Should format xls-14d and xls-15d', async () => {
    const TxD = new TxData()
    const tx = await TxD.getOne('8F3CE0481EF31A1BE44AD7D744D286B0F440780CD0056951948F93A803D47F8B')
    const formattedBalanceChange = tx.balanceChanges['rwietsevLFg8XSmG3bEZzFein1g8RBqWDZ']
      .filter(c => c.currency !== 'XRP')[0]

    expect(formattedBalanceChange.currency).toStrictEqual('021D001703B37004416E205852504C204E46543F')
    expect(formattedBalanceChange.value).toStrictEqual('-1e-81')

    expect(formattedBalanceChange.formatted.currency).toStrictEqual('An XRPL NFT?')
    expect(formattedBalanceChange.formatted.value).toStrictEqual('-1')
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

  it('Should fetch multiple existing TXs, end & be ended', async () => {
    const TxD = new TxData([], { EndpointTimeoutMs: 200, OverallTimeoutMs: 500 })

    const tx2 = await TxD.get('2434F57A60F5D847F1C348663DC510620A15F1D86009BDFA6587159EED2573DD')
    expect(tx2).toMatchObject(validTx)

    const tx3 = await TxD.get('A17E4DEAD62BF705D9B73B4EAD2832F1C55C6C5A0067327A45E497FD8D31C0E3')
    expect(tx3).toMatchObject(validTx)

    expect(TxD.end()).toBe(undefined)
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

  it('Parse balances for transactions (fetched)', async () => {
    const TxD = new TxData()

    const hash1 = '2434F57A60F5D847F1C348663DC510620A15F1D86009BDFA6587159EED2573DD'
    const tx1 = await TxD.get(hash1)
    expect(tx1).toMatchObject(validTx)
    const match1 = fixtures.balanceChanges[hash1]

    const hash2 = 'A17E4DEAD62BF705D9B73B4EAD2832F1C55C6C5A0067327A45E497FD8D31C0E3'
    const tx2 = await TxD.get(hash2)
    expect(tx2).toMatchObject(validTx)
    const match2 = fixtures.balanceChanges[hash2]
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
