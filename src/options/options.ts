import { describePermissions, hasHostPermission, requestHostPermission } from '../shared/permissions';
import {
  createProfile,
  deleteProfile,
  duplicateHeaderNames,
  duplicateProfile,
  moveProfile,
  newHeaderRule,
  patchProfile,
} from '../shared/profiles';
import { loadState, loadStatus, updateState } from '../shared/storage';
import { STATE_KEY, STATUS_KEY, type HeaderRule, type Profile, type State } from '../shared/types';
import {
  parsePatterns,
  validateBadgeText,
  validateColor,
  validateHeaderName,
  validatePatterns,
  validateProfileName,
  type ValidationResult,
} from '../shared/validate';

const SAVE_DELAY_MS = 300;

let state: State = { version: 1, profiles: [], activeProfileId: null };
let selectedId: string | null = null;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const profilesEl = $('profiles');
const editorEl = $('editor');

// ---------- helpers ----------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { class?: string } = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  const { class: cls, ...rest } = props;
  Object.assign(node, rest);
  if (cls) node.className = cls;
  node.append(...children);
  return node;
}

function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number): (...a: A) => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

function selected(): Profile | undefined {
  return state.profiles.find((p) => p.id === selectedId);
}

/** Applies `fn` to the freshest stored state and keeps the local copy in sync. */
async function mutate(fn: (s: State) => State): Promise<void> {
  state = await updateState(fn);
}

/**
 * Wires an input so it validates immediately (inline error) and saves,
 * debounced, only when valid. Invalid input blocks only this field.
 */
function bindField(
  input: HTMLInputElement | HTMLTextAreaElement,
  errorEl: HTMLElement,
  validate: (v: string) => ValidationResult,
  save: (v: string) => void | Promise<void>,
  after?: (v: string, error: ValidationResult) => void,
): void {
  const debounced = debounce((v: string) => void save(v), SAVE_DELAY_MS);
  input.addEventListener('input', () => {
    const v = input.value;
    const error = validate(v);
    errorEl.textContent = error ?? '';
    input.classList.toggle('invalid', error !== null);
    after?.(v, error);
    if (!error) debounced(v);
  });
}

// ---------- banners ----------

async function refreshPermission(): Promise<void> {
  $('permission').hidden = await hasHostPermission();
}

async function refreshStatus(): Promise<void> {
  const status = await loadStatus();
  const box = $('dnr-error');
  box.hidden = !status?.error;
  box.textContent = status?.error ? `Failed to apply header rules: ${status.error}` : '';
}

$('grant').addEventListener('click', async () => {
  const result = await requestHostPermission();
  await refreshPermission();
  // Show what happened so a silent failure is diagnosable.
  const detail = $('permission-detail');
  if (result.granted) {
    detail.textContent = '';
    return;
  }
  const outcome = result.error ? `Request failed: ${result.error}` : 'Request was declined.';
  detail.textContent = `${outcome} [${await describePermissions()}]`;
});

// ---------- profile list ----------

function renderList(): void {
  profilesEl.replaceChildren(
    ...state.profiles.map((p) => {
      const li = el('li', { class: p.id === selectedId ? 'selected' : '' });
      const swatch = el('span', { class: 'swatch' });
      swatch.style.background = p.color;
      li.append(swatch, el('span', { class: 'name', textContent: p.name }));
      if (p.id === state.activeProfileId) li.append(el('span', { class: 'active-tag', textContent: 'active' }));
      li.addEventListener('click', () => select(p.id));
      return li;
    }),
  );
  if (state.profiles.length === 0) {
    profilesEl.append(el('li', { class: 'empty', textContent: 'No profiles yet.' }));
  }
}

function select(id: string | null): void {
  selectedId = id;
  renderList();
  renderEditor();
}

$('add-profile').addEventListener('click', async () => {
  let id = '';
  await mutate((s) => {
    const r = createProfile(s);
    id = r.profile.id;
    return r.state;
  });
  select(id);
});

// ---------- editor ----------

