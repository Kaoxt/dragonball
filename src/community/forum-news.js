// Import the original homepage articles into the existing owner account once.
// Durable markers survive topic deletion; subsequent edits are never overwritten.
export const ANNOUNCEMENTS_ID=4;
export const NEWS_AUTHOR_ID='7bb24f5c-1f13-4bfc-af60-c153f980e9af';
export const LEGACY_ARTICLES=[
  {
    "key": "deck-builder-update",
    "title": "A place to build your next deck.",
    "body": "Browse the card collection, choose your starting lineup, and put together a deck in one clean workspace.\n\nSearch by card name, number, or available rules text. Filter by set, style, and type, then add cards to your Life Deck or Sensei Deck.\n\nName and save multiple decks in your browser. Export a JSON backup or select a saved deck from “Load deck” when you join a table.\n\n[Open deck builder](https://dragonballocg.com/decks/)"
  },
  {
    "key": "saiyan-saga-update",
    "title": "Saiyan Saga, a new look.",
    "body": "The original set is being refreshed for Dragon Ball Online, with consistent card dimensions, cleaner artwork, and the updated card frame.\n\nBrowse the available cards in the database as the collection grows. The deck builder uses the same catalog, so newly added cards appear there too.\n\nThe remaining artwork and card text are still being reviewed. The database shows the current collection.\n\n[Explore the cards](https://dragonballocg.com/cards/)"
  },
  {
    "key": "rulebook-update",
    "title": "The rulebook, within reach.",
    "body": "From your starting lineup to the final attack, the digital rulebook keeps the Score DBZ game guidance close at hand.\n\nSearch the guide, jump between chapters, and revisit the turn sequence as you play. The tabletop keeps card effects and decisions in your hands.\n\n[Read the rulebook](https://dragonballocg.com/rulebook/)"
  }
];
export async function importLegacyNews(db){
 return db.transaction(()=>{
  db.prepare('CREATE TABLE IF NOT EXISTS forum_news_imports (source_key TEXT PRIMARY KEY, topic_id INTEGER)').run();
  if(!db.prepare('SELECT id FROM forum_members WHERE id=?').bind(NEWS_AUTHOR_ID).first())return null;
  for(const article of [...LEGACY_ARTICLES].reverse()){
   const key='dragonball-home-20261008-'+article.key;
   if(db.prepare('SELECT topic_id FROM forum_news_imports WHERE source_key=?').bind(key).first())continue;
   const result=db.prepare('INSERT INTO forum_topics(member_id,category_id,title,body,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(NEWS_AUTHOR_ID,ANNOUNCEMENTS_ID,article.title,article.body,'2026-10-08T12:00:00.000Z','2026-10-08T12:00:00.000Z').run();
   db.prepare('INSERT INTO forum_news_imports(source_key,topic_id) VALUES(?,?)').bind(key,result.meta.last_row_id).run();
  }
  return db.prepare('SELECT topic_id FROM forum_news_imports WHERE source_key=?').bind('dragonball-home-20261008-'+LEGACY_ARTICLES[0].key).first()?.topic_id??null;
 });
}
