const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('C:\\Users\\Mubashir\\.local\\share\\mimocode\\mimocode.db', {readOnly: true});

// Verify getAccountLabel pattern from ses_09a5de430ffe
console.log("=== getAccountLabel in JV View text outputs ===");
const rows = db.prepare(`
  SELECT substr(json_extract(p.data, '$.text'), 1, 800) as text
  FROM message m
  JOIN part p ON p.message_id = m.id
  WHERE m.session_id = 'ses_09a5de430ffeTyjAlovClQq1Ns'
    AND json_extract(m.data, '$.role') = 'assistant'
    AND json_extract(p.data, '$.type') = 'text'
    AND (json_extract(p.data, '$.text') LIKE '%getAccountLabel%' OR json_extract(p.data, '$.text') LIKE '%row.Client%')
  ORDER BY m.time_created
  LIMIT 5
`).all();
rows.forEach(r => console.log(r.text));
console.log("---");

// Check CashPaymentVoucherView for transporter pattern in recent session
console.log("=== CashPayment/BankPayment transporter fix trajectory ===");
const rows2 = db.prepare(`
  SELECT substr(json_extract(p.data, '$.text'), 1, 500) as text
  FROM message m
  JOIN part p ON p.message_id = m.id
  WHERE m.session_id = 'ses_080d1c79bffeNgiLX6pIseYTP9'
    AND json_extract(m.data, '$.role') = 'assistant'
    AND json_extract(p.data, '$.type') = 'text'
  ORDER BY m.time_created
  LIMIT 5
`).all();
rows2.forEach(r => console.log(r.text));
console.log("---");

// Check UserEdit password session
console.log("=== UserEdit password session trajectory ===");
const rows3 = db.prepare(`
  SELECT substr(json_extract(p.data, '$.text'), 1, 500) as text
  FROM message m
  JOIN part p ON p.message_id = m.id
  WHERE m.session_id = 'ses_09a80fe04ffeB1G2cSyv5X5i0l'
    AND json_extract(m.data, '$.role') = 'assistant'
    AND json_extract(p.data, '$.type') = 'text'
  ORDER BY m.time_created
  LIMIT 3
`).all();
rows3.forEach(r => console.log(r.text));
