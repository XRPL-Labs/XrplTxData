import {w3cwebsocket as WebSocket} from 'websocket'
import {debug as Debug} from 'debug'
import {hostname} from 'os'
import {EventEmitter} from 'events'
import {parseBalanceChanges, FormattedBalanceChanges} from './ext-dependencies/balanceParser'

const log = Debug('txdata')
const logConnect = log.extend('connect')
const logConnErr = log.extend('connect:error')
const logResolve = log.extend('resolve')
const logInvalid = log.extend('invalid')

export {parseBalanceChanges} from './ext-dependencies/balanceParser'

import {currencyCodeFormat, xrplValueToNft, nftValuetoXrpl} from './ext-dependencies/utils'
export const utils = {currencyCodeFormat, xrplValueToNft, nftValuetoXrpl}

export type AnyJson = Record<string, unknown>

export interface TxResult extends AnyJson {
  hash: string
  Account?: string
  Destination?: string
  meta: AnyJson
}

type Tx = {
  // host: string
  id?: string
  status: string
  type: string
  result: TxResult
}

type TxNotFound = {
  id?: string
  status: string
  type: string
  error: string
  error_code: number
  request?: AnyJson
}

type ConnectAndQueryResponse = {
  url: string
  socket: WebSocket | boolean
  result: Tx | TxNotFound | boolean
  resolveReason?: string
}

type EmittedTxResult = {
  txHash: string
  result: Tx | TxNotFound
  host: string
}

type ResolvedLookup = {
  result: TxResult | TxNotFound
  balanceChanges: FormattedBalanceChanges
  resolvedBy: string
  host: string
}

type TxDataOptions = {
  EndpointTimeoutMs?: number
  OverallTimeoutMs?: number
  AllowNoFullHistory?: boolean
}

export class TxData {
  private Ended: boolean = false
  private WsConnections: WebSocket[] = []
  private ReadyConnections: Promise<WebSocket>[] = []
  private CommandId: number = 0
  private Endpoints: Array<string> = [
    'wss://xrplcluster.com',
    'wss://xrpl.link',
    'wss://s2.ripple.com'
  ]
  private EventBus: EventEmitter

  private ConnectionAndQueryTimeoutMs: number = 1250
  private LookupTimeoutMs: number = 10000
  private AllowNoFullHistory: boolean = false

  constructor (endpoints?: Array<string>, options?: TxDataOptions) {
    this.EventBus = new EventEmitter()

    log('Constructed')

    this.ParseEndpoints(endpoints)
    this.ParseOptions(options)

    return this
  }

  /**
   * Constructor helpers
   */

