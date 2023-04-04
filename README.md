# XRPL Transaction Data fetcher [![npm version](https://badge.fury.io/js/xrpl-txdata.svg)](https://www.npmjs.com/xrpl-txdata) [![GitHub Actions NodeJS status](https://github.com/XRPL-Labs/XrplTxData/workflows/NodeJS/badge.svg?branch=main)](https://github.com/XRPL-Labs/XrplTxData/actions) [![CDNJS Browserified](https://img.shields.io/badge/cdnjs-browserified-blue)](https://cdn.jsdelivr.net/gh/XRPL-Labs/XrplTxData@main/dist/browser.js) [![CDNJS Browserified Minified](https://img.shields.io/badge/cdnjs-minified-orange)](https://cdn.jsdelivr.net/gh/XRPL-Labs/XrplTxData@main/dist/browser.min.js)

### `xrpl-txdata`: Fetch XRPL transaction data (auto failover)

# ⚠️ WARNING! PLEASE UPDATE TO THE LATEST VERSION (1.2.3) - previous versions have a bug resulting in sometimes returning UNVALIDATED TRANSACTIONS (without metadata, and may not be included in the closed ledger).

---

This lib. allows you to fetch XRP ledger transaction outcome from a number of (full history) XRP ledger nodes. This lib. will automatically setup connections when fetching from a selected node takes too long. The first (sane) reply will be returned.

This lib. will get you the **fastest response possible** while setting up the **lowest amount of WebSocket connections** to full history XRPL nodes possible.

This package can be used in Node/Typescript projects (`xrpl-txdata`) or used (browserified) in the browser.

