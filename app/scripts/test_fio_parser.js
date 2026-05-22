const mockPayload = {
  "accountStatement": {
    "info": {
      "accountId": "2000000001",
      "bankId": "2010",
      "currency": "EUR",
      "iban": "SK1220100000002000000001",
      "bic": "FIOBSKBA",
      "openingBalance": 10000.0,
      "closingBalance": 12500.0,
      "dateStart": "2026-05-01+02:00",
      "dateEnd": "2026-05-22+02:00",
      "idFrom": 0,
      "idTo": 0
    },
    "transactionList": {
      "transaction": [
        {
          "column0": { "value": "2026-05-15+02:00", "name": "Datum", "id": 0 },
          "column1": { "value": 500.0, "name": "Objem", "id": 1 },
          "column2": { "value": "123456789", "name": "Protiúčet", "id": 2 },
          "column3": { "value": "0800", "name": "Kód banky", "id": 3 },
          "column4": { "value": "0308", "name": "KS", "id": 4 },
          "column5": { "value": "00001177", "name": "VS", "id": 5 },
          "column6": { "value": "2026001", "name": "SS", "id": 6 },
          "column7": { "value": "Ján Kováč", "name": "Užívateľská identifikácia", "id": 7 },
          "column8": { "value": "Bezhotovostný príjem", "name": "Typ", "id": 8 },
          "column10": { "value": "Ján Kováč - Darca", "name": "Názov protiúčtu", "id": 10 },
          "column14": { "value": "EUR", "name": "Mena", "id": 14 },
          "column16": { "value": "Príspevok na misie", "name": "Zpráva pre príjemcu", "id": 16 },
          "column17": { "value": "SK980800000000123456789", "name": "IBAN protiúčtu", "id": 17 },
          "column18": { "value": "GIBASKBA", "name": "BIC", "id": 18 },
          "column22": { "value": 25000000001, "name": "ID pohybu", "id": 22 }
        },
        {
          "column0": { "value": "2026-05-18+02:00", "name": "Datum", "id": 0 },
          "column1": { "value": -150.0, "name": "Objem", "id": 1 },
          "column2": { "value": "987654321", "name": "Protiúčet", "id": 2 },
          "column3": { "value": "0200", "name": "Kód banky", "id": 3 },
          "column4": { "value": "0008", "name": "KS", "id": 4 },
          "column5": null,
          "column6": null,
          "column7": null,
          "column8": "Platba kartou",
          "column10": "Dodávateľ spol. s r.o.",
          "column14": "EUR",
          "column16": "Faktúra 202655",
          "column17": "SK980200000000987654321",
          "column18": "SUBASKBA",
          "column22": 25000000002
        }
      ]
    }
  }
};

const parseStringCol = (col) => {
  if (!col) return null;
  if (typeof col === 'object') {
    return col.value !== undefined && col.value !== null ? String(col.value) : null;
  }
  return String(col);
};

const parseNumberCol = (col) => {
  if (!col) return null;
  if (typeof col === 'object') {
    return col.value !== undefined && col.value !== null ? Number(col.value) : null;
  }
  return Number(col);
};