  private ParseEndpoints(endpoints?: Array<string>): void {
    if (typeof endpoints !== 'undefined' && Array.isArray(endpoints) && endpoints.length > 0) {
      const alternativeEndpoints = endpoints
        .map(r => {
          return r.trim().replace(/^http/, 'ws')
        })
        .filter(r => {
          return r.match(/^ws[s]{0,1}:\/\//)
        })
      if (alternativeEndpoints.length > 0) {
        this.Endpoints = alternativeEndpoints
      } else {
        throw this.GenerateError('ENDPOINTS_INVALID')
      }
    }

    log('Endpoints', this.Endpoints)
  }

  private ParseOptions(options?: TxDataOptions): void {
    if (typeof options === 'object' && options !== null) {
      if (typeof options.EndpointTimeoutMs === 'number' && options.EndpointTimeoutMs >= 1) {
        this.ConnectionAndQueryTimeoutMs = options.EndpointTimeoutMs
      }
      if (typeof options.OverallTimeoutMs === 'number' && options.OverallTimeoutMs >= 1) {
        this.LookupTimeoutMs = options.OverallTimeoutMs
      }
      if (typeof options.AllowNoFullHistory === 'boolean') {
        this.AllowNoFullHistory = options.AllowNoFullHistory
      }
    }

    const minTimeoutMs = this.ConnectionAndQueryTimeoutMs * (this.Endpoints.length + 1)
    if (this.LookupTimeoutMs < minTimeoutMs) {
      this.LookupTimeoutMs = minTimeoutMs
      logInvalid('Overall timeout updated to min. endpoint * perEndpointTO seconds:', this.LookupTimeoutMs / 1000)
    }
  }

  /**
   * PUBLIC
   */

  public end(): void {
    if (!this.Ended) {
      this.Ended = true
      log('Ending!')
      this.WsConnections.forEach(c => {
        c.close()
      })
      this.Endpoints = []
      this.ReadyConnections = []
      this.WsConnections = []
    }
  }

  public async getOne(TxHash: string, WaitForSeconds: number = 0): Promise<ResolvedLookup> {
    const tx = await this.get(TxHash, WaitForSeconds)
    this.end()
    return tx
  }

  public async get(TxHash: string, WaitForSeconds: number = 0): Promise<ResolvedLookup> {
    if (this.Ended) {
      throw this.GenerateError('OBJECT_IN_ENDED_STATE')
    }

    const meta = {
      attempts: 0,
      connections: 0,
      resolved: false
    }

    const getPromise: Promise<ResolvedLookup> = new Promise(async (resolve, reject) => {
      let Timer: ReturnType<typeof setTimeout>
      let WaitMode: boolean = false
      let WaitModeFinish: Function

      const setTimer = (SecondsAdded: number = 0): void => {
        clearTimeout(Timer)
        const timeoutMs = this.LookupTimeoutMs + SecondsAdded * 1000

        log('Set Timeout Timer at (sec)', timeoutMs / 1000)

        const TimedOut = () => {
          if (WaitMode) {
            WaitModeFinish()
          } else {
            reject(this.GenerateError('MAX_LOOKUP_TIME_REACHED'))
          }
        }

        Timer = setTimeout(() => {
          TimedOut()
        }, timeoutMs)
      }

      setTimer()

      const cleanup = () => {
        clearTimeout(Timer)
        meta.resolved = true
        this.EventBus.removeListener('result', onTx)
        this.EventBus.listeners('tx.' + TxHash).forEach(l => this.EventBus.removeListener('tx.' + TxHash, l as any))
      }

      const ResolveFormatted = (
        eventResult: Tx | TxNotFound,
        resolvedBy: string,
        host: string
      ): void => {
        const finish = (customEventResult?: Tx, customHost?: string) => {
          cleanup()

          const result = this.FormatResult(customEventResult ? customEventResult : eventResult)
          const balanceChanges = typeof (result as TxResult).meta !== 'undefined'
            ? parseBalanceChanges((result as TxResult).meta)
            : {}

          resolve({
            result: customEventResult?.result
              ? {
                ...(customEventResult.result as any)?.transaction,
                meta: (customEventResult.result as any)?.meta,
                validated: (customEventResult.result as any)?.validated,
                ledger_index: (customEventResult.result as any)?.ledger_index,
                inLedger: (customEventResult.result as any)?.ledger_index
              }
              : result,
            resolvedBy: customHost ? 'asynchash' : resolvedBy,
            host: customHost ? customHost : host,
            balanceChanges
          })
        }

        if ((eventResult as TxNotFound)?.error === 'txnNotFound' && WaitForSeconds > 0) {
          // Not found
          if (!WaitMode) {
            log('TX not found on ledger, could still arrive, wait for # sec.:', WaitForSeconds, TxHash)

            setTimer(WaitForSeconds)

            WaitMode = true
            WaitModeFinish = finish

            this.EventBus.once('tx.' + TxHash, event => {
              finish({
                status: event.response.status,
                type: event.response.type,
                result: event.response as TxResult
              }, event.url)
            })
          }
        } else {
          finish()
        }
      }

      const onTx = (r: EmittedTxResult) => {
        if (
          !meta.resolved && r.txHash === TxHash &&
          typeof r?.result === 'object' &&
          (((this.FormatResult(r.result) as any)?.meta || (this.FormatResult(r.result) as any)?.error))
        ) {
          this.EventBus.off('result', onTx)
          ResolveFormatted(r.result, 'emitter', r.host)
        }
      }

      this.EventBus.on('result', onTx)

      for await (const val of this.ConnectAndQuery(TxHash)) {
        if (meta.resolved) {
          break
        }

        meta.attempts++
        meta.connections++

        if (typeof val.socket !== 'boolean') {
          if (
            !meta.resolved &&
            val.socket.readyState === val.socket.OPEN &&
            typeof val?.result === 'object' &&
            (((this.FormatResult(val.result) as any)?.meta || (this.FormatResult(val.result) as any)?.error))
          ) {
            ResolveFormatted(val.result, 'generator', val.socket.url)
            break
          }
        } else {
          // URL is empty if endpoint is defunct (unreachable / not sane (non-FH))
          if (val.url !== '') {
            logResolve(`reason @ ${val.url} =`, String(val?.resolveReason).toUpperCase())
          } else {
            // Don't count defunct endpoints in attempt counter
            meta.attempts--
          }
        }
      }

      log(`Getting ${TxHash} done, attempts =`, meta.attempts)

      const allClosedOrClosing = this.WsConnections.filter(c => {
        return c.readyState === c.CLOSED || c.readyState === c.CLOSING
      }).length === this.Endpoints.length

      if (!meta.resolved && meta.connections === this.Endpoints.length && allClosedOrClosing) {
        // log({reject: true, meta, allClosedOrClosing})
        reject(this.GenerateError('ALL_CONNECTIONS_FAILED'))
      }
    })

    return getPromise
  }

  /**
   * PRIVATE
   */

  private FormatResult(result: Tx | TxNotFound): TxResult | TxNotFound {
    delete result!.id

    if (typeof (result as Tx).result !== 'undefined') {
      return (result as Tx).result
    }

    return result as TxNotFound
  }

  private GenerateError(code: string): Error {
    let msg

    switch (code) {
      case 'OBJECT_IN_ENDED_STATE':
        msg = 'TxData object ended (.getOne() / .end() called)'
        break
      case 'ENDPOINTS_INVALID':
        msg = 'All endpoints are invalid'
        break
      case 'ALL_CONNECTIONS_FAILED':
        msg = `All endpoints are offline (or don't provide full history)`
        break
      case 'MAX_LOOKUP_TIME_REACHED':
        msg = `Max. lookup time (for all endpoints) reached without receiving a valid response`
        break
      default:
        msg = 'Unknown exception'
    }

    const e = new Error(msg)
    e.name = code
    return e
  }

  private async Connect(index = 0): Promise<WebSocket> {
    if (typeof this.ReadyConnections[index] === 'undefined' && this.Endpoints[index] !== '') {
      logConnect(this.Endpoints[index])

      const headers = typeof process === 'object'
        ? {'User-Agent': 'XrplTxData/' + hostname()}
        : undefined

      const socket: WebSocket = typeof (global as any)?.MockedWebSocket !== 'undefined' && typeof jest !== 'undefined'
        ? new ((global as any)?.MockedWebSocket)('ws://txdata.local')
        : new WebSocket(
            this.Endpoints[index],
            undefined, // Protocols
            undefined, // Origin
            headers // Http Headers
          )

      this.WsConnections[index] = socket

      const socketMeta = {
        ready: false
      }

      this.ReadyConnections[index] = new Promise(resolve => {
        socket.onopen = () => {
          if (socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify({command: 'server_info'}))
            socket.send(JSON.stringify({command: 'subscribe', streams: ['transactions']}))
          }
        }

        // socket.onclose = () => {}

        socket.onerror = e => {
          if (!this.Ended) {
            logConnErr({
              url: socket.url,
              type: e?.name,
              message: e?.message,
              error: e?.stack
            })
            this.Endpoints[index] = ''
          }
          resolve(socket)
        }

        socket.onmessage = async m => {
          try {
            const response = JSON.parse(m.data.toString())
            if (socketMeta.ready) {
              if (
                typeof (response as any)?.transaction?.validated === 'undefined' ||
                (response as any)?.transaction?.validated
              ) {
                this.EventBus.emit('xrpljson', response)
              } else {
                log('Ignore xrpljson, validated present but false')
              }

              const txHash = (response as any)?.transaction?.hash
              if ((response as any)?.validated && txHash) {
                // log('Seen TX', txHash, 'emitted', 'tx.#')
                this.EventBus.emit('tx.' + txHash, {response, url: socket.url})
              }
            } else {
              if (typeof response?.result?.info?.complete_ledgers !== 'undefined') {
                socketMeta.ready = true
                const ledgerString = String(response?.result?.info?.complete_ledgers || '')
                const isFullHistory = ledgerString.split(',').length < 2 && ledgerString.split('-')[0] === '32570'
                if (!isFullHistory && !this.AllowNoFullHistory) {
                  logInvalid('Closed connection to ', socket.url, 'incomplete history:', ledgerString)
                  this.Endpoints[index] = ''
                  await socket.close()
                } else {
                  logConnect('Ready:', socket.url)
                }
                resolve(socket)
              }
            }
          } catch (e) {
            // Couldn't parse message from server as JSON
          }
        }
      })
    }

    return await this.ReadyConnections[index]
  }