function renderEditor(): void {
  const p = selected();
  if (!p) {
    editorEl.replaceChildren(
      el('p', { class: 'empty', textContent: state.profiles.length ? 'Select a profile to edit.' : 'Create a profile to get started.' }),
    );
    return;
  }
  const id = p.id;

  // Toolbar: activate / duplicate / reorder / delete
  const toolbar = el('div', { class: 'toolbar' });
  const isActive = state.activeProfileId === id;
  const activate = el('button', { type: 'button', textContent: isActive ? 'Deactivate' : 'Activate' });
  activate.addEventListener('click', () =>
    void mutate((s) => ({ ...s, activeProfileId: s.activeProfileId === id ? null : id })),
  );
  const dup = el('button', { type: 'button', textContent: 'Duplicate' });
  dup.addEventListener('click', async () => {
    let newId: string | null = null;
    await mutate((s) => {
      const r = duplicateProfile(s, id);
      newId = r.profile?.id ?? null;
      return r.state;
    });
    if (newId) select(newId);
  });
  const up = el('button', { type: 'button', textContent: '↑ Up' });
  up.addEventListener('click', () => void mutate((s) => moveProfile(s, id, -1)));
  const down = el('button', { type: 'button', textContent: '↓ Down' });
  down.addEventListener('click', () => void mutate((s) => moveProfile(s, id, 1)));
  const del = el('button', { type: 'button', textContent: 'Delete' });
  del.addEventListener('click', async () => {
    if (!confirm(`Delete profile "${p.name}"?`)) return;
    await mutate((s) => deleteProfile(s, id));
    select(state.profiles[0]?.id ?? null);
  });
  toolbar.append(activate, dup, up, down, del);

  // Name
  const nameErr = el('div', { class: 'err' });
  const nameIn = el('input', { type: 'text', value: p.name, class: 'wide' });
  bindField(nameIn, nameErr, validateProfileName, (v) => mutate((s) => patchProfile(s, id, { name: v.trim() })));

  // Color + badge
  const colorErr = el('div', { class: 'err' });
  const colorIn = el('input', { type: 'color', value: p.color });
  bindField(colorIn, colorErr, validateColor, (v) => mutate((s) => patchProfile(s, id, { color: v })));

  const badgeErr = el('div', { class: 'err' });
  const badgeIn = el('input', { type: 'text', value: p.badgeText, size: 4 });
  bindField(badgeIn, badgeErr, validateBadgeText, (v) => mutate((s) => patchProfile(s, id, { badgeText: v })));

  // Host patterns
  const patErr = el('div', { class: 'err' });
  const patIn = el('textarea', { value: p.hostPatterns.join('\n'), placeholder: '*.example.com\n{www,api}.example.com' });
  const preview = el('div', { class: 'preview' });
  const updatePreview = (text: string) => {
    const { valid } = parsePatterns(text);
    preview.textContent = valid.length ? `Applies to: ${valid.join(', ')}` : 'Applies to: all hosts';
  };
  updatePreview(patIn.value);
  bindField(
    patIn,
    patErr,
    validatePatterns,
    (v) => mutate((s) => patchProfile(s, id, { hostPatterns: parsePatterns(v).valid })),
    (v) => updatePreview(v),
  );

  // Header rules
  const tableWrap = el('div');
  const renderTable = () => {
    const current = selected();
    if (!current || current.id !== id) return;
    tableWrap.replaceChildren(buildHeaderTable(current, renderTable));
  };
  renderTable();
  const addRule = el('button', { type: 'button', textContent: '+ Add header' });
  addRule.addEventListener('click', async () => {
    await mutate((s) => {
      const cur = s.profiles.find((x) => x.id === id);
      return cur ? patchProfile(s, id, { headers: [...cur.headers, newHeaderRule()] }) : s;
    });
    renderTable();
    // Focus the new row's name input. Once focused, storage echoes of our own
    // saves no longer re-render the editor (see the onChanged listener).
    const names = tableWrap.querySelectorAll<HTMLInputElement>('input.name-input');
    names[names.length - 1]?.focus();
  });

  editorEl.replaceChildren(
    toolbar,
    field('Name', nameIn, nameErr),
    el('div', { class: 'row-inline' }, field('Color', colorIn, colorErr), field('Badge text (0–2 chars)', badgeIn, badgeErr)),
    field('Host patterns (one per line; empty = all hosts)', patIn, patErr, preview),
    el('h2', { textContent: 'Request headers' }),
    tableWrap,
    addRule,
    el(
      'section',
      { class: 'notes' },
      el('h2', { textContent: 'Notes' }),
      el(
        'ul',
        { class: 'hint' },
        el('li', {
          textContent: 'Some protected headers (e.g. Host) cannot be modified by extensions. Request headers only.',
        }),
        el('li', { textContent: '* in a host pattern matches zero or more host characters.' }),
        el('li', { textContent: '{a,b} in a host pattern matches either alternative.' }),
      ),
    ),
  );
}

function field(label: string, ...children: HTMLElement[]): HTMLElement {
  return el('div', { class: 'field' }, el('label', { textContent: label }), ...children);
}

