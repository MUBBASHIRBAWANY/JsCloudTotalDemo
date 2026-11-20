const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('C:\\Users\\Mubashir\\.local\\share\\mimocode\\mimocode.db', {readOnly: true});

// Check if CashPayment/BankPayment View files were actually modified (edit/write tool calls)
console.log("=== CashPayment/BankPayment View edits ===");
const rows = db.prepare(`
  SELECT m.session_id, json_extract(p.data, '$.tool') as tool,
    substr(json_extract(p.data, '$.state.input'), 1, 300) as input
  FROM message m
  JOIN part p ON p.message_id = m.id
  WHERE m.session_id = 'ses_080d1c79bffeNgiLX6pIseYTP9'
    AND json_extract(p.data, '$.tool') IN ('edit', 'write')
    AND json_extract(p.data, '$.type') = 'tool'
  ORDER BY m.time_created
`).all();
rows.forEach(r => console.log(`[${r.session_id}] ${r.tool}: ${r.input}`));
console.log("---");

// Check JV View dependency fix (was it applied?)
console.log("=== JV View dependency fix edits ===");
const rows2 = db.prepare(`
  SELECT json_extract(p.data, '$.tool') as tool,
    substr(json_extract(p.data, '$.state.input'), 1, 300) as input
  FROM message m
  JOIN part p ON p.message_id = m.id
  WHERE m.session_id = 'ses_09a5de430ffeTyjAlovClQq1Ns'
    AND json_extract(p.data, '$.tool') IN ('edit', 'write')
    AND json_extract(p.data, '$.type') = 'tool'
  ORDER BY m.time_created
`).all();
rows2.forEach(r => console.log(`${r.tool}: ${r.input}`));
console.log("---");

// Check StockFlowReport Total Purchase fix
console.log("=== StockFlowReport Total Purchase edits ===");
const rows3 = db.prepare(`
  SELECT json_extract(p.data, '$.tool') as tool,
    substr(json_extract(p.data, '$.state.input'), 1, 300) as input
  FROM message m
  JOIN part p ON p.message_id = m.id
  WHERE m.session_id = 'ses_077c6179fffeV59IjvnOp5c5Nb'
    AND json_extract(p.data, '$.tool') IN ('edit', 'write')
    AND json_extract(p.data, '$.type') = 'tool'
  ORDER BY m.time_created
`).all();
rows3.forEach(r => console.log(`${r.tool}: ${r.input}`));
