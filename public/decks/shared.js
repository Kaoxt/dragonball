const root=document.getElementById('shared-deck');
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
try{
 const id=new URLSearchParams(location.search).get('id');if(!id)throw Error('No shared deck selected.');
 const response=await fetch('/api/decks?share='+encodeURIComponent(id),{cache:'no-store'}),result=await response.json();
 if(!response.ok)throw Error(result.error||'Unable to load this deck.');
 const deck=result.deck;document.title=deck.name+' · Dragon Ball Online';root.replaceChildren(el('h1',deck.name),el('p','Public deck'+(deck.tokui?' · '+deck.tokui:'')));
 const link=el('a','Open deck builder');link.href='/decks/';root.append(link);
 for(const [title,cards] of [['Starting lineup',[...deck.personalities,deck.mastery,deck.sensei].filter(Boolean)],['Life Deck',deck.cards],['Sensei Deck',deck.senseiDeck]]){
  const section=el('section');section.className='account-card';section.append(el('h2',title+' · '+cards.reduce((n,c)=>n+(c.qty||1),0)));
  const list=el('div');list.className='shared-card-grid';
  for(const card of cards){const figure=el('figure');
   try{const url=new URL(card.image,location.origin);if(url.protocol==='https:'||url.origin===location.origin){const img=el('img');img.src=url.href;img.alt=card.name;img.loading='lazy';img.referrerPolicy='no-referrer';figure.append(img);}}catch{}
   figure.append(el('figcaption',(card.qty||1)+' × '+card.name));list.append(figure);
  }
  section.append(cards.length?list:el('p','No cards.'));root.append(section);
 }
}catch(e){root.replaceChildren(el('h1','Shared deck'),el('p',e.message));}
