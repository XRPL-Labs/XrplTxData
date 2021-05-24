import Debug from 'debug'
import fixtures from '../fixtures.json'
import {Server, WebSocket as MockedWebSocket} from 'mock-socket'

const log = Debug('txdata:tests:ws-server')

let mockServer: Server

export const MockedServer = () => {
  Object.assign(global, {MockedWebSocket})

  mockServer = new Server('ws://txdata.local')

  mockServer.on('connection', socket => {
    // log('Got new MockWS connection to', socket.url)

    const messageHandler = (message: any) => {
      try {
        const m = JSON.parse(message.toString())
        // log('Got new MockWS message', m)
        if (typeof m.command === 'string') {
          const json = (j: any) => {
            if (typeof j === 'undefined') {
              throw new Error('Cannot find this mock tx')
            }
            return JSON.stringify(Object.assign(j, {id: m?.id}))
          }
          if (m.command === 'server_info') {
            setTimeout(() => {
              if (socket.readyState === socket.OPEN) {
                socket.send(json(fixtures.server_info_response))
                // log('Sent server_info')
              }
            }, (Math.random() + .1) * 100)
            // log('Sending server_info')
          }
          if (m.command === 'tx') {
            setTimeout(() => {
              if (socket.readyState === socket.OPEN) {
                socket.send(json((fixtures.tx_response as any)[m.transaction]))
                // log('Sent TX response:', m.transaction)
              }
            }, (Math.random() + .1) * 250)
            // log('Sending TX response:', m.transaction)
          }
        }
      } catch (e) {
        log('WS Mock Server: error decoding incoming message (JSON)', e)
      }
      // setTimeout(() => {
      //   socket.send(JSON.stringify(jestFixtures.subscriptionUpdates.expire))
      // }, 150)
    }

    socket.on('message', messageHandler)

    socket.on('close', () => {
      log('Socket closed...!')
    })
  })
}