function buildHeaderTable(p: Profile, rerender: () => void): HTMLElement {
  const dups = duplicateHeaderNames(p.headers);
  const table = el('table');
  table.append(
    el(
      'thead',
      {},
      el('tr', {}, ...['On', 'Op', 'Name', 'Value', ''].map((t) => el('th', { textContent: t }))),
    ),
  );
  const body = el('tbody');
  const rows: { tr: HTMLTableRowElement; rule: HeaderRule }[] = [];

  const refreshDupMarks = (headers: HeaderRule[]) => {
    const d = duplicateHeaderNames(headers);
    for (const { tr, rule } of rows) {
      const h = headers.find((x) => x.id === rule.id) ?? rule;
      tr.classList.toggle('dup', h.enabled && d.has(h.name.trim().toLowerCase()));
    }
    warn.textContent = d.size
      ? `Duplicate header names (${[...d].join(', ')}): the last enabled rule wins.`
      : '';
  };
  const warn = el('div', { class: 'warning-text' });

  /** Patches one rule in storage; re-syncs the local copy for dup detection. */
  const patchRule = async (ruleId: string, patch: Partial<HeaderRule>) => {
    await mutate((s) => {
      const cur = s.profiles.find((x) => x.id === p.id);
      if (!cur) return s;
      return patchProfile(s, p.id, {
        headers: cur.headers.map((h) => (h.id === ruleId ? { ...h, ...patch } : h)),
      });
    });
    refreshDupMarks(selected()?.headers ?? []);
  };

  for (const rule of p.headers) {
    const tr = el('tr');
    if (rule.enabled && dups.has(rule.name.trim().toLowerCase())) tr.classList.add('dup');

    const enabled = el('input', { type: 'checkbox', checked: rule.enabled, title: 'Enabled' });
    enabled.addEventListener('change', () => void patchRule(rule.id, { enabled: enabled.checked }));

    const op = el('select');
    for (const o of ['set', 'remove'] as const) op.append(el('option', { value: o, textContent: o, selected: rule.op === o }));
    const valueIn = el('input', { type: 'text', value: rule.value, placeholder: 'value' });
    valueIn.disabled = rule.op === 'remove';
    op.addEventListener('change', () => {
      valueIn.disabled = op.value === 'remove';
      void patchRule(rule.id, { op: op.value as HeaderRule['op'] });
    });

    const nameErr = el('div', { class: 'err' });
    const nameIn = el('input', { type: 'text', value: rule.name, placeholder: 'X-Header', class: 'name-input' });
    // An empty name is only "in progress": don't flag it, just don't apply it.
    bindField(
      nameIn,
      nameErr,
      (v) => (v === '' ? null : validateHeaderName(v)),
      (v) => patchRule(rule.id, { name: v }),
    );

    bindField(valueIn, el('div'), () => null, (v) => patchRule(rule.id, { value: v }));

    const remove = el('button', { type: 'button', class: 'icon-btn', textContent: '✕', title: 'Delete header' });
    remove.addEventListener('click', async () => {
      await mutate((s) => {
        const cur = s.profiles.find((x) => x.id === p.id);
        return cur ? patchProfile(s, p.id, { headers: cur.headers.filter((h) => h.id !== rule.id) }) : s;
      });
      rerender();
    });

    tr.append(
      el('td', { class: 'narrow' }, enabled),
      el('td', { class: 'narrow' }, op),
      el('td', {}, nameIn, nameErr),
      el('td', {}, valueIn),
      el('td', { class: 'narrow' }, remove),
    );
    body.append(tr);
    rows.push({ tr, rule });
  }

  if (p.headers.length === 0) {
    body.append(el('tr', {}, el('td', { colSpan: 5, class: 'empty', textContent: 'No headers yet.' })));
  }
  table.append(body);
  warn.textContent = dups.size
    ? `Duplicate header names (${[...dups].join(', ')}): the last enabled rule wins.`
    : '';
  return el('div', {}, table, warn);
}

// ---------- sync with storage ----------

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (STATE_KEY in changes) {
    void loadState().then((next) => {
      state = next;
      if (!selected()) selectedId = state.profiles[0]?.id ?? null;
      renderList();
      // While the user is typing in an editor field, our own debounced save
      // echoes back here; re-rendering would steal focus and caret position.
      const focused = document.activeElement;
      const typing =
        focused !== null &&
        editorEl.contains(focused) &&
        (focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement);
      if (!typing) renderEditor();
    });
  }
  if (STATUS_KEY in changes) void refreshStatus();
});

browser.permissions.onAdded?.addListener(() => void refreshPermission());
browser.permissions.onRemoved?.addListener(() => void refreshPermission());

async function init(): Promise<void> {
  $('version').textContent = `Version ${browser.runtime.getManifest().version}`;
  state = await loadState();
  selectedId = state.activeProfileId ?? state.profiles[0]?.id ?? null;
  renderList();
  renderEditor();
  await Promise.all([refreshPermission(), refreshStatus()]);
}

void init();
