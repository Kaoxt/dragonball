import { test, expect } from '@playwright/test';
test('two isolated browsers can play, keep secrets private, and resume', async ({ browser }) => {
  const a = await browser.newContext(), b = await browser.newContext(), stranger = await browser.newContext();
  const p = await a.newPage(), q = await b.newPage(), r = await stranger.newPage();
  await p.goto('/'); await p.screenshot({path:'test-results/desktop-lobby.png',fullPage:true}); await p.locator('#name').fill('Alice'); await p.locator('#create').click(); await expect(p.locator('#table')).toBeVisible();
  const url = p.url(); await q.goto(url); await q.locator('#name').fill('Bob'); await q.locator('#join-form button').click(); await expect(q.locator('#table')).toBeVisible();
  for (const page of [p,q]) { await page.locator('#open-deck').click(); await page.locator('#demo-deck').click(); await page.locator('#deck-form button[type=submit]').click(); }
  await p.getByRole('button', { name: 'Shuffle & start setup' }).click(); await expect(p.locator('#hand .card')).toHaveCount(6);
  await p.getByRole('button', { name: 'Mulligan', exact: true }).click(); await expect(p.getByRole('button', {name:'Mulligan',exact:true})).toBeDisabled();
  await p.getByRole('button', { name: 'Keep hand · set life' }).click(); await q.getByRole('button', { name: 'Keep hand · set life' }).click();
  await p.getByRole('button', { name: 'Draw 1', exact: true }).click(); await expect(p.locator('#hand .card')).toHaveCount(7);
  await expect(q.locator('.opponent [data-zone=hand] .pile')).toContainText('7');
  await p.locator('#hand .card').first().click(); await p.locator('#destination').selectOption('battle'); await p.locator('#move-selected').click();
  await expect(q.locator('.opponent [data-zone=battle] .card')).toHaveCount(1);
  await p.locator('.player-field:not(.opponent) [data-zone=battle] .card').click(); await p.getByRole('button',{name:'Flip',exact:true}).click();
  await expect(q.locator('.opponent [data-zone=battle] .card')).toHaveText('F');
  await p.getByRole('button', {name:'Search deck',exact:true}).click(); await expect(p.locator('#search-panel')).toBeVisible(); await expect(q.locator('#search-panel')).toBeHidden();
  await p.getByRole('button', {name:'Finish search & shuffle'}).click(); await expect(p.locator('#search-panel')).toBeHidden();
  await p.locator('#chat').fill('<img src=x onerror=alert(1)>'); await p.locator('#chat-form button').click(); await expect(q.locator('#log')).toContainText('<img src=x onerror=alert(1)>'); await expect(q.locator('#log img')).toHaveCount(0);
  await r.goto(url); await r.locator('#join-form button').click(); await expect(r.locator('#toast')).toContainText('full');
  await p.reload(); await p.locator('#join-form button').click(); await expect(p.locator('#hand .card')).toHaveCount(6);
  await p.screenshot({path:'test-results/desktop-table.png',fullPage:true}); await a.close(); await b.close(); await stranger.close();
});
test('phone layout supports tapping cards and practice seat switching', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await expect(page.locator('#lobby h1')).toContainText('Fusion World');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.locator('#practice').click(); await page.getByRole('button',{name:'Keep hand · set life'}).click();
  await page.locator('#switch-seat').click(); await page.getByRole('button',{name:'Keep hand · set life'}).click();
  await page.locator('#hand .card').first().click(); await page.locator('#destination').selectOption('energy'); await page.locator('#move-selected').click();
  await expect(page.locator('.player-field:not(.opponent) [data-zone=energy] .card')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({path:'test-results/mobile-table.png',fullPage:true});
});
