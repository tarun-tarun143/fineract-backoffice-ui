/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Injectable, computed, inject } from '@angular/core';
import { ConfigService } from './config.service';

/**
 * Design tokens a deployment may set, and the published contract for doing so.
 *
 * This list is API. Once 1.0 ships, removing a name from it breaks deployments that were told
 * they could use it, so it starts as the smallest set that answers the actual request — "our
 * colours, our density" — rather than every custom property the stylesheet happens to declare.
 * Growing the list later is additive and cheap; shrinking it is a breaking change.
 *
 * Names are given without the leading `--`, which is how they read in the config file.
 */
export const BRANDABLE_TOKENS: readonly string[] = [
  // Colour
  'primary-color',
  'primary-dark',
  'primary-strong',
  'secondary-color',
  'bg-color',
  'card-bg',
  'text-color',
  'text-muted',
  'error-color',
  'success-color',
  'warning-color',
  'border-color',
  // Shape and density
  'border-radius',
  'header-height',
  'sidebar-width',
  'content-padding',
];

const BRANDABLE = new Set(BRANDABLE_TOKENS);

/**
 * Tokens `_common.scss` gives a different value under `[data-theme='dark']`.
 *
 * These must not carry a deployment's light value into dark mode. Several change *role* between
 * themes rather than just shade — `--secondary-color` is the sidebar ground in light and a
 * near-white foreground in dark — so leaking the light value paints navy text on a near-black
 * page. Everything else (lengths, and the colours the application does not re-theme) is
 * theme-independent and applies to both.
 */
const THEME_SCOPED = new Set([
  'primary-color',
  'primary-dark',
  'secondary-color',
  'bg-color',
  'card-bg',
  'text-color',
  'text-muted',
  'border-color',
]);

/**
 * Smallest contrast a deployment's colour may have against the text drawn on it.
 *
 * WCAG 2.1 AA for normal text. Checked rather than trusted because the people setting these are,
 * by design, not developers: picking a colour that reads well on a swatch and fails as a button
 * background is the ordinary outcome, not an unusual one.
 */
export const MIN_PRIMARY_CONTRAST = 4.5;

/**
 * Fills the application's own stylesheets pair with a literal `#fff`, and the only tokens with a
 * contrast floor.
 *
 * These have no contrast variable to flip — `sidebar.component.ts` writes `color: #fff` next to
 * `background-color: var(--secondary-color)` — so the colour itself has to carry white, and a
 * light value is refused however well it would read with dark text.
 *
 * Every other colour is accepted as given, which is a result rather than an omission: their
 * label colour is derived (see {@link bestLabelFor}), and white and black are the extremes of
 * the WCAG formula, so the better of the two is worst where they meet — 4.58:1, still above the
 * 4.5:1 AA threshold. No colour can fail, so a floor there would be unreachable code. The payoff
 * is in dark mode, where a lighter accent is normal and a white-only rule would forbid it.
 */
const REQUIRES_WHITE_TEXT = new Set(['secondary-color', 'primary-strong']);

/** `#rgb` or `#rrggbb` — the two forms a colour input and a human both produce. */
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Splits a CSS length into its number and unit. One character class with a bounded quantifier,
 * so there is no nested repetition for a hostile value to backtrack through; the number itself
 * is validated by `Number` below, which also rejects shapes a pattern would accept, like `1.2.3`.
 */
const LENGTH_PARTS = /^(-?[\d.]{1,12})(px|rem|em|%)?$/;

/**
 * Whether a value may be written into a style declaration as a length. Deliberately narrow:
 * anything not obviously a length has no business there.
 */
function isCssLength(value: string): boolean {
  const parts = LENGTH_PARTS.exec(value);
  return parts !== null && Number.isFinite(Number(parts[1]));
}

/** An asset path this deployment may name. Same-origin only — see BrandingConfig. */
const SAFE_ASSET_PATH = /^\w[\w./-]*$/;

/** Something wrong with the deployment's `branding` block, surfaced rather than swallowed. */
export interface BrandingDefect {
  code: 'unknown-token' | 'invalid-value' | 'low-contrast' | 'unsafe-asset-path';
  /** The token name or config key involved. */
  key: string;
  detail: string;
}

export function normalizeHex(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!HEX.test(trimmed)) return null;
  const digits = trimmed.slice(1);
  return digits.length === 3
    ? `#${digits
        .split('')
        .map((d) => d + d)
        .join('')}`
    : trimmed;
}

/** Relative luminance per WCAG 2.1, for a normalised `#rrggbb`. */
function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio of a normalised `#rrggbb` against white, per WCAG 2.1. */
export function contrastWithWhite(hex: string): number {
  return 1.05 / (relativeLuminance(hex) + 0.05);
}

/** Contrast ratio against black. */
export function contrastWithBlack(hex: string): number {
  return (relativeLuminance(hex) + 0.05) / 0.05;
}

