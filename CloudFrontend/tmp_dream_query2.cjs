const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('C:\\Users\\Mubashir\\.local\\share\\mimocode\\mimocode.db', {readOnly: true});

// Search for user statements about rules, always, never, remember
const userStatements = db.prepare(`
  SELECT m.session_id, substr(json_extract(p.data, '$.text'), 1, 300) as text
  FROM message m
  JOIN part p ON p.message_id = m.id
  WHERE json_extract(m.data, '$.role') = 'user'
    AND (json_extract(p.data, '$.text') LIKE '%always%'
      OR json_extract(p.data, '$.text') LIKE '%never%'
      OR json_extract(p.data, '$.text') LIKE '%remember%'
      OR json_extract(p.data, '$.text') LIKE '%rule%')
  AND m.session_id IN (SELECT id FROM session WHERE directory = 'F:\\JaffarSonsFrontEnd')
  ORDER BY m.time_created DESC
  LIMIT 30
`).all();

console.log("=== USER RULE/ALWAYS/NEVER STATEMENTS ===");
userStatements.forEach(r => console.log(`[${r.session_id}] ${r.text}`));

// Search for "decision", "decided", "reason" in user messages
const decisions = db.prepare(`
  SELECT m.session_id, substr(json_extract(p.data, '$.text'), 1, 300) as text
  FROM message m
  JOIN part p ON p.message_id = m.id
  WHERE json_extract(m.data, '$.role') = 'user'
    AND (json_extract(p.data, '$.text') LIKE '%decision%'
      OR json_extract(p.data, '$.text') LIKE '%decided%'
      OR json_extract(p.data, '$.text') LIKE '%reason%')
  AND m.session_id IN (SELECT id FROM session WHERE directory = 'F:\\JaffarSonsFrontEnd')
  ORDER BY m.time_created DESC
  LIMIT 20
`).all();

console.log("\n=== USER DECISION STATEMENTS ===");
decisions.forEach(r => console.log(`[${r.session_id}] ${r.text}`));

// Search for error patterns in assistant tool results
const errors = db.prepare(`
  SELECT m.session_id, substr(json_extract(p.data, '$.state.output'), 1, 400) as output
  FROM message m
  JOIN part p ON p.message_id = m.id
  WHERE json_extract(m.data, '$.role') = 'assistant'
    AND json_extract(p.data, '$.type') = 'tool'
    AND (json_extract(p.data, '$.state.output') LIKE '%Error%'
      OR json_extract(p.data, '$.state.output') LIKE '%error%')
  AND m.session_id IN (SELECT id FROM session WHERE directory = 'F:\\JaffarSonsFrontEnd' AND time_updated > 1784000000000)
  ORDER BY m.time_created DESC
  LIMIT 15
`).all();

console.log("\n=== RECENT ASSISTANT ERRORS ===");
errors.forEach(r => console.log(`[${r.session_id}] ${r.output}`));
