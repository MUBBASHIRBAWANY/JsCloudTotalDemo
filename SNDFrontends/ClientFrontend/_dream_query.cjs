const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');

const dbPath = 'C:/Users/Mubashir/.local/share/mimocode/mimocode.db';
const db = new DatabaseSync(dbPath, { open: true, readOnly: true });

const cmd = process.argv[2] || 'tables';

if (cmd === 'tables') {
  const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table'");
  const rows = stmt.all();
  console.log(JSON.stringify(rows.map(t => t.name)));
}
else if (cmd === 'schema') {
  const table = process.argv[3] || 'session';
  const stmt = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?");
  const rows = stmt.all(table);
  rows.forEach(r => console.log(r.sql));
}
else if (cmd === 'recent_sessions') {
  const stmt = db.prepare(`
    SELECT id, project_id, directory, title, time_created
    FROM session
    ORDER BY time_created DESC
    LIMIT 30
  `);
  const rows = stmt.all();
  console.log(JSON.stringify(rows, null, 2));
}
else if (cmd === 'session_messages') {
  const sessionId = process.argv[3];
  const stmt = db.prepare(`
    SELECT m.id, m.agent_id,
           json_extract(p.data, '$.type') as part_type,
           json_extract(p.data, '$.tool') as tool,
           substr(p.data, 1, 800) as preview
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = ?
      AND json_extract(m.data, '$.role') = 'assistant'
    ORDER BY m.time_created, p.time_created
  `);
  const rows = stmt.all(sessionId);
  console.log(JSON.stringify(rows, null, 2));
}
else if (cmd === 'user_statements') {
  const keyword = process.argv[3] || 'always';
  const stmt = db.prepare(`
    SELECT m.id, m.session_id, substr(json_extract(m.data, '$.content'), 1, 500) as content
    FROM message m
    WHERE json_extract(m.data, '$.role') = 'user'
      AND json_extract(m.data, '$.content') LIKE ?
    ORDER BY m.time_created DESC
    LIMIT 20
  `);
  const rows = stmt.all('%' + keyword + '%');
  console.log(JSON.stringify(rows, null, 2));
}
else if (cmd === 'search_text') {
  const keyword = process.argv[3];
  const stmt = db.prepare(`
    SELECT p.session_id, substr(json_extract(p.data, '$.text'), 1, 500) as text_preview,
           json_extract(p.data, '$.type') as part_type
    FROM part p
    WHERE json_extract(p.data, '$.text') LIKE ?
    ORDER BY p.time_created DESC
    LIMIT 20
  `);
  const rows = stmt.all('%' + keyword + '%');
  console.log(JSON.stringify(rows, null, 2));
}
else if (cmd === 'project_sessions') {
  const projectId = process.argv[3];
  const stmt = db.prepare(`
    SELECT id, project_id, directory, title, time_created
    FROM session
    WHERE project_id = ?
    ORDER BY time_created DESC
    LIMIT 30
  `);
  const rows = stmt.all(projectId);
  console.log(JSON.stringify(rows, null, 2));
}
else if (cmd === 'full_messages') {
  const sessionId = process.argv[3];
  const role = process.argv[4] || 'user';
  const stmt = db.prepare(`
    SELECT m.id, m.agent_id,
           json_extract(m.data, '$.content') as content,
           substr(p.data, 1, 1200) as part_preview,
           json_extract(p.data, '$.type') as part_type,
           json_extract(p.data, '$.tool') as tool
    FROM message m
    LEFT JOIN part p ON p.message_id = m.id
    WHERE m.session_id = ?
      AND json_extract(m.data, '$.role') = ?
    ORDER BY m.time_created, p.time_created
  `);
  const rows = stmt.all(sessionId, role);
  console.log(JSON.stringify(rows, null, 2));
}

db.close();
