# XRPL Transaction Data fetcher [![npm version](https://badge.fury.io/js/xrpl-txdata.svg)](https://www.npmjs.com/xrpl-txdata) [![GitHub Actions NodeJS status](https://github.com/XRPL-Labs/XrplTxData/workflows/NodeJS/badge.svg?branch=master)](https://github.com/XRPL-Labs/XrplTxData/actions)

### `xrpl-txdata`: Fetch XRPL transaction data (auto failover)

This lib. allows you to fetch XRP ledger transaction outcome from a number of (full history) XRP ledger nodes. This lib. will automatically setup connections when fetching from a selected node takes too long. The first (sane) reply will be returned.

This lib. will get you the **fastest response possible** while setting up a **minimal amount of websocket connetions** to full history XRPL nodes.

This package can be used in Node/Typescript projects (`xrpl-txdata`) or used (browserified) in the browser.

Not only the requested transaction will be returned (or the `not found` response if the transaction can't be found): the **parsed balances** (transaction outcome) will be calculated (form the transaction metadata) and returned as well.

### Syntax

... Still writing ;)

### Response

... Still writing ;)

### Use

... Still writing ;)

### Browserify

... Still writing ;)
