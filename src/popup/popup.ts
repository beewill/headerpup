import { hasHostPermission, requestHostPermission } from '../shared/permissions';
import { loadState, updateState } from '../shared/storage';
import { STATE_KEY, type State } from '../shared/types';

const list = document.getElementById('list') as HTMLUListElement;
const permission = document.getElementById('permission') as HTMLDivElement;

function row(opts: {
  color: string | null;
  name: string;
  count: number | null;
  active: boolean;
  onClick: () => void;
}): HTMLLIElement {
  const li = document.createElement('li');
  li.setAttribute('role', 'option');
  li.setAttribute('aria-selected', String(opts.active));
  li.tabIndex = 0;
  if (opts.active) li.classList.add('active');

  const swatch = document.createElement('span');
  swatch.className = 'swatch' + (opts.color ? '' : ' off');
  if (opts.color) swatch.style.background = opts.color;

  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = opts.name;

  li.append(swatch, name);
  if (opts.count !== null) {
    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = `${opts.count} header${opts.count === 1 ? '' : 's'}`;
    li.append(count);
  }

  li.addEventListener('click', opts.onClick);
  li.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      opts.onClick();
    }
  });
  return li;
}

async function activate(id: string | null): Promise<void> {
  await updateState((s) => ({ ...s, activeProfileId: id }));
}

function render(state: State): void {
  list.replaceChildren(
    row({ color: null, name: 'Off', count: null, active: state.activeProfileId === null, onClick: () => void activate(null) }),
    ...state.profiles.map((p) =>
      row({
        color: p.color,
        name: p.name,
        count: p.headers.filter((h) => h.enabled).length,
        active: p.id === state.activeProfileId,
        onClick: () => void activate(p.id),
      }),
    ),
  );
  if (state.profiles.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No profiles yet. Create one in the options page.';
    list.append(li);
  }
}

async function refreshPermission(): Promise<void> {
  permission.hidden = await hasHostPermission();
}

document.getElementById('grant')!.addEventListener('click', async () => {
  await requestHostPermission();
  await refreshPermission();
});

document.getElementById('options')!.addEventListener('click', (e) => {
  e.preventDefault();
  void browser.runtime.openOptionsPage().then(() => window.close());
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && STATE_KEY in changes) void loadState().then(render);
});

void loadState().then(render);
void refreshPermission();
