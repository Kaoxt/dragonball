import {test,expect} from '@playwright/test';
for(const width of [390,1280])test(`home and builder work at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.goto('/');
 await expect(page.locator('h1')).toHaveText('News from the arena.');
 await page.locator('.read-more').first().click();
 await expect(page.locator('#deck-news-more')).toBeVisible();
 await page.locator('.read-more').first().click();
 await expect(page.locator('#deck-news-more')).toBeHidden();
 if(width<760)await page.locator('#nav-toggle').click();
 await expect(page.locator('#site-navigation')).toBeVisible();
 await page.locator('#site-navigation').getByRole('link',{name:'Deck Builder',exact:true}).click();
 await expect(page.locator('#card-grid article').first()).toBeVisible();
 await page.locator('#query').fill('Orange Standing');
 await expect(page.locator('#card-grid article')).toHaveCount(1);
 await page.locator('.add-card').click();
 await page.locator('.add-card').click();
 if(width<800)await page.locator('#deck-tab').click();
 await expect(page.locator('#life-count')).toHaveText('2');
 await page.locator('#deck-name').fill('Orange practice');
 await page.locator('#life-list').getByRole('button',{name:'Remove one Orange Standing Fist Punch',exact:true}).click();
 await expect(page.locator('#life-count')).toHaveText('1');
 await page.reload();
 if(width<800)await page.locator('#deck-tab').click();
 await expect(page.locator('#deck-name')).toHaveValue('Orange practice');
 await expect(page.locator('#life-count')).toHaveText('1');
 const download=page.waitForEvent('download');await page.locator('#export-deck').click();expect((await download).suggestedFilename()).toBe('Orange-practice.json');
 await page.locator('#duplicate-deck').click();
 await expect(page.locator('#deck-name')).toHaveValue('Orange practice copy');
 await page.locator('#delete-deck').click();await page.locator('#cancel-delete').click();
 await expect(page.locator('#deck-name')).toHaveValue('Orange practice copy');
 await page.locator('#delete-deck').click();await page.locator('#confirm-delete').click();
 await expect(page.locator('#deck-name')).toHaveValue('Orange practice');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:`test-results/builder-${width}.png`,fullPage:true});
 await page.goto('/');await page.screenshot({path:`test-results/home-${width}.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
test('legacy room invites still reach the table',async({page})=>{
 const id='a'.repeat(32);await page.goto('/#'+id);await expect(page).toHaveURL(new RegExp('/play/#'+id));await expect(page.locator('#room-code')).toHaveValue(id);
});
test('saved builder deck reaches tabletop importer',async({page})=>{
 await page.goto('/decks/');
 await page.evaluate(async()=>{const {createDeck,STORAGE_KEY}=await import('/decks/store.js');const d=createDeck();d.name='Playable test';d.personalities=[1,2,3].map(level=>({id:'TEST-'+level,name:'Test '+level,pur:2}));d.personalities.push(null,null);d.cards=[{id:'test-card',name:'Test card',qty:50}];localStorage.setItem(STORAGE_KEY,JSON.stringify({active:d.id,decks:[d]}));});
 await page.goto('/play/');
 // Exercise the saved-deck picker locally without creating a remote room.
 await page.evaluate(()=>document.getElementById('open-deck').click());await page.locator('#builder-saved-decks').selectOption({label:'Playable test'});const result=await page.evaluate(async()=>{const {parseDeck}=await import('/game.js');return parseDeck(JSON.parse(document.getElementById('deck-text').value));});expect(result.cards).toHaveLength(50);expect(result.personalities).toHaveLength(3);
});