  private async * ConnectAndQuery(txHash: string): AsyncGenerator<ConnectAndQueryResponse, void, unknown> {
    //           AsyncGenerator< next() result, return, next() param >
    let i = 0
    while (i < this.Endpoints.length) {
      i++
      yield await new Promise(async resolve => {
        let resolved = false
        let timeout: any

        const cancel = (resolveReason: string) => {
          if (!resolved) {
            clearTimeout(timeout)
            resolve({socket: false, result: false, resolveReason, url: this.Endpoints[i - 1]})
            resolved = true
          }
        }

        timeout = setTimeout(() => {
          cancel('timed out')
        }, this.ConnectionAndQueryTimeoutMs)

        const socket = await this.Connect(i - 1)

        if (socket.readyState !== socket.OPEN) {
          cancel('resolved non-open')
        }

        const result = await this.QueryConnection(socket, txHash)

        // Allow the generator to yield
        process.nextTick(() => {
          this.EventBus.emit('result', {txHash, result, host: socket.url})
        })

        if (!resolved) {
          clearTimeout(timeout)
          resolve({socket, result, resolveReason: 'results', url: this.Endpoints[i - 1]})
        }
      })
    }
    // return 'Done :)'
  }

  private async QueryConnection(connection: WebSocket, TxHash: string): Promise<Tx | TxNotFound> {
    this.CommandId++
    const id = String(this.CommandId)

    // log({Get: TxHash, Id: id, Url: connection.url})

    return new Promise(async resolve => {
      if (connection.readyState === connection.OPEN) {
        connection.send(JSON.stringify({
          id,
          command: 'tx',
          [TxHash.length > 16 ? 'transaction' : 'ctid']: TxHash
        }))

        const onTx = (r: Tx | TxNotFound) => {
          if (
            (r?.id === id || (r as any)?.transaction?.hash === TxHash)
            &&
            ((r as any)?.result?.validated || (r as any)?.validated)
          ) {
            process.nextTick(() => {
              this.EventBus.removeListener('xrpljson', onTx)
            })
            return resolve(r)
          }
        }

        this.EventBus.on('xrpljson', onTx)
      }
    })
  }
}
