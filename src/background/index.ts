import { hasStoredState, loadState, saveState, saveStatus, starterState } from '../shared/storage';
import { STATE_KEY } from '../shared/types';
import { updateBadge } from './badge';
import { apply } from './rules';

/**
 * Rebuilds DNR rules and the badge from stored state. Calls are serialized so
 * rapid state changes can never interleave their getDynamicRules/update steps.
 */
let queue: Promise<void> = Promise.resolve();

function refresh(): Promise<void> {
  queue = queue.then(doRefresh, doRefresh);
  return queue;
}

async function doRefresh(): Promise<void> {
  const state = await loadState();
  let error: string | null = null;
  try {
    await apply(state);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    console.error('HeaderPup: failed to apply rules', e);
  }
  await saveStatus({ error, at: Date.now() });
  const active = state.profiles.find((p) => p.id === state.activeProfileId) ?? null;
  await updateBadge(active, error);
}

async function cycleProfile(): Promise<void> {
  const state = await loadState();
  const ids = [null, ...state.profiles.map((p) => p.id)];
  const i = ids.indexOf(state.activeProfileId);
  const next = ids[(i + 1) % ids.length] ?? null;
  await saveState({ ...state, activeProfileId: next });
  // storage.onChanged triggers the refresh.
}

browser.runtime.onInstalled.addListener((details) => {
  void (async () => {
    // Seed example profiles only on a genuine first install with no stored
    // data, so updates and users who deleted their profiles are untouched.
    if (details.reason === 'install' && !(await hasStoredState())) {
      await saveState(starterState());
    }
    await refresh();
  })();
});
browser.runtime.onStartup.addListener(() => void refresh());

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && STATE_KEY in changes) void refresh();
});

browser.commands.onCommand.addListener((command) => {
  if (command === 'cycle-profile') void cycleProfile();
});

// Event pages can be woken for any reason; make sure rules match state.
void refresh();
