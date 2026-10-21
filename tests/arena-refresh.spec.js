import { test, expect } from '@playwright/test';

test('practice refresh retains the current hand, deck count, counters and Undo; Leave exits', async ({page}) => {
  await page.goto('/arena/');
  await page.getByRole('button', {name:'Try a solo practice table', exact:true}).click();
  await page.getByRole('button', {name:'Start test · draw 3 cards', exact:true}).click();
  await page.getByRole('button', {name:'Increase Anger', exact:true}).click();
  await page.getByRole('button', {name:'Draw 1', exact:true}).click();
  const cards = await page.locator('#hand [data-card]').evaluateAll(els => els.map(el => el.dataset.card));
  const counters = await page.locator('.player-field:not(.opponent) .mp-readout').textContent();
  await page.reload();
  await expect(page.locator('#table')).toBeVisible();
  await expect(page.locator('#lobby')).toBeHidden();
  await expect(page.locator('#hand .card')).toHaveCount(4);
  expect(await page.locator('#hand [data-card]').evaluateAll(els => els.map(el => el.dataset.card))).toEqual(cards);
  await expect(page.locator('.player-field:not(.opponent) .mp-readout')).toHaveText(counters);
  await expect(page.locator('.player-field:not(.opponent) [data-zone=deck] .zone-label')).toContainText('46');
  await page.getByRole('button', {name:'Undo', exact:true}).click();
  await expect(page.locator('#hand .card')).toHaveCount(3);
  await page.getByRole('button', {name:'Leave table', exact:true}).click();
  await page.reload();
  await expect(page.locator('#lobby')).toBeVisible();
  await expect(page.locator('#table')).toBeHidden();
});
