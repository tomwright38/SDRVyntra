import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export const defaultKnowledge = {
  products: 'Vyntra’s broad offering covers transaction observability, payment visibility and tracking, plus AML and fraud detection. Specific capabilities and integrations: not yet supplied.',
  examples: 'Missing: add approved customer examples and evidenced results before using them in outreach.',
  differentiators: 'Missing: add approved differentiators. Do not claim superiority.',
  qualification: 'Missing: add approved qualification criteria. Initial audience: banks and financial institutions; Payments, Payments Operations, Transaction Banking, Financial Crime, Fraud, IT and COOs.',
  avoid: 'Do not invent integrations, customer names, performance metrics, compliance guarantees or product functionality. Never imply an institution has a problem merely because it announced an initiative.'
};
export function createStore(path) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, input TEXT NOT NULL, brief TEXT NOT NULL, notes TEXT NOT NULL, created TEXT NOT NULL, updated TEXT NOT NULL); CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL)');
  if (!db.prepare('SELECT id FROM settings WHERE id=1').get()) db.prepare('INSERT INTO settings VALUES(1,?)').run(JSON.stringify(defaultKnowledge));
  const decode = r => r && ({...r, input:JSON.parse(r.input), brief:JSON.parse(r.brief)});
  return {
    list: () => db.prepare('SELECT * FROM accounts ORDER BY updated DESC').all().map(decode),
    get: id => decode(db.prepare('SELECT * FROM accounts WHERE id=?').get(id)),
    save(id,input,brief,notes) { const now=new Date().toISOString(); db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET input=excluded.input,brief=excluded.brief,notes=excluded.notes,updated=excluded.updated').run(id,JSON.stringify(input),JSON.stringify(brief),notes,now,now); return this.get(id); },
    notes(id,notes) { db.prepare('UPDATE accounts SET notes=?,updated=? WHERE id=?').run(notes,new Date().toISOString(),id); return this.get(id); },
    knowledge:()=>JSON.parse(db.prepare('SELECT value FROM settings WHERE id=1').get().value),
    setKnowledge(value) { db.prepare('UPDATE settings SET value=? WHERE id=1').run(JSON.stringify(value)); },
    restore(backup) {
      db.exec('BEGIN IMMEDIATE');let added=0;
      try{
        const insert=db.prepare('INSERT OR IGNORE INTO accounts VALUES(?,?,?,?,?,?)');
        for(const a of backup.accounts)added+=Number(insert.run(a.id,JSON.stringify(a.input),JSON.stringify(a.brief),a.notes,a.created,a.updated).changes);
        const knowledge=Object.fromEntries(Object.keys(defaultKnowledge).map(k=>[k,backup.knowledge[k]]));
        db.prepare('UPDATE settings SET value=? WHERE id=1').run(JSON.stringify(knowledge));db.exec('COMMIT');return added;
      }catch(e){db.exec('ROLLBACK');throw e;}
    },
    close:()=>db.close()
  };
}
