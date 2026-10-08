import {test,expect} from '@playwright/test';
test('two browsers play Score, keep private cards hidden, and resume',async({browser})=>{
 const a=await browser.newContext(),b=await browser.newContext(),c=await browser.newContext();const p=await a.newPage(),q=await b.newPage(),r=await c.newPage();
 await p.goto('/');await p.locator('#name').fill('Alice');await p.locator('#create').click();await expect(p.locator('#table')).toBeVisible();const url=p.url();
 await q.goto(url);await q.locator('#name').fill('Bob');await q.locator('#join-form button').click();await expect(q.locator('#table')).toBeVisible();
 for(const page of [p,q]){await page.locator('#open-deck').click();await page.locator('#demo-deck').click();await page.locator('#deck-form button[type=submit]').click();}
 await p.getByRole('button',{name:'Shuffle & start setup'}).click();await expect(p.locator('#hand .card')).toHaveCount(0);await p.locator('#first-player').selectOption('1');await expect(q.locator('#setup-bar')).toContainText('Bob goes first');
 await p.getByRole('button',{name:'Finish setup',exact:true}).click();await q.getByRole('button',{name:'Finish setup',exact:true}).click();
 await q.getByRole('button',{name:'Draw 3',exact:true}).click();await expect(q.locator('#hand .card')).toHaveCount(3);await expect(p.locator('.opponent [data-zone=hand] .pile')).toContainText('3');
 await q.locator('#hand .card').first().click();await q.locator('#destination').selectOption('combat');await q.locator('#move-selected').click();await expect(p.locator('.opponent [data-zone=combat] .card')).toHaveCount(1);
 await q.locator('.player-field:not(.opponent) [data-zone=combat] .card').click();await q.getByRole('button',{name:'Flip',exact:true}).click();await expect(p.locator('.opponent [data-zone=combat] .card')).toHaveAttribute('aria-label','Face-down card');
 const source=q.locator('.player-field:not(.opponent) [data-zone=combat] .card'), area=q.locator('.player-field:not(.opponent) .free-table');
 await area.scrollIntoViewIfNeeded();const cb=await source.boundingBox(),ab=await area.boundingBox();await q.mouse.move(cb.x+30,cb.y+30);await q.mouse.down();await q.mouse.move(ab.x+ab.width*.7,ab.y+220,{steps:8});await q.mouse.up();
 await expect(source).toHaveAttribute('data-x',/0\.[5-9]/);await expect(p.locator('.opponent [data-zone=combat] .card')).toHaveAttribute('data-x',await source.getAttribute('data-x'));
 await q.getByRole('button',{name:'Search Life Deck',exact:true}).click();await expect(q.locator('#search-panel')).toBeVisible();await expect(p.locator('#search-panel')).toBeHidden();await q.getByRole('button',{name:'Finish search & shuffle'}).click();
 await q.getByRole('button',{name:'Increase Anger',exact:true}).click();await expect(p.locator('.opponent .counter').nth(1)).toContainText('1');
 await p.locator('#chat').fill('<img src=x onerror=alert(1)>');await p.locator('#chat-form button').click();await expect(q.locator('#log')).toContainText('<img src=x onerror=alert(1)>');await expect(q.locator('#log img')).toHaveCount(0);
 await r.goto(url);await r.locator('#join-form button').click();await expect(r.locator('#toast')).toContainText('full');await q.reload();await q.locator('#join-form button').click();await expect(q.locator('#hand .card')).toHaveCount(2);
 await q.screenshot({path:'test-results/score-desktop.png',fullPage:true});await a.close();await b.close();await c.close();
});
test('mobile Score practice supports personality counters and moving cards',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('#lobby h1')).toContainText('Score DBZ CCG');await page.locator('#practice').click();await page.getByRole('button',{name:'Finish setup',exact:true}).click();await page.locator('#switch-seat').click();await page.getByRole('button',{name:'Finish setup',exact:true}).click();
 await page.getByRole('button',{name:'Draw 3',exact:true}).click();await page.locator('#hand .card').first().click();await page.locator('#destination').selectOption('allies');await page.locator('#move-selected').click();await expect(page.locator('.player-field:not(.opponent) [data-zone=allies] .card')).toHaveCount(1);
 await page.getByRole('button',{name:'Increase MP level',exact:true}).click();await expect(page.locator('.player-field:not(.opponent) .counter').first()).toContainText('2');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:'test-results/score-mobile.png',fullPage:true});
});

