/**
@license
Copyright (c) 2019 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt The complete set of authors may be found at
http://polymer.github.io/AUTHORS.txt The complete set of contributors may be
found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by Google as
part of the polymer project is also subject to an additional IP rights grant
found at http://polymer.github.io/PATENTS.txt
*/

export const supportsAdoptingStyleSheets =
    ('adoptedStyleSheets' in Document.prototype) &&
    ('replace' in CSSStyleSheet.prototype);

const constructionToken = Symbol();

export class CSSResult {
  _styleSheet?: CSSStyleSheet|null;
  _objectURL?: string;

  readonly cssText: string;

  constructor(cssText: string, safeToken: symbol) {
    if (safeToken !== constructionToken) {
      throw new Error(
          'CSSResult is not constructable. Use `unsafeCSS` or `css` instead.');
    }
    this.cssText = cssText;
  }

  // Note, this is a getter so that it's lazy. In practice, this means
  // stylesheets are not created until the first element instance is made.
  get styleSheet(): CSSStyleSheet|null {
    if (this._styleSheet === undefined) {
      // Note, if `adoptedStyleSheets` is supported then we assume CSSStyleSheet
      // is constructable.
      if (supportsAdoptingStyleSheets) {
        this._styleSheet = new CSSStyleSheet();
        this._styleSheet.replaceSync(this.cssText);
      } else {
        this._styleSheet = null;
      }
    }
    return this._styleSheet;
  }

  createLink(): HTMLStyleElement {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    if (this._objectURL === undefined) {
      const blob = new Blob([this.cssText], {type: 'text/css'});
      link.href = this._objectURL = URL.createObjectURL(blob);
      URL.revokeObjectURL(this._objectURL);
    } else {
      link.href = this._objectURL;
    }
    return link;
  }

  toString(): string {
    return this.cssText;
  }
}

/**
 * Wrap a value for interpolation in a css tagged template literal.
 *
 * This is unsafe because untrusted CSS text can be used to phone home
 * or exfiltrate data to an attacker controlled site. Take care to only use
 * this with trusted input.
 */
export const unsafeCSS = (value: unknown) => {
  return new CSSResult(String(value), constructionToken);
};

const textFromCSSResult = (value: CSSResult|number) => {
  if (value instanceof CSSResult) {
    return value.cssText;
  } else if (typeof value === 'number') {
    return value;
  } else {
    throw new Error(
        `Value passed to 'css' function must be a 'css' function result: ${
            value}. Use 'unsafeCSS' to pass non-literal values, but
            take care to ensure page security.`);
  }
};

/**
 * Template tag which which can be used with LitElement's `style` property to
 * set element styles. For security reasons, only literal string values may be
 * used. To incorporate non-literal values `unsafeCSS` may be used inside a
 * template string part.
 */
export const css =
    (strings: TemplateStringsArray, ...values: (CSSResult|number)[]) => {
      const cssText = values.reduce(
          (acc, v, idx) => acc + textFromCSSResult(v) + strings[idx + 1],
          strings[0]);
      return new CSSResult(cssText, constructionToken);
    };
