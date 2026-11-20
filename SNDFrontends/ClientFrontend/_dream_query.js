const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = 'C:/Users/Mubashir/.local/share/mimocode/mimocode.db';
const db = new Database(dbPath, { readonly: true });

const cmd = process.argv[2] || 'tables';

if (cmd === 'tables') {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log(JSON.stringify(tables.map(t => t.name)));
}
else if (cmd === 'schema') {
  const table = process.argv[3] || 'session';
  const rows = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").all(table);
  rows.forEach(r => console.log(r.sql));
}
else if (cmd === 'recent_sessions') {
  // List sessions from last 7 days
  const rows = db.prepare(`
    SELECT id, project_id, directory, title, time_created
    FROM session
    ORDER BY time_created DESC
    LIMIT 30
  `).all();
  console.log(JSON.stringify(rows, null, 2));
}
else if (cmd === 'session_messages') {
  const sessionId = process.argv[3];
  const rows = db.prepare(`
    SELECT m.id, m.agent_id,
           json_extract(p.data, '$.type') as part_type,
           json_extract(p.data, '$.tool') as tool,
           substr(p.data, 1, 800) as preview
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = ?
      AND json_extract(m.data, '$.role') = 'assistant'
    ORDER BY m.time_created, p.time_created
  `).all(sessionId);
  console.log(JSON.stringify(rows, null, 2));
}
else if (cmd === 'user_statements') {
  const keyword = process.argv[3] || 'always';
  const rows = db.prepare(`
    SELECT m.id, m.session_id, substr(json_extract(m.data, '$.content'), 1, 500) as content
    FROM message m
    WHERE json_extract(m.data, '$.role') = 'user'
      AND json_extract(m.data, '$.content') LIKE ?
    ORDER BY m.time_created DESC
    LIMIT 20
  `).all('%' + keyword + '%');
  console.log(JSON.stringify(rows, null, 2));
}
else if (cmd === 'search_text') {
  const keyword = process.argv[3];
  const rows = db.prepare(`
    SELECT p.session_id, substr(json_extract(p.data, '$.text'), 1, 500) as text_preview,
           json_extract(p.data, '$.type') as part_type
    FROM part p
    WHERE json_extract(p.data, '$.text') LIKE ?
    ORDER BY p.time_created DESC
    LIMIT 20
  `).all('%' + keyword + '%');
  console.log(JSON.stringify(rows, null, 2));
}

db.close();