function testParser() {
  console.log("=== STARTING DRY RUN OF FIO PARSER ===");
  const accountStatement = mockPayload.accountStatement;
  const info = accountStatement.info;
  const accountIban = info.iban;
  const openingBalance = info.openingBalance;
  const closingBalance = info.closingBalance;
  
  const rawTransactions = accountStatement.transactionList.transaction;
  console.log(`Successfully read account IBAN: ${accountIban}`);
  console.log(`Opening Balance: ${openingBalance}, Closing Balance: ${closingBalance}`);
  console.log(`Transactions found: ${rawTransactions.length}\n`);

  const txToInsert = [];
  let matchedCount = 0;

  // Mock donor map
  const donorVsMap = new Map();
  donorVsMap.set("1177", "uuid-donor-kovac");

  for (const tx of rawTransactions) {
    const entryRef = parseStringCol(tx.column22);
    if (!entryRef) {
      console.warn("Skipping transaction with missing entry_ref");
      continue;
    }

    const amountVal = parseNumberCol(tx.column1) || 0;
    const amount = Math.abs(amountVal);
    const currency = parseStringCol(tx.column14) || 'EUR';
    const direction = amountVal > 0 ? 'credit' : 'debit';
    
    const bookingDateRaw = parseStringCol(tx.column0) || new Date().toISOString();
    const bookingDate = bookingDateRaw.substring(0, 10);
    
    const counterIban = parseStringCol(tx.column17);
    const counterBic = parseStringCol(tx.column18);
    const counterName = parseStringCol(tx.column10) || parseStringCol(tx.column7) || null;

    const constantSymbol = parseStringCol(tx.column4);
    const remittanceInfo = parseStringCol(tx.column16);

    let vs = null;
    let ss = null;

    const vsRaw = parseStringCol(tx.column5);
    if (vsRaw) {
      vs = vsRaw.replace(/^0+/, '');
      if (vs === '') vs = '0';
    }

    const ssRaw = parseStringCol(tx.column6);
    if (ssRaw) {
      ss = ssRaw;
    }

    let matchedDonorId = null;
    let isMatched = false;
    let category = direction === 'credit' ? 'unmatched' : 'expense_other';

    if (direction === 'credit' && vs) {
      if (donorVsMap.has(vs)) {
        matchedDonorId = donorVsMap.get(vs);
        isMatched = true;
        category = 'donation';
      }
    }

    const mapped = {
      entry_ref: entryRef,
      message_id: 'FIO_API_SYNC',
      amount: amount,
      currency: currency,
      direction: direction,
      booking_date: bookingDate,
      counterparty_iban: counterIban,
      counterparty_bic: counterBic,
      counterparty_name: counterName,
      variable_symbol: vs,
      specific_symbol: ss,
      constant_symbol: constantSymbol,
      remittance_info: remittanceInfo,
      donor_id: matchedDonorId,
      matched: isMatched,
      category: category,
      import_batch_id: 'mock-batch-uuid'
    };

    txToInsert.push(mapped);
    if (isMatched) matchedCount++;
  }

  console.log("=== MAPPED TRANSACTIONS ===");
  console.log(JSON.stringify(txToInsert, null, 2));
  console.log(`\nMatched counts: ${matchedCount}/${txToInsert.length}`);
  
  // Basic validation assertions
  const tx1 = txToInsert[0];
  if (tx1.amount !== 500.0) throw new Error("Assertion failed: tx1 amount is wrong");
  if (tx1.direction !== 'credit') throw new Error("Assertion failed: tx1 direction is wrong");
  if (tx1.variable_symbol !== '1177') throw new Error("Assertion failed: tx1 VS zero-stripping is wrong");
  if (tx1.matched !== true || tx1.donor_id !== 'uuid-donor-kovac') throw new Error("Assertion failed: tx1 matching logic is wrong");
  if (tx1.booking_date !== '2026-05-15') throw new Error("Assertion failed: tx1 date parsing is wrong");
  if (tx1.counterparty_name !== 'Ján Kováč - Darca') throw new Error("Assertion failed: tx1 counterparty name mapping is wrong");

  const tx2 = txToInsert[1];
  if (tx2.amount !== 150.0) throw new Error("Assertion failed: tx2 amount absolute parsing is wrong");
  if (tx2.direction !== 'debit') throw new Error("Assertion failed: tx2 direction is wrong");
  if (tx2.variable_symbol !== null) throw new Error("Assertion failed: tx2 variable_symbol should be null");
  if (tx2.matched !== false) throw new Error("Assertion failed: tx2 matched should be false");
  if (tx2.booking_date !== '2026-05-18') throw new Error("Assertion failed: tx2 date parsing is wrong");
  if (tx2.entry_ref !== '25000000002') throw new Error("Assertion failed: tx2 entry_ref is wrong");

  console.log("\n✅ ALL MAPPING & PARSING PARSER TESTS PASSED!");
}

testParser();
