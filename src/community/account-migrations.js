// Requested account rename, scoped to the existing forum identity.
// Keep the account ID and all credentials, sessions and permissions unchanged.
export function migrateKurtUsername(db) {
 const key='2026-10-09-kurt-login';
 return db.transaction(()=>{
  if(db.prepare('SELECT value FROM auth_settings WHERE key=?').bind(key).first())return 'completed';
  const account=db.prepare("SELECT a.id FROM auth_accounts a JOIN forum_members m ON m.user_id=a.id WHERE m.id=? AND a.username=? COLLATE NOCASE").bind('7bb24f5c-1f13-4bfc-af60-c153f980e9af','kaoxt').first();
  if(!account){
   db.prepare('INSERT INTO auth_settings(key,value) VALUES(?,?)').bind(key,'not-applicable').run();
   return 'not-applicable';
  }
  if(db.prepare('SELECT id FROM auth_accounts WHERE username=? COLLATE NOCASE AND id!=?').bind('Kurt',account.id).first())return 'conflict';
  db.prepare('UPDATE auth_accounts SET username=? WHERE id=?').bind('Kurt',account.id).run();
  db.prepare('INSERT INTO auth_settings(key,value) VALUES(?,?)').bind(key,account.id).run();
  return 'renamed';
 });
}