/** Whichever of white or black reads better on this fill, with the ratio it achieves. */
export function bestLabelFor(hex: string): { color: '#ffffff' | '#000000'; ratio: number } {
  const onWhite = contrastWithWhite(hex);
  const onBlack = contrastWithBlack(hex);
  return onWhite >= onBlack
    ? { color: '#ffffff', ratio: onWhite }
    : { color: '#000000', ratio: onBlack };
}

/**
 * Validates one token value, returning the value to apply or `null` to skip it.
 *
 * Rejection is never silent — every path that returns `null` records a defect first.
 */
function validateToken(name: string, raw: string, defects: BrandingDefect[]): string | null {
  if (!BRANDABLE.has(name)) {
    defects.push({
      code: 'unknown-token',
      key: name,
      detail: `Not a brandable token. See BRANDABLE_TOKENS for the ${BRANDABLE_TOKENS.length} that are.`,
    });
    return null;
  }

  const value = String(raw).trim();

  if (name.endsWith('-color') || name.startsWith('primary') || name === 'card-bg') {
    const hex = normalizeHex(value);
    if (!hex) {
      defects.push({
        code: 'invalid-value',
        key: name,
        detail: `Expected a hex colour such as "#0b5f8a"; got ${JSON.stringify(raw)}.`,
      });
      return null;
    }
    // Refused, not warned-and-applied. An unreadable fill is non-compliant for the institution
    // and invisible to the person who chose it.
    if (REQUIRES_WHITE_TEXT.has(name)) {
      const ratio = contrastWithWhite(hex);
      if (ratio < MIN_PRIMARY_CONTRAST) {
        defects.push({
          code: 'low-contrast',
          key: name,
          detail:
            `${hex} scores ${ratio.toFixed(2)}:1 against white, below the ${MIN_PRIMARY_CONTRAST}:1 ` +
            'WCAG AA floor. This fill carries white text that no variable can change, so it ' +
            'needs a darker colour. Keeping the shipped one.',
        });
        return null;
      }
    }
    return hex;
  }

  if (!isCssLength(value)) {
    defects.push({
      code: 'invalid-value',
      key: name,
      detail: `Expected a CSS length such as "8px"; got ${JSON.stringify(raw)}.`,
    });
    return null;
  }
  return value;
}

/**
 * Token names that also drive an Ionic colour, and the Ionic name they drive.
 *
 * `_ionic-theme.scss` points `--ion-color-<name>` at these tokens, but Ionic needs four more
 * values per colour that CSS cannot derive from a hex: the rgb triple for alpha compositing, and
 * a shade and tint for pressed and hover states. Left at the shipped values, a rebranded button
 * renders in the deployment's colour and ripples in Fineract blue.
 */
