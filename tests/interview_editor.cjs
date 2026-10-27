const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const KEY = 'career-console.interview-edits.v1';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/career-console/`;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const errors = [];
  const openTalk = async page => {
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.getByText('面试话术', { exact: true }).click();
  };
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'], serviceWorkers: 'block' });
    const page = await context.newPage();
    await openTalk(page);
    const card = page.locator('#talk-introduction-new');
    assert.equal(await page.locator('#page-talk .talk-actions button', { hasText: '编辑' }).count(), 17);
    const original = await card.locator('.talk-text').innerText();
    await card.locator('.talk-title').click();
    assert.equal(await card.getByLabel('话术正文').inputValue(), original);
    await card.getByLabel('话术正文').fill('不会保存的修改');
    await card.getByRole('button', { name: '取消', exact: true }).click();
    assert.equal(await card.locator('.talk-text').innerText(), original);
    await card.getByRole('button', { name: '编辑', exact: true }).click();
    const title = '新版自我介绍 · 网页修改';
    const body = '第一段：参数减少35%。\n\n第二段：<img src=x onerror=alert(1)> 只是文字。';
    await card.getByLabel('话术标题').fill(title);
    await card.getByLabel('话术正文').fill(body);
    await card.getByRole('button', { name: '保存修改' }).click();
    assert.equal(await card.locator('.talk-text').innerText(), body);
    assert.equal(await card.locator('.talk-text img').count(), 0);
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText('面试话术', { exact: true }).click();
    assert.equal(await card.locator('.talk-title').innerText(), title);
    assert.equal(await card.locator('.talk-text').innerText(), body);
    await card.getByRole('button', { name: '一键复制' }).click();
    await page.waitForFunction(() => document.querySelector('#talk-introduction-new .copy-btn').textContent.includes('已复制'));
    assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n'), title + '\n' + body);
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出备份' }).click();
    const download = await downloadEvent;
    const backupPath = await download.path();
    const backup = fs.readFileSync(backupPath);
    assert.equal(JSON.parse(backup).cards['talk-introduction-new'].body, body);

    // The same saved record changed in another tab must not silently overwrite a draft.
    const second = await context.newPage();
    await openTalk(second);
    await card.getByRole('button', { name: '编辑', exact: true }).click();
    await card.getByLabel('话术正文').fill('标签页一的草稿');
    const other = second.locator('#talk-introduction-new');
    await other.getByRole('button', { name: '编辑', exact: true }).click();
    await other.getByLabel('话术正文').fill('标签页二保存的版本');
    await other.getByRole('button', { name: '保存修改' }).click();
    await card.getByRole('button', { name: '保存修改' }).click();
    assert.ok((await card.locator('.talk-status').innerText()).includes('其他标签页'));
    assert.equal(await card.getByLabel('话术正文').inputValue(), '标签页一的草稿');
    await card.getByRole('button', { name: '取消', exact: true }).click();
    assert.equal(await card.locator('.talk-text').innerText(), '标签页二保存的版本');
    await second.close();

    // Storage failure retains draft and reports failure, never a false saved state.
    await card.getByRole('button', { name: '编辑', exact: true }).click();
    await card.getByLabel('话术正文').fill('保存失败也应保留的草稿');
    await page.evaluate(() => { window.originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); }; });
    await card.getByRole('button', { name: '保存修改' }).click();
    assert.ok((await card.locator('.talk-status').innerText()).includes('保存失败'));
    assert.equal(await card.getByLabel('话术正文').inputValue(), '保存失败也应保留的草稿');
    await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
    await card.getByRole('button', { name: '取消', exact: true }).click();

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const mobile = await mobileContext.newPage();
    await openTalk(mobile);
    await mobile.locator('#talk-import-file').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: backup });
    await mobile.getByText('已导入 17 条话术并保存到当前浏览器。', { exact: true }).waitFor();
    const mobileCard = mobile.locator('#talk-introduction-new');
    assert.equal(await mobileCard.locator('.talk-text').innerText(), body);
    const beforeBadImport = await mobile.evaluate(key => localStorage.getItem(key), KEY);
    await mobile.locator('#talk-import-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"wrong"}') });
    await mobile.getByText(/导入失败，原有内容未改动/).waitFor();
    assert.equal(await mobile.evaluate(key => localStorage.getItem(key), KEY), beforeBadImport);
    await mobileCard.locator('.talk-title').click();
    await mobileCard.getByLabel('话术标题').fill('   ');
    await mobileCard.getByRole('button', { name: '保存修改' }).click();
    assert.ok((await mobileCard.locator('.talk-status').innerText()).includes('不能为空'));
    await mobileCard.getByLabel('话术标题').fill(title);
    for (const locator of [mobileCard, mobileCard.getByLabel('话术正文'), mobileCard.getByLabel('话术标题')]) {
      const box = await locator.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= 391, 'mobile horizontal overflow');
    }
    const output = process.env.INTERVIEW_TEST_OUTPUT;
    if (output) {
      fs.mkdirSync(output, { recursive: true });
      await mobileCard.screenshot({ path: path.join(output, 'mobile-editor.png') });
      await card.scrollIntoViewIfNeeded();
      await card.screenshot({ path: path.join(output, 'desktop-saved.png') });
    }
    await mobileCard.getByRole('button', { name: '取消', exact: true }).click();

    // Real service-worker cache supports editing and reload without a connection.
    const offlineContext = await browser.newContext();
    const offline = await offlineContext.newPage();
    await openTalk(offline);
    await offline.evaluate(() => navigator.serviceWorker.ready);
    await offline.waitForFunction(() => !!navigator.serviceWorker.controller);
    await offlineContext.setOffline(true);
    await offline.reload({ waitUntil: 'load' });
    await offline.getByText('面试话术', { exact: true }).click();
    const offlineCard = offline.locator('#talk-introduction-new');
    await offlineCard.getByRole('button', { name: '编辑', exact: true }).click();
    await offlineCard.getByLabel('话术正文').fill('离线修改');
    await offlineCard.getByRole('button', { name: '保存修改' }).click();
    await offline.reload({ waitUntil: 'load' });
    await offline.getByText('面试话术', { exact: true }).click();
    assert.equal(await offlineCard.locator('.talk-text').innerText(), '离线修改');
    assert.deepEqual(errors, []);
    console.log('PASS: all 17 editors, paragraph preservation, cancel, save/reload, literal HTML, clipboard, backup roundtrip, invalid import, cross-tab conflict, storage failure, empty content, mobile layout, offline save/reload.');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
