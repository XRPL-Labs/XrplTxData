const {parseBalanceChanges} = require('../dist/src/index')

console.log(parseBalanceChanges({
  "AffectedNodes": [
    {
      "ModifiedNode": {
        "FinalFields": {
          "Account": "rPJZ6ivZZ21RtyjudEVop67LQCrCWieTse",
          "Balance": "59389105",
          "EmailHash": "FBB5A8AE0D2C3FBC8CA971FA7534E31D",
          "Flags": 0,
          "OwnerCount": 1,
          "Sequence": 124
        },
        "LedgerEntryType": "AccountRoot",
        "LedgerIndex": "14D8FF7E41D6FC8EE484F355085AC88135CA78320AF94A09B1FBEF85BBD41F94",
        "PreviousFields": {
          "Balance": "60389117",
          "Sequence": 123
        },
        "PreviousTxnID": "901AB6028204AE3EDB4D919EFC0BF36A25F73975674DCCA3FC54AEA85D9F56A0",
        "PreviousTxnLgrSeq": 59588192
      }
    },
    {
      "ModifiedNode": {
        "FinalFields": {
          "Account": "rwietsevLFg8XSmG3bEZzFein1g8RBqWDZ",
          "Balance": "2018376231",
          "Domain": "78756D6D2E617070",
          "EmailHash": "833237B8665D2F4E00135E8DE646589F",
          "Flags": 8388608,
          "OwnerCount": 7,
          "Sequence": 228
        },
        "LedgerEntryType": "AccountRoot",
        "LedgerIndex": "8C4F456312F02D5199BCB1FB8F657BF19675288E3F4EBF2AFCFB5A1253788404",
        "PreviousFields": {
          "Balance": "2017376231"
        },
        "PreviousTxnID": "901AB6028204AE3EDB4D919EFC0BF36A25F73975674DCCA3FC54AEA85D9F56A0",
        "PreviousTxnLgrSeq": 59588192
      }
    }
  ],
  "TransactionIndex": 8,
  "TransactionResult": "tesSUCCESS",
  "delivered_amount": "1000000"
}))