const IONIC_COLOR_FOR_TOKEN: Readonly<Record<string, string>> = {
  'primary-color': 'primary',
  'secondary-color': 'secondary',
  'success-color': 'success',
  'warning-color': 'warning',
  'error-color': 'danger',
};

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function toHex(parts: number[]): string {
  return `#${parts
    .map((c) =>
      Math.max(0, Math.min(255, Math.round(c)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** Ionic's own ratios: a shade is 12% toward black, a tint 10% toward white. */
function shadeOf(hex: string): string {
  return toHex(channels(hex).map((c) => c * 0.88));
}

function tintOf(hex: string): string {
  return toHex(channels(hex).map((c) => c + (255 - c) * 0.1));
}

/** The `--ion-color-*` declarations that must accompany an overridden colour token. */
function ionicCompanions(name: string, hex: string): [string, string][] {
  const ionName = IONIC_COLOR_FOR_TOKEN[name];
  if (!ionName) return [];
  const label = bestLabelFor(hex);
  return [
    [`--ion-color-${ionName}-rgb`, channels(hex).join(', ')],
    [`--ion-color-${ionName}-shade`, shadeOf(hex)],
    [`--ion-color-${ionName}-tint`, tintOf(hex)],
    [`--ion-color-${ionName}-contrast`, label.color],
    [`--ion-color-${ionName}-contrast-rgb`, channels(label.color).join(', ')],
  ];
}

/**
 * One CSS rule for a token set, or `null` when nothing in it survived validation.
 *
 * Each colour brings its Ionic companions with it, so a rebranded button ripples and labels in
 * the deployment's colour rather than the shipped one.
 */
function declarationsFor(
  tokens: Record<string, string>,
  defects: BrandingDefect[],
  selector: string,
): string | null {
  const declarations = Object.entries(tokens)
    .map(([name, raw]) => [name, validateToken(name, raw, defects)] as const)
    .filter((entry): entry is readonly [string, string] => entry[1] !== null)
    .flatMap(([name, value]) => [
      `  --${name}: ${value};`,
      ...ionicCompanions(name, value).map(([prop, companion]) => `  ${prop}: ${companion};`),
    ]);

  return declarations.length > 0 ? `${selector} {\n${declarations.join('\n')}\n}` : null;
}

function validateAssetPath(key: string, raw: string, defects: BrandingDefect[]): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (!SAFE_ASSET_PATH.test(value)) {
    defects.push({
      code: 'unsafe-asset-path',
      key,
      detail:
        `${JSON.stringify(raw)} is not a same-origin path. Absolute URLs are not accepted: the ` +
        "deployed CSP is img-src 'self' data:, so an off-origin asset would not render. Mount " +
        'the file into the image and name it relatively, e.g. "branding/logo.svg".',
    });
    return null;
  }
  return value;
}

/**
 * Applies the deployment's branding.
 *
 * Colours reach the application as CSS custom properties rather than through any component,
 * because `styles/_common.scss` already declares the whole token set on `:root` and
 * `_ionic-theme.scss` maps `--ion-color-*` onto it. Overwriting a handful of properties therefore
 * recolours Ionic and the application's own chrome together, with nothing to keep in step.
 *
 * Dark-mode values cannot be set the same way: an inline style on `documentElement` has no
 * selector, and the dark palette lives under `[data-theme='dark']`. They go into one injected
 * stylesheet instead, which is also why they are applied as a block rather than property by
 * property.
 */
@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly config = inject(ConfigService);

  private readonly branding = computed(() => this.config.config().branding ?? {});
  private readonly defects: BrandingDefect[] = [];

  /** Product name for the header and document title. */
  readonly appName = computed(() => this.branding().appName?.trim() || null);

  /** Header logo for the active theme, or `null` to use the shipped mark. */
  readonly logoUrl = computed(() => this.branding().logoUrl?.trim() || null);
  readonly logoDarkUrl = computed(() => this.branding().logoDarkUrl?.trim() || this.logoUrl());

  /**
   * Problems found in the `branding` block — an unknown token, a malformed value, a colour that
   * fails the contrast floor. Read by the startup diagnostics so a typo in a deployment's config
   * does not present as a feature that simply did not work.
   */
  readonly brandingDefects = (): readonly BrandingDefect[] => this.defects;

  /** Called once from the app initialiser, after `ConfigService.loadConfig()` resolves. */
  apply(doc: Document = document): void {
    this.defects.length = 0;
    const branding = this.branding();

    this.applyTokens(doc, branding.tokens?.light ?? {}, branding.tokens?.dark ?? {});
    // No `document.title` here: `TranslatedTitleStrategy` rewrites it on every navigation and
    // reads `appName` from this service instead.
    this.applyFavicon(doc, branding.faviconUrl);

    for (const defect of this.defects) {
      console.warn(`[branding] ${defect.code} (${defect.key}): ${defect.detail}`);
    }
  }

  private applyTokens(
    doc: Document,
    light: Record<string, string>,
    dark: Record<string, string>,
  ): void {
    const lightEntries = Object.entries(light);
    const themeScoped = lightEntries.filter(([name]) => THEME_SCOPED.has(name));
    const themeFree = lightEntries.filter(([name]) => !THEME_SCOPED.has(name));

    const rules = [
      // Applies in both themes: nothing here is re-themed by the application.
      declarationsFor(Object.fromEntries(themeFree), this.defects, ':root'),
      // `:not([data-theme='dark'])` is load-bearing. This stylesheet is appended after the
      // application's own, and `:root` ties with `[data-theme='dark']` on specificity, so a plain
      // `:root` here would beat the dark palette and win in dark mode too.
      declarationsFor(
        Object.fromEntries(themeScoped),
        this.defects,
        ":root:not([data-theme='dark'])",
      ),
      declarationsFor(dark, this.defects, "[data-theme='dark']"),
    ].filter((rule) => rule !== null);

    if (rules.length === 0) return;

    // One stylesheet holding every theme, appended to head, replaced wholesale so re-applying is
    // idempotent.
    //
    // Not inline styles on documentElement, which is what this did first. An inline style beats
    // every stylesheet rule regardless of specificity, so a light `--primary-color` set that way
    // silently outranked the dark block and dark-mode branding never applied at all.
    const id = 'fineract-branding';
    const style = doc.getElementById(id) ?? doc.createElement('style');
    style.id = id;
    style.textContent = rules.join('\n\n');
    if (!style.isConnected) {
      doc.head.append(style);
    }
  }

  private applyFavicon(doc: Document, faviconUrl: string | undefined): void {
    if (!faviconUrl) return;
    const href = validateAssetPath('faviconUrl', faviconUrl, this.defects);
    if (!href) return;

    const link =
      doc.querySelector<HTMLLinkElement>("link[rel='icon']") ?? doc.createElement('link');
    link.rel = 'icon';
    link.href = href;
    if (!link.isConnected) {
      doc.head.append(link);
    }
  }

  /** Validates a configured logo path, recording a defect and returning `null` when unusable. */
  resolveLogo(url: string | null): string | null {
    return url ? validateAssetPath('logoUrl', url, this.defects) : null;
  }
}
