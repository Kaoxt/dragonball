import { hash } from './session.js';

// Count a topic visit at most once per viewer in thirty minutes.
// Anonymous visitors use a one-way daily IP/agent hash; raw values are not stored.
export function recordTopicView(db,request,session,topicId,now=Date.now()){
 const day=Math.floor(now/86400000);
 const viewer=hash(session?'member:'+session.id:'guest:'+day+':'+(request.headers.get('CF-Connecting-IP')||'unknown')+':'+(request.headers.get('User-Agent')||''));
 return db.transaction(()=>{
  db.prepare('DELETE FROM forum_topic_views WHERE last_viewed_at<?').bind(now-86400000).run();
  const recorded=db.prepare(`INSERT INTO forum_topic_views(topic_id,viewer_hash,last_viewed_at) VALUES(?,?,?)
   ON CONFLICT(topic_id,viewer_hash) DO UPDATE SET last_viewed_at=excluded.last_viewed_at
   WHERE forum_topic_views.last_viewed_at<=?`).bind(topicId,viewer,now,now-1800000).run();
  if(recorded.meta.changes)db.prepare('UPDATE forum_topics SET view_count=view_count+1 WHERE id=?').bind(topicId).run();
  return db.prepare('SELECT view_count FROM forum_topics WHERE id=?').bind(topicId).first().view_count;
 });
}
