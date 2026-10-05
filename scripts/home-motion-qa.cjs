/* Browser regression for home motion. API success is intercepted; no inquiry is sent. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.env.HOME_MOTION_BASE_URL || 'http://localhost:3100';
const output = path.resolve('output/playwright/home-motion');
const mode = process.env.HOME_MOTION_QA_MODE || 'dev';
const checks = [];
const errors = [];

function check(name, detail = {}) {
  checks.push({ name, ...detail });
  console.log(`PASS ${name}`);
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.route(/https:\/\/[^/]*(?:googletagmanager|google-analytics|facebook)\.(?:com|net)\//, route => route.abort());
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    const quoteTrigger = page.getByRole('button', { name: 'Request Quote', exact: true });
    await quoteTrigger.waitFor();
    await page.waitForFunction(() => document.querySelector('[aria-label="Request Quote"]')?.getAttribute('aria-haspopup') === 'dialog');

    const reversal = await page.evaluate(async () => {
      const tick = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const x = node => new DOMMatrix(getComputedStyle(node).transform).m41;
      const trigger = document.querySelector('[aria-label="Request Quote"]');
      trigger.click();
      await tick();
      const panel = document.querySelector('[role="dialog"]');
      const entry = panel.getAnimations()[0];
      entry.pause();
      entry.currentTime = 80;
      const initialX = x(panel);
      panel.querySelector('[aria-label="Close quote form"]').click();
      const exit = panel.getAnimations()[0];
      exit.pause();
      exit.currentTime = 0;
      const closeStartX = x(panel);
      exit.currentTime = 55;
      const closeMidX = x(panel);
      trigger.click();
      const reentry = panel.getAnimations()[0];
      reentry.pause();
      reentry.currentTime = 0;
      const reopenStartX = x(panel);
      reentry.currentTime = 100;
      const reopenMidX = x(panel);
      reentry.finish();
      await tick();
      return { initialX, closeStartX, closeMidX, reopenStartX, reopenMidX, finalX: x(panel) };
    });
    assert.ok(reversal.initialX > 0, 'entry should be partway across');
    assert.ok(Math.abs(reversal.initialX - reversal.closeStartX) < 1, 'closing must start at current x');
    assert.ok(reversal.closeMidX > reversal.closeStartX, 'close should head right');
    assert.ok(Math.abs(reversal.closeMidX - reversal.reopenStartX) < 1, 'reopening must start at current x');
    assert.ok(reversal.reopenMidX < reversal.reopenStartX, 'reopen should head left');
    assert.ok(Math.abs(reversal.finalX) < 1);
    check('drawer reverses without jumping and latest intent wins', reversal);
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await quoteTrigger.evaluate(node => document.activeElement === node), true);
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).pointerEvents), 'auto');
    check('drawer restores trigger focus and unlocks page');

    await quoteTrigger.click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[role="dialog"]')).transform === 'none');
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    check('changing motion preference during entry drops displacement safely');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await quoteTrigger.click();
    const reduce = await page.getByRole('dialog').evaluate(node => ({
      transform: getComputedStyle(node).transform,
      frames: node.getAnimations().flatMap(animation => animation.effect.getKeyframes().map(frame => frame.transform)),
      pulse: [...document.querySelectorAll('span')].filter(span => span.className.includes('liveDot')).map(span => getComputedStyle(span).animationName),
    }));
    assert.ok(reduce.frames.every(transform => !transform || transform === 'none'));
    assert.ok(reduce.pulse.every(animation => animation === 'none'));
    check('reduced drawer has no displacement and decorative pulses stop', reduce);
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.locator('img[src*="order-world-map.svg"]').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('img[src*="order-world-map.svg"]').currentSrc.endsWith('order-world-map-static.svg'));
    const staticMap = await page.locator('img[src*="order-world-map.svg"]').evaluate(node => node.currentSrc);
    assert.ok(staticMap.endsWith('order-world-map-static.svg'));
    const svg = fs.readFileSync(path.resolve('public/newpage/xuanchuan/order-world-map-static.svg'), 'utf8');
    assert.ok(!/animation\s*:|@keyframes|<animate(?:Transform|Motion)?\b/i.test(svg));
    check('reduced map selects an animation-free SVG', { currentSrc: staticMap });

    const category = page.locator('a').filter({ has: page.locator('h3', { hasText: 'Hand protection' }) }).first();
    await category.hover();
    assert.equal(await category.locator('img').evaluate(node => getComputedStyle(node).transform), 'none');
    check('reduced card hover remains still');

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const menus = [];
    for (const width of [390, 768, 1024, 1250]) {
      await page.setViewportSize({ width, height: 844 });
      const toggle = page.getByRole('button', { name: 'Open navigation menu' });
      await toggle.click();
      await page.waitForFunction(() => getComputedStyle(document.querySelector('#new-home-mobile-menu')).opacity === '1');
      const menu = await page.locator('#new-home-mobile-menu').evaluate(node => ({
        position: getComputedStyle(node).position,
        transition: getComputedStyle(node).transitionProperty,
        inert: node.inert,
        headerBottom: node.parentElement.getBoundingClientRect().bottom,
        menuTop: node.getBoundingClientRect().top,
        overflow: document.documentElement.scrollWidth > innerWidth,
        links: [...node.querySelectorAll('a')].length,
      }));
      assert.equal(menu.position, 'absolute');
      assert.ok(!menu.transition.includes('height'));
      assert.ok(!menu.inert && !menu.overflow && menu.links === 6);
      assert.ok(Math.abs(menu.headerBottom - menu.menuTop) < 3);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#new-home-mobile-menu').evaluate(node => node.inert), true);
      assert.equal(await page.getByRole('button', { name: 'Open navigation menu' }).evaluate(node => document.activeElement === node), true);
      menus.push({ width, ...menu });
    }
    check('responsive menu overlays without height animation; Escape makes it inert', { menus });
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => document.querySelector('[aria-controls="new-home-mobile-menu"]').getAttribute('aria-expanded') === 'false');
    check('desktop breakpoint clears mobile menu state');

    await quoteTrigger.focus();
    await page.keyboard.down('Space');
    assert.equal(await quoteTrigger.evaluate(node => [...node.classList].some(name => name.includes('pointerPress'))), false);
    await page.keyboard.up('Space');
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await quoteTrigger.dispatchEvent('pointerdown', { button: 0 });
    assert.equal(await quoteTrigger.evaluate(node => [...node.classList].some(name => name.includes('pointerPress'))), true);
    await quoteTrigger.dispatchEvent('pointercancel', { button: 0 });
    assert.equal(await quoteTrigger.evaluate(node => [...node.classList].some(name => name.includes('pointerPress'))), false);
    check('press feedback is pointer-only and cancels cleanly');

    await page.getByRole('button', { name: 'Tour the factory', exact: true }).click();
    const galleryFrames = await page.getByRole('dialog').evaluate(node => node.getAnimations().flatMap(animation => animation.effect.getKeyframes().map(frame => frame.transform)));
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('dialog').locator('strong').textContent(), 'Factory entrance');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.getByRole('dialog').locator('strong').textContent(), 'Factory building');
    check('gallery gains centered entry/exit; keyboard photos switch immediately', { galleryFrames });
    await page.waitForFunction(() => document.querySelector('[role="dialog"]').getAnimations().length === 0);
    await page.waitForFunction(() => {
      const image = document.querySelector('[role="dialog"] img');
      return image.complete && image.naturalWidth > 0;
    });
    check('factory photo fully loads before visual verification');
    await page.screenshot({ path: path.join(output, `${mode}-factory-gallery.png`), fullPage: false });
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });

    let mockedRequests = 0;
    await page.route('**/api/quote-email', route => {
      mockedRequests += 1;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    });
    await quoteTrigger.click();
    const form = page.getByRole('dialog').locator('form');
    await form.locator('input[name="email"]').fill('qa@example.invalid');
    await form.locator('textarea[name="message"]').fill('Local intercepted motion check; no request leaves browser.');
    await form.getByRole('button', { name: 'Submit Request' }).click();
    await form.getByRole('status').waitFor();
    await page.waitForFunction(() => document.querySelector('[role="dialog"] [role="status"]').textContent.includes('sent successfully'));
    assert.equal(mockedRequests, 1);
    const success = await form.getByRole('status').evaluate(node => ({
      live: node.getAttribute('aria-live'),
      transition: getComputedStyle(node.firstElementChild).transitionProperty,
    }));
    assert.equal(success.live, 'polite');
    assert.equal(success.transition, 'opacity');
    check('intercepted quote success fades and is announced without sending mail', success);
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });

    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await quoteTrigger.waitFor();
    await page.screenshot({ path: path.join(output, `${mode}-desktop.png`), fullPage: false });
    await quoteTrigger.click();
    await page.waitForFunction(() => document.querySelector('[role="dialog"]').getAnimations().length === 0);
    await page.screenshot({ path: path.join(output, `${mode}-quote-drawer.png`), fullPage: false });
    await page.evaluate(() => document.querySelector('a[href="/tools"]').click());
    await page.waitForURL(`${base}/tools`);
    await page.waitForFunction(() => getComputedStyle(document.body).pointerEvents === 'auto');
    check('client route exit cleans up modal and page locks');
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await quoteTrigger.waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#new-home-mobile-menu')).opacity === '1');
    await page.screenshot({ path: path.join(output, `${mode}-mobile-menu.png`), fullPage: false });
    await page.keyboard.press('Escape');

    for (const route of ['/products', '/about', '/cases', '/tools']) {
      await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Open navigation menu' }).click();
      assert.equal(await page.locator('#new-home-mobile-menu').evaluate(node => node.inert), false);
      await page.keyboard.press('Escape');
      await quoteTrigger.click();
      await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      check(`shared navigation and quote drawer ${route}`);
    }
    const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const touchPage = await touch.newPage();
    await touchPage.goto(base, { waitUntil: 'domcontentloaded' });
    const touchCard = touchPage.locator('a').filter({ has: touchPage.locator('h3', { hasText: 'Hand protection' }) }).first();
    await touchCard.locator('img').dispatchEvent('mouseover');
    assert.equal(await touchCard.locator('img').evaluate(node => getComputedStyle(node).transform), 'none');
    check('touch-emulated hover does not zoom cards');
    await touch.close();
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, `${mode}-verification.json`), JSON.stringify({ base, mode, checks, errors }, null, 2));
    const failureFile = path.join(output, `${mode}-failure.json`);
    if (fs.existsSync(failureFile)) fs.unlinkSync(failureFile);
    console.log(`Completed ${checks.length} checks; evidence: ${output}`);
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, `${mode}-failure.json`), JSON.stringify({ checks, errors, failure: error.message }, null, 2));
  process.exitCode = 1;
});
