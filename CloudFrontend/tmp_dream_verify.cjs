const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('C:\\Users\\Mubashir\\.local\\share\\mimocode\\mimocode.db', {readOnly: true});

// Verify: fetchVoucherDependencies.js does NOT fetch vouchers
console.log("=== Verify: fetchVoucherDependencies does NOT fetch Vouchers ===");
const v1 = db.prepare(`
  SELECT substr(json_extract(p.data, '$.state.output'), 1, 600) as output
  FROM message m
  JOIN part p ON p.message_id = m.id
  WHERE m.session_id = 'ses_09a5de430ffeTyjAlovClQq1Ns'
    AND json_extract(p.data, '$.tool') = 'read'
    AND json_extract(p.data, '$.state.output') LIKE '%fetchVoucherDependencies%'
  ORDER BY m.time_created
  LIMIT 5
`).all();
v1.forEach(r => console.log(r.output));
console.log("---");

// Verify: getAccountLabel checks row.Client first
console.log("=== Verify: getAccountLabel checks row.Client first ===");
const v2 = db.prepare(`
  SELECT substr(json_extract(p.data, '$.state.output'), 1, 600) as output
  FROM message m
  JOIN part p ON p.message_id = m.id
  WHERE m.session_id = 'ses_09a5de430ffeTyjAlovClQq1Ns'
    AND json_extract(p.data, '$.type') = 'text'
    AND json_extract(p.data, '$.text') LIKE '%getAccountLabel%'
  ORDER BY m.time_created
  LIMIT 3
`).all();
v2.forEach(r => console.log(r.output));
console.log("---");

// Verify: TrailBalancePopup fetches ChartofAccounts
console.log("=== Verify: TrailBalancePopup fetches ChartofAccounts ===");
const v3 = db.prepare(`
  SELECT substr(json_extract(p.data, '$.text'), 1, 500) as text
  FROM message m
  JOIN part p ON p.message_id = m.id
  WHERE m.session_id = 'ses_096936450ffe5VANN1ka0rl6p0'
    AND json_extract(p.data, '$.type') = 'text'
    AND json_extract(p.data, '$.text') LIKE '%TrailBalancePopup%'
  ORDER BY m.time_created
  LIMIT 3
`).all();
v3.forEach(r => console.log(r.text));
console.log("---");

// Verify: UserEdit password condition
console.log("=== Verify: UserEdit password condition ===");
const v4 = db.prepare(`
  SELECT substr(json_extract(p.data, '$.text'), 1, 500) as text
  FROM message m
  JOIN part p ON p.message_id = m.id
  WHERE m.session_id = 'ses_09a80fe04ffeB1G2cSyv5X5i0l'
    AND json_extract(m.data, '$.role') = 'user'
    AND json_extract(p.data, '$.text') LIKE '%password%'
  ORDER BY m.time_created
  LIMIT 3
`).all();
v4.forEach(r => console.log(r.text));
