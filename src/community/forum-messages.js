import { IssueError, textField } from './issues.js';
export const messageSchema = [
 `CREATE TABLE IF NOT EXISTS forum_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id TEXT NOT NULL REFERENCES forum_members(id), recipient_id TEXT NOT NULL REFERENCES forum_members(id), body TEXT NOT NULL, created_at TEXT NOT NULL, read_at TEXT)`,
 'CREATE INDEX IF NOT EXISTS forum_messages_recipient ON forum_messages(recipient_id,read_at,id)',
 'CREATE INDEX IF NOT EXISTS forum_messages_pair ON forum_messages(sender_id,recipient_id,id)',
];
export async function unreadMessages(db, me) {
 if(!me || me.banned)return 0;
 return (await db.prepare('SELECT COUNT(*) AS n FROM forum_messages WHERE recipient_id=? AND read_at IS NULL').bind(me.id).first()).n;
}
export async function messageView(db, me, q) {
 if(!me || me.banned)throw new IssueError('Sign in with an active account to view messages.',403);
 const peer=q.get('member');
 if(peer){
  const member=await db.prepare("SELECT m.id AS member_id,COALESCE(NULLIF(p.display_name,''),m.author) AS author,m.banned FROM forum_members m LEFT JOIN account_preferences p ON p.user_id=m.user_id WHERE m.id=?").bind(peer).first();
  if(!member || peer===me.id)throw new IssueError('Member not found.',404);
  const before=Number(q.get('before'))||Number.MAX_SAFE_INTEGER;
  const rows=(await db.prepare('SELECT id,sender_id,body,created_at FROM forum_messages WHERE ((sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?)) AND id<? ORDER BY id DESC LIMIT 51').bind(me.id,peer,peer,me.id,before).all()).results;
  return {member,messages:rows.slice(0,50).reverse(),hasMore:rows.length>50,myMemberId:me.id};
 }
 const rows=(await db.prepare(`SELECT m.id AS member_id,COALESCE(NULLIF(p.display_name,''),m.author) AS author,
 (SELECT COUNT(*) FROM forum_messages u WHERE u.sender_id=m.id AND u.recipient_id=? AND u.read_at IS NULL) AS unread,
 x.body,x.created_at,x.id FROM forum_messages x JOIN forum_members m ON m.id=CASE WHEN x.sender_id=? THEN x.recipient_id ELSE x.sender_id END
 LEFT JOIN account_preferences p ON p.user_id=m.user_id
 WHERE (x.sender_id=? OR x.recipient_id=?) AND x.id=(SELECT MAX(y.id) FROM forum_messages y WHERE (y.sender_id=? AND y.recipient_id=m.id) OR (y.sender_id=m.id AND y.recipient_id=?))
 ORDER BY x.id DESC LIMIT 50 OFFSET ?`).bind(me.id,me.id,me.id,me.id,me.id,me.id,Math.min(100000,Math.max(0,Math.floor(Number(q.get('page'))-1)||0))*50).all()).results;
 return {conversations:rows,hasMore:rows.length===50};
}
export async function sendMessage(db, me, data) {
 if(me.banned)throw new IssueError('Messaging is disabled for this account.',403);
 const peer=String(data.member||''),body=textField(data.body,'Message',1,5000);
 if(peer===me.id)throw new IssueError('Choose another member.');
 const recipient=await db.prepare('SELECT id FROM forum_members WHERE id=? AND banned=0').bind(peer).first();
 if(!recipient)throw new IssueError('This member cannot receive messages.',404);
 const result=await db.prepare(`INSERT INTO forum_messages(sender_id,recipient_id,body,created_at) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM forum_messages WHERE sender_id=? AND created_at>?)<100`).bind(me.id,peer,body,new Date().toISOString(),me.id,new Date(Date.now()-86400000).toISOString()).run();
 if(!result.meta.changes)throw new IssueError('You can send up to 100 messages per day.',429);
 return {id:result.meta.last_row_id};
}