test('starting slots are ordered and MP can be dragged out and returned',async({page})=>{await page.goto('/');await page.locator('#practice').click();const slots=page.locator('.player-field:not(.opponent) .starting-slot');await expect(slots).toHaveCount(3);expect(await slots.evaluateAll(xs=>xs.map(x=>x.dataset.zone))).toEqual(['mp','mastery','sensei']);await slots.first().scrollIntoViewIfNeeded();const mp=slots.first().locator('.card'),b=await mp.boundingBox(),area=await page.locator('.player-field:not(.opponent) .free-table').boundingBox();await page.mouse.move(b.x+30,b.y+30);await page.mouse.down();await page.mouse.move(area.x+180,area.y+100,{steps:8});await page.mouse.up();const moved=page.locator('.player-field:not(.opponent) .free-table [data-card*="mp:"]');await expect(moved).toHaveCount(1);const m=await moved.boundingBox(),slot=await slots.first().boundingBox();await page.mouse.move(m.x+30,m.y+30);await page.mouse.down();await page.mouse.move(slot.x+40,slot.y+60,{steps:8});await page.mouse.up();await expect(mp).toHaveCount(1);await page.screenshot({path:'test-results/free-table.png',fullPage:true});});

test('touch dragging places a hand card onto the table',async({browser})=>{const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const page=await context.newPage();await page.goto('/');await page.locator('#practice').click();await page.getByRole('button',{name:'Finish setup',exact:true}).click();await page.locator('#switch-seat').click();await page.getByRole('button',{name:'Finish setup',exact:true}).click();await page.getByRole('button',{name:'Draw 3',exact:true}).click();await page.locator('#hand').scrollIntoViewIfNeeded();const c=await page.locator('#hand .card').first().boundingBox();const session=await context.newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:c.x+20,y:c.y+20}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:c.x+35,y:c.y+10}]});await page.locator('.player-field:not(.opponent) .free-table').scrollIntoViewIfNeeded();const t=await page.locator('.player-field:not(.opponent) .free-table').boundingBox();await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:t.x+150,y:t.y+150}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(page.locator('#hand .card')).toHaveCount(2);await expect(page.locator('.player-field:not(.opponent) .free-table .card')).toHaveCount(1);await context.close();});

for (const width of [1280, 390]) {
 test(`modern practice draw test at ${width}px`, async ({page}) => {
  await page.setViewportSize({width, height:844});
  await page.goto('/');
  await page.locator('#practice').click();
  await expect(page.locator('#hand .card')).toHaveCount(0);
  await page.getByRole('button', {name:'Start test · draw 3 cards', exact:true}).click();
  await expect(page.locator('#hand .card')).toHaveCount(3);
  await expect(page.locator('.player-field:not(.opponent) [data-zone=deck] .zone-label')).toContainText('47');
  for (const img of await page.locator('#hand .card img').all()) {
   await expect(img).toBeVisible();
   await expect.poll(() => img.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
  }
  await page.getByRole('button',{name:'Draw 1',exact:true}).click();
  await expect(page.locator('#hand .card')).toHaveCount(4);
  await page.getByRole('button',{name:'Draw 3',exact:true}).click();
  await expect(page.locator('#hand .card')).toHaveCount(7);
  await page.locator('#switch-seat').click();
  await expect(page.locator('#hand .card')).toHaveCount(0);
  await expect(page.locator('.opponent [data-zone=hand] .pile')).toContainText('7');
  await page.locator('#switch-seat').click();
  await page.locator('#hand .card').first().click();
  await page.locator('#destination').selectOption('combat');
  await page.locator('#move-selected').click();
  await expect(page.locator('#hand .card')).toHaveCount(6);
  await expect(page.locator('.player-field:not(.opponent) .free-table .card')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#hand').scrollIntoViewIfNeeded();
  await page.screenshot({path:`test-results/modern-hand-${width}.png`});
 });
}
