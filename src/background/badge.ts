import type { Profile } from '../shared/types';

/**
 * Shown when a profile has no badge text. The browser sizes the badge to its
 * text, so a plain space collapses to a thin sliver. Figure spaces (U+2007)
 * are non-collapsing and as wide as a digit, which gives a full-height chip
 * while drawing nothing visible.
 */
export const EMPTY_BADGE_TEXT = '\u2007\u2007';

/** Returns '#000000' or '#ffffff', whichever contrasts better with `hex`. */
export function contrastColor(hex: string): '#000000' | '#ffffff' {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return '#ffffff';
  const lin = (h: string) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * lin(m[1]!) + 0.7152 * lin(m[2]!) + 0.0722 * lin(m[3]!);
  // Contrast ratio against white vs black.
  return 1.05 / (L + 0.05) > (L + 0.05) / 0.05 ? '#ffffff' : '#000000';
}

/** `setBadgeTextColor` is Firefox-only; Chromium picks a contrasting color itself. */
async function setBadgeTextColor(action: typeof browser.action, color: string): Promise<void> {
  if (typeof action.setBadgeTextColor === 'function') await action.setBadgeTextColor({ color });
}

export async function updateBadge(profile: Profile | null, error: string | null): Promise<void> {
  const action = browser.action;
  if (error) {
    await action.setBadgeText({ text: '!' });
    await action.setBadgeBackgroundColor({ color: '#c53030' });
    await setBadgeTextColor(action, '#ffffff');
    await action.setTitle({ title: `HeaderPup: error – ${error}` });
    return;
  }
  if (!profile) {
    await action.setBadgeText({ text: '' });
    await action.setTitle({ title: 'HeaderPup: Off' });
    return;
  }
  await action.setBadgeText({ text: profile.badgeText || EMPTY_BADGE_TEXT });
  await action.setBadgeBackgroundColor({ color: profile.color });
  await setBadgeTextColor(action, contrastColor(profile.color));
  await action.setTitle({ title: `HeaderPup: ${profile.name}` });
}
