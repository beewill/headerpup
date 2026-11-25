import { MAX_BADGE_TEXT, MAX_HOST_PATTERNS } from './types';

/** `null` means valid; otherwise an error message. */
export type ValidationResult = string | null;

const HEADER_TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
// Characters allowed in a host glob: DNS label chars, dots, wildcard.
// Brace groups are validated separately and expanded to label characters only.
const HOST_PATTERN = /^[A-Za-z0-9*_-]+(\.[A-Za-z0-9*_-]+)*$/;
const BRACE_GROUP = /\{([^{}]*)\}/g;

export function validateProfileName(name: string): ValidationResult {
  return name.trim().length === 0 ? 'Name is required.' : null;
}

export function validateColor(color: string): ValidationResult {
  return HEX_COLOR.test(color) ? null : 'Color must look like #rrggbb.';
}

export function validateBadgeText(text: string): ValidationResult {
  // Count code points so an emoji counts as one character.
  return [...text].length <= MAX_BADGE_TEXT
    ? null
    : `Badge text must be at most ${MAX_BADGE_TEXT} characters.`;
}

export function validateHeaderName(name: string): ValidationResult {
  if (name.length === 0) return 'Header name is required.';
  return HEADER_TOKEN.test(name)
    ? null
    : 'Header name may only contain letters, digits and !#$%&\'*+.^_`|~-';
}

export function validateHostPattern(pattern: string): ValidationResult {
  if (pattern.length === 0) return 'Pattern is empty.';
  if (/[\s:/]/.test(pattern)) return 'Use a bare host (no scheme, port or path).';

  // Check brace groups ({a,b}), then validate the rest as a plain glob by
  // substituting each group with a placeholder label.
  let braceError: ValidationResult = null;
  const flattened = pattern.replace(BRACE_GROUP, (_m, body: string) => {
    const alternatives = body.split(',');
    if (alternatives.some((a) => a.length === 0)) braceError ??= 'Empty alternative in {…} group.';
    else if (alternatives.some((a) => !/^[A-Za-z0-9*._-]+$/.test(a))) braceError ??= 'Invalid characters in {…} group.';
    return 'x';
  });
  if (braceError) return braceError;
  if (/[{}]/.test(flattened)) return 'Unbalanced or nested braces in host pattern.';
  return HOST_PATTERN.test(flattened) ? null : 'Invalid characters in host pattern.';
}

export type PatternsValidation = {
  /** Trimmed, non-empty lines that passed validation (deduplicated, order kept). */
  valid: string[];
  errors: { line: number; pattern: string; message: string }[];
  tooMany: boolean;
};

export function parsePatterns(text: string): PatternsValidation {
  const valid: string[] = [];
  const errors: PatternsValidation['errors'] = [];
  const seen = new Set<string>();
  text.split(/\r?\n/).forEach((raw, i) => {
    const pattern = raw.trim();
    if (!pattern) return;
    const message = validateHostPattern(pattern);
    if (message) {
      errors.push({ line: i + 1, pattern, message });
      return;
    }
    const key = pattern.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    valid.push(pattern);
  });
  return { valid, errors, tooMany: valid.length > MAX_HOST_PATTERNS };
}

export function validatePatterns(text: string): ValidationResult {
  const { errors, tooMany } = parsePatterns(text);
  if (tooMany) return `At most ${MAX_HOST_PATTERNS} patterns are allowed.`;
  const first = errors[0];
  return first ? `Line ${first.line}: ${first.message}` : null;
}
