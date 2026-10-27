(() => {
  'use strict';
  const page = document.getElementById('page-talk');
  if (!page) return;
  const KEY = 'career-console.interview-edits.v1';
  const FORMAT = 'career-console-interview';
  const entries = new Map();
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const button = (text, handler, primary = false) => {
    const result = node('button', 'talk-button' + (primary ? ' talk-button-primary' : ''), text);
    result.type = 'button';
    if (handler) result.addEventListener('click', handler);
    return result;
  };
  const plainText = element => {
    const copy = element.cloneNode(true);
    copy.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    return copy.textContent;
  };
  const validRecord = value => value && typeof value.title === 'string' && typeof value.body === 'string'
    && value.title.trim().length > 0 && value.title.length <= 160
    && value.body.trim().length > 0 && value.body.length <= 100000;
  const readStore = () => {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !parsed.cards || typeof parsed.cards !== 'object' || Array.isArray(parsed.cards)
      || !Object.values(parsed.cards).every(validRecord)) throw new Error('invalid saved data');
    return parsed.cards;
  };
  const writeStore = cards => localStorage.setItem(KEY, JSON.stringify({ version: 1, cards }));
  const same = (a, b) => a?.title === b?.title && a?.body === b?.body;
  const status = (target, message, error = false) => {
    target.textContent = message;
    target.dataset.error = String(error);
  };
  const tools = node('div', 'talk-tools');
  tools.append(node('p', '', '点击标题或“编辑”修改话术。保存到当前浏览器，不会自动同步其他设备；可导出备份，换设备后导入。导入会覆盖匹配的话术。'));
  const globalStatus = node('p', 'talk-status');
  globalStatus.setAttribute('role', 'status');
  page.querySelector('h2').after(tools, globalStatus);

  page.querySelectorAll('.talk-card').forEach(card => {
    if (!card.id) return;
    const title = card.querySelector('.talk-title');
    const body = card.querySelector('.talk-text');
    const copy = card.querySelector('.copy-btn');
    const initial = { title: plainText(title), body: plainText(body) };
    const entry = { card, title, body, initial, editing: false };
    entries.set(card.id, entry);
    const header = node('div', 'talk-header');
    const actions = node('div', 'talk-actions');
    const feedback = node('p', 'talk-status');
    feedback.setAttribute('role', 'status');
    const form = node('form', 'talk-editor');
    form.hidden = true;
    form.id = card.id + '-editor';
    const titleLabel = node('label', '', '话术标题');
    const titleInput = node('input');
    titleInput.type = 'text';
    titleInput.required = true;
    titleInput.maxLength = 160;
    titleLabel.append(titleInput);
    const bodyLabel = node('label', '', '话术正文');
    const bodyInput = node('textarea');
    bodyInput.required = true;
    bodyInput.maxLength = 100000;
    bodyLabel.append(bodyInput);
    const footer = node('div', 'talk-editor-footer');
    const save = button('保存修改', null, true);
    save.type = 'submit';
    const edit = button('编辑', () => open());
    edit.setAttribute('aria-controls', form.id);
    title.setAttribute('role', 'button');
    title.tabIndex = 0;
    title.setAttribute('aria-controls', form.id);
    const apply = value => {
      title.textContent = value.title;
      body.textContent = value.body;
      title.setAttribute('aria-label', '编辑话术：' + value.title);
    };
    const expanded = value => {
      title.setAttribute('aria-expanded', String(value));
      edit.setAttribute('aria-expanded', String(value));
    };
    const close = () => {
      entry.editing = false;
      form.hidden = true;
      body.hidden = false;
      edit.hidden = false;
      copy.hidden = false;
      expanded(false);
      edit.focus();
    };
    const open = () => {
      if (entry.editing) { titleInput.focus(); return; }
      try {
        const saved = readStore()[card.id];
        entry.snapshot = saved;
        apply(saved || initial);
      } catch {
        status(feedback, '无法读取本地保存记录。请先导出备份，检查浏览器存储设置后重试。', true);
        return;
      }
      titleInput.value = title.textContent;
      bodyInput.value = body.textContent;
      entry.startTitle = titleInput.value;
      entry.startBody = bodyInput.value;
      entry.editing = true;
      body.hidden = true;
      edit.hidden = true;
      copy.hidden = true;
      form.hidden = false;
      expanded(true);
      status(feedback, '正在编辑，保存后生效。');
      titleInput.focus();
    };
    const cancel = button('取消', () => {
      close();
      try { apply(readStore()[card.id] || initial); } catch { /* Keep the displayed saved version. */ }
      status(feedback, '已取消本次修改。');
    });
    title.addEventListener('click', open);
    title.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const value = { title: titleInput.value, body: bodyInput.value };
      if (!validRecord(value)) {
        status(feedback, '标题和正文不能为空，标题最多160字，正文最多100000字。', true);
        return;
      }
      try {
        const current = readStore();
        if (!same(current[card.id], entry.snapshot)) {
          status(feedback, '这条话术已在其他标签页修改。请先复制当前草稿，再取消并重新编辑最新版本。', true);
          return;
        }
        current[card.id] = value;
        writeStore(current);
      } catch {
        status(feedback, '保存失败，草稿已保留在输入框中。请复制草稿，并检查浏览器存储权限或剩余空间。', true);
        return;
      }
      apply(value);
      close();
      status(feedback, '已保存到当前浏览器，刷新后仍可查看。');
    });
    form.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        form.requestSubmit();
      }
    });
    footer.append(save, cancel, node('span', 'talk-editor-hint', 'Ctrl / ⌘ + Enter 保存'));
    form.append(titleLabel, bodyLabel, footer);
    card.prepend(header);
    copy.classList.add('talk-button');
    actions.append(edit, copy);
    header.append(title, actions);
    body.after(form, feedback);
    expanded(false);
    apply(initial);
    Object.assign(entry, { apply, feedback, titleInput, bodyInput });
  });

  const refresh = () => {
    try {
      const saved = readStore();
      entries.forEach((entry, id) => {
        if (!entry.editing) entry.apply(saved[id] || entry.initial);
      });
    } catch {
      status(globalStatus, '无法读取本地话术记录，当前显示网页原版；已有存储未被覆盖。', true);
    }
  };
  refresh();
  window.addEventListener('storage', event => { if (event.key === KEY || event.key === null) refresh(); });
  window.addEventListener('beforeunload', event => {
    const dirty = [...entries.values()].some(entry => entry.editing
      && (entry.titleInput.value !== entry.startTitle || entry.bodyInput.value !== entry.startBody));
    if (dirty) { event.preventDefault(); event.returnValue = ''; }
  });

  tools.append(button('导出备份', () => {
    if ([...entries.values()].some(entry => entry.editing)) {
      status(globalStatus, '请先保存或取消正在编辑的话术，再导出备份。', true);
      return;
    }
    const cards = Object.fromEntries([...entries].map(([id, entry]) => [id, { title: entry.title.textContent, body: entry.body.textContent }]));
    const data = JSON.stringify({ format: FORMAT, version: 1, cards }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const link = node('a');
    link.href = url;
    link.download = '面试话术备份-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status(globalStatus, '已导出全部话术，可在另一台设备导入。');
  }));
  const fileInput = node('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.hidden = true;
  fileInput.id = 'talk-import-file';
  tools.append(button('导入备份', () => {
    if ([...entries.values()].some(entry => entry.editing)) {
      status(globalStatus, '请先保存或取消正在编辑的话术，再导入备份。', true);
      return;
    }
    fileInput.click();
  }), fileInput);
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('too large');
      const data = JSON.parse(await file.text());
      if (data?.format !== FORMAT || data.version !== 1 || !data.cards || typeof data.cards !== 'object' || Array.isArray(data.cards)
        || !Object.values(data.cards).every(validRecord)) throw new Error('invalid backup');
      if ([...entries.values()].some(entry => entry.editing)) throw new Error('editing');
      const known = Object.entries(data.cards).filter(([id]) => entries.has(id));
      if (!known.length) throw new Error('no matching cards');
      const current = readStore();
      known.forEach(([id, value]) => { current[id] = { title: value.title, body: value.body }; });
      writeStore(current);
      refresh();
      status(globalStatus, `已导入 ${known.length} 条话术并保存到当前浏览器。`);
    } catch {
      status(globalStatus, '导入失败，原有内容未改动。请使用有效的话术备份、结束编辑，并检查浏览器存储权限。', true);
    } finally { fileInput.value = ''; }
  });
})();