Not only the requested transaction will be returned (or the `not found` response if the transaction can't be found): the **parsed balances** (transaction outcome) will be calculated (form the transaction metadata) and returned as well.

A simple ES6 JS example can be found in [`samples/dev.js`](https://github.com/XRPL-Labs/XrplTxData/blob/main/samples/dev.js).

### Syntax

Basic usage: construct (using defaults), fetch one transaction and close WebSocket connection(s) after getting a result.

```javascript
const txd = new TxData()

const main = async () => {
  // getOne(): fetch one tx and close connection(s) after a reply
  const tx = await txd.getOne('B34EFCDA6A9D6B19670E19ECD3CFD638177EED92B863756DD96CFD197B940515')
  console.log(tx)
}

main()
```

Fetching multiple transactions and close the WebSocket connection(s) programmatically:

```javascript
const txd = new TxData()

const main = async () => {
  // get(): fetch a tx, keep connetion(s) alive
  const tx1 = await txd.get('B34EFCDA6A9D6B19670E19ECD3CFD638177EED92B863756DD96CFD197B940515')
  console.log(tx1)

  const tx2 = await txd.get('A17E4DEAD62BF705D9B73B4EAD2832F1C55C6C5A0067327A45E497FD8D31C0E3')
  console.log(tx2)

  // Done, not interested in more tx data, close connection(s)
  txd.end()
}

main()
```

### Fetching a transaction that may not have been applied to a ledger

When you are using this lib. to fetch a transaction, you may fetch a transaction before a transaction has been included in a validated ledger. This would result in a "Not Found" error, while if queried a couple of seconds later, the transaction would have been found.

If you are dealing with live / realtime transactions, you may want to instruct this lib. to wait a couple of more seconds while monitoring the live XRP Ledger transaction stream for the transaction(s) you're interested in.

You can do this by providing a second argument (Number, time in seconds) to the `.get()` or `.getOne()` methods. When a second argument (Number, time in seconds) is provided & the initial call will yield a "Not Found" error, this lib. will watch the live transaction stream for the provided amount of seconds and resolve when the transaction hits a validated ledger. If the transaction is not included in a ledger within the provided amount of seconds, the `.get()` or `.getOne()` method will resolve with the initial "Not Found" response.

```javascript
txd.get('85E19A60511544759C3F6EF814EDCDDE606640991CDDE5409354D21112F91EAA', 20)
  .then(tx => {
    log(`Got it anyway`, tx)
  })
```

More info: https://xumm.readme.io/docs/secure-payment-verification#example-flow--code-using-the-xrpl-txdata-package-jsts

#### Advanced options

By default, these full history nodes will be used (in order):

1. `wss://xrplcluster.com` ([more info](https://xrplcluster.com))
2. `wss://xrpl.link` (fallback endpoint for `wss://xrplcluster.com`)
3. `wss://s2.ripple.com`

The default timeout configuration will:

- Try to connect, query & get a response (per tx) within 1250ms (1.25 seconds) before trying the next node
- Try to connect, query & get a response (per tx) within 10 seconds

The first node to anwer the request will result in a resolved query.

To overrule the nodes (full history required), provide an array with websocket endpoints to the constructor in the order you'd like them to be used:

```javascript
const txd = new TxData([
  'wss://my-fh-xprl-node.local',
  'wss://s2.ripple.com',
  'wss://xrplcluster.com'
])
```

To overrule the default 1250 / 10000 ms timeouts, provide an object to the constructor (second param.):

```javascript
// Empty array (endpoints) will result in using the default server list
const txd = new TxData([], {
  // Try the next server after 0.75 sec.
  EndpointTimeoutMs: 750,
  // Throw an error if none of the servers connected  & replied in 5 seconds
  OverallTimeoutMs: 5000,
  // Throw an error none of the provided nodes provides full history. If
  // you want to allow non full history nodes, set to `true`.
  AllowNoFullHistory: false
})
```

### Use in the browser

You can clone this repository and run:

- `npm run install` to install dependencies
- `npm run build` to build the source code
- `npm run browserify` to browserify this lib.

Now the `dist/browser.js` file will exist, for you to use in a browser.

Alternatively you can get a [prebuilt](https://cdn.jsdelivr.net/gh/XRPL-Labs/XrplTxData@main/dist/browser.js) / [prebuilt & minified](https://cdn.jsdelivr.net/gh/XRPL-Labs/XrplTxData@main/dist/browser.min.js) version from Github.

### Response (format)

The response of a `.get(someTxHash)` / `.getOne(someTxHash)` call contains four properties:

- `host` (string): the endpoint (connetion url) of the first node replying to the request 
- `resolvedBy` (string): `"generator"` if the host replied within the `EndpointTimeoutMs` timeout, `"emitter"` if the first reply came in after the `EndpointTimeoutMs` timeout, but before the next host replied, or `"asynchash"` if resolved by waiting & monitoring the live ledger transaction stream
- **`result`** (object): containing the error or transaction response from the XRPL node
- **`balanceChanges`** (object): containing the parsed balance changes for all accounts affected by this transaction

#### Formatted output

The `balanceChanges` object contains (per element) a `formatted` property. This contains the amount and currency
in formatted form: value decoded as NFT value (xls-14d) (when this applies) and the currency code decoded from HEX / xls-15d format.

#### Sample: response for a non existing transaction:

```json
{
  "result": {
    "error": "txnNotFound",
    "error_code": 29,
    "error_message": "Transaction not found.",
    "request": {...},
    "status": "error",
    "type": "response"
  },
  "resolvedBy": "generator", // or `"asynchash"` if resolved by waiting & monitoring the live ledger transaction stream
  "host": "wss://s2.ripple.com/",
  "balanceChanges": { ... }
}
```

#### Sample: response for an existing transaction (simple payment):
```json
{
  "result": {
    "Account": "r4bA4uZgXadPMzURqGLCvCmD48FmXJWHCG",
    "Amount": "1000000",
    "Destination": "rPdvC6ccq8hCdPKSPJkPmyZ4Mi1oG2FFkT",
    "Fee": "12",
    "TransactionType": "Payment",
    "date": 655453821,
    "meta": {...},
    "validated": true,
    ...
  },
  "resolvedBy": "emitter",
  "host": "wss://xrplcluster.com/",
  "balanceChanges": {
    "r4bA4uZgXadPMzURqGLCvCmD48FmXJWHCG": [
      {
        "counterparty": "",
        "currency": "XRP",
        "value": "-1.000012",
        "formatted": { "value": "-1.000012", "currency": "XRP" }
      }
    ],
    "rPdvC6ccq8hCdPKSPJkPmyZ4Mi1oG2FFkT": [
      {
        "counterparty": "",
        "currency": "XRP",
        "value": "1",
        "formatted": { "value": "1", "currency": "XRP" }
      }
    ]
  }
}
```

#### Sample: response for an existing transaction (Decentralized Exchange trade):

```json
{
  "result": {
    "Account": "rPdvC6ccq8hCdPKSPJkPmyZ4Mi1oG2FFkT",
    "Fee": "15",
    "Flags": 2148007936,
    "TakerGets": "15000000000",
    "TakerPays": {
      "currency": "EUR",
      "issuer": "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq",
      "value": "3999"
    },
    "TransactionType": "OfferCreate",
    "ledger_index": 46223027,
    "meta": {...},
    "validated": true,
    ...
  },
  "resolvedBy": "generator", // or `"asynchash"` if resolved by waiting & monitoring the live ledger transaction stream
  "host": "wss://s2.ripple.com/",
  "balanceChanges":
    "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq": [
      {
        "counterparty": "rPdvC6ccq8hCdPKSPJkPmyZ4Mi1oG2FFkT",
        "currency": "EUR",
        "value": "-1571.649031281391",
        "formatted": { "value": "-1571.649031281391", "currency": "XRP" }
      },
      ...
    ],
    "rPdvC6ccq8hCdPKSPJkPmyZ4Mi1oG2FFkT": [
      {
        "counterparty": "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq",
        "currency": "EUR",
        "value": "1571.649031281391",
        "formatted": { "value": "1571.649031281391", "currency": "XRP" }
      },
      {
        "counterparty": "",
        "currency": "XRP",
        "value": "-5749.538284",
        "formatted": { "value": "-5749.538284", "currency": "XRP" }
      }
    ],
    ...
  }
}
```
