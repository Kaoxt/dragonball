import { test, expect } from '@playwright/test';
for (const width of [390, 1280]) {
  test(`piles stay compact and let cards be inspected and moved at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height:900});
    await page.goto('/');
    await page.locator('#practice').click();
    await page.locator('#start-draw-test').click();
    const removed = page.locator('.player-field:not(.opponent) [data-zone="removed"]');
    const initialHeight = (await removed.boundingBox()).height;
    for (let i=0; i<3; i++) {
      await page.locator('#hand .card').first().click();
      await page.locator('#destination').selectOption('removed');
      await page.locator('#move-selected').click();
    }
    await expect(removed.locator('.zone-label')).toContainText('3');
    expect((await removed.boundingBox()).height).toBe(initialHeight);
    await expect(removed.locator('.pile-cover')).toHaveCount(1);
    await removed.locator('[data-pile]').click();
    await expect(page.locator('#pile-dialog')).toBeVisible();
    await expect(page.locator('#pile-cards .card')).toHaveCount(3);
    await page.locator('#pile-cards .card').first().click();
    await expect(page.locator('#pile-dialog')).toBeHidden();
    await page.locator('#destination').selectOption('discard');
    await page.locator('#move-selected').click();
    await expect(removed.locator('.zone-label')).toContainText('2');
    const discard = page.locator('.player-field:not(.opponent) [data-zone="discard"]');
    await expect(discard.locator('.zone-label')).toContainText('1');
    await expect(page.locator('#card-controls')).toBeHidden();
    await discard.locator('[data-pile]').click();
    await expect(page.locator('#pile-cards .card')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('#pile-dialog')).toBeHidden();
    await removed.locator('[data-pile]').click();
    await page.locator('#pile-cards .card').first().click();
    await page.getByRole('button', {name:'Flip',exact:true}).click();
    await page.locator('#close-card-controls').click();
    await page.locator('#switch-seat').click();
    await expect(page.locator('.opponent [data-zone=removed] .pile-cover img')).toHaveAttribute('src','/assets/dragon-ball-online-card-back.webp');
    await page.locator('.opponent [data-zone="removed"] [data-pile]').click();
    await page.locator('#pile-cards .card').first().click();
    await expect(page.locator('#inspect h3')).toHaveText('Face-down card');
    await expect(page.locator('#move-selected')).toHaveCount(0);
    await expect(page.locator('#inspect')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('#close-card-controls').click();
    await page.locator('#switch-seat').click();
    await removed.scrollIntoViewIfNeeded();
    await page.screenshot({path:`test-results/compact-piles-${width}.png`});
  });
}
