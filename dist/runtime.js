/*!
 * The entire JS budget for the library. Dependency-free, progressive
 * enhancement (everything degrades to working HTML without it).
 *
 * Three things that need scripting:
 *   1. Tabs / segmented — roving tabindex + arrow-key nav
 *      (the a11y tablist pattern a radio hack can't provide).
 *   2. Modal open — native <dialog> gives close/Esc/focus-trap; only showModal() needs a hook.
 *   3. Toasts — inject an <output role="status"> and auto-remove it.
 */
(() => {
  'use strict';
  const all = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // --- 1. Tabs / segmented control -------------------------------------------
  function initTablist(list) {
    const tabs = all('[role="tab"]', list);
    if (!tabs.length) return;

    const select = (tab, moveFocus = true) => {
      for (const t of tabs) {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const id = t.getAttribute('aria-controls');
        if (id) { const panel = document.getElementById(id); if (panel) panel.hidden = !on; }
      }
      if (moveFocus) tab.focus();
    };

    list.addEventListener('click', (e) => {
      const tab = e.target.closest('[role="tab"]');
      if (tab && tabs.includes(tab)) select(tab, false);
    });

    list.addEventListener('keydown', (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const vertical = list.getAttribute('aria-orientation') === 'vertical';
      const prev = vertical ? 'ArrowUp' : 'ArrowLeft';
      const next = vertical ? 'ArrowDown' : 'ArrowRight';
      let j;
      if (e.key === next) j = (i + 1) % tabs.length;
      else if (e.key === prev) j = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = tabs.length - 1;
      else return;
      e.preventDefault();
      select(tabs[j]);
    });
  }

  // --- 2. Modal open/close hooks (native <dialog>) ---------------------------
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open-modal]');
    if (opener) document.getElementById(opener.getAttribute('data-open-modal'))?.showModal();
    const closer = e.target.closest('[data-close-modal]');
    if (closer) closer.closest('dialog')?.close();
  });

  // --- 3. Toasts -------------------------------------------------------------
  function toast(message, { tone = '', icon = '', timeout = 4000, region = 'toasts' } = {}) {
    let host = document.getElementById(region);
    if (!host) {
      host = document.createElement('div');
      host.className = 'toast-region';
      host.id = region;
      document.body.append(host);
    }
    const el = document.createElement('output');
    el.className = 'toast' + (tone ? ` toast--${tone}` : '');
    el.setAttribute('role', 'status');
    el.innerHTML =
      (icon ? `<span class="toast__icon" aria-hidden="true">${icon}</span>` : '') +
      '<span class="toast__msg"></span>' +
      '<button class="toast__close" type="button" aria-label="Dismiss">✕</button>';
    el.querySelector('.toast__msg').textContent = message;

    const dismiss = () => {
      el.classList.add('toast--leaving');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    };
    el.querySelector('.toast__close').addEventListener('click', dismiss);
    host.append(el);
    if (timeout) setTimeout(dismiss, timeout);
    return el;
  }

  // --- init ------------------------------------------------------------------
  const init = () => all('[role="tablist"]').forEach(initTablist);
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);

  window.bleed = { toast, initTablist };
})();
