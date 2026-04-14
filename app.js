/**
 * Pumping Lemma Visualizer — app.js
 * ==================================
 * Theory of Computation: Pumping Lemma for Regular Languages
 *
 * PUMPING LEMMA (statement)
 * ─────────────────────────
 * If L is a regular language, ∃ pumping length p ≥ 1 such that every string
 * s ∈ L with |s| ≥ p can be written s = xyz where:
 *   (i)   |xy| ≤ p
 *   (ii)  |y| ≥ 1
 *   (iii) ∀ i ≥ 0, xyⁱz ∈ L
 *
 * PROOF STRATEGY (contradiction)
 * ────────────────────────────────────────
 * 1. Assume L is regular.
 * 2. Let p be the pumping length.
 * 3. Pick witness s ∈ L with |s| ≥ p (user types this).
 * 4. Show every valid partition s = xyz has some i with xyⁱz ∉ L.
 * 5. Contradicts (iii). ∴ L is not regular. □
 */

'use strict';

/* ─── Preset definitions ────────────────────────────────────────────────── */
const PRESETS = {
  anbn: {
    label: '{ aⁿbⁿ | n ≥ 0 }',
    sample: p => 'a'.repeat(p) + 'b'.repeat(p),
    test: w => {
      const a = (w.match(/a/g) || []).length;
      const b = (w.match(/b/g) || []).length;
      return /^a*b*$/.test(w) && a === b;
    },
  },
  anbncn: {
    label: '{ aⁿbⁿcⁿ | n ≥ 0 }',
    sample: p => 'a'.repeat(p) + 'b'.repeat(p) + 'c'.repeat(p),
    test: w => {
      const a = (w.match(/a/g) || []).length;
      const b = (w.match(/b/g) || []).length;
      const c = (w.match(/c/g) || []).length;
      return /^a*b*c*$/.test(w) && a === b && b === c;
    },
  },
  ww: {
    label: '{ ww | w ∈ {a,b}* }',
    sample: p => { const h = 'ab'.repeat(Math.ceil(p / 2)).slice(0, p); return h + h; },
    test: w => {
      if (w.length % 2 !== 0) return false;
      const h = w.length / 2;
      return w.slice(0, h) === w.slice(h);
    },
  },
  an2: {
    label: '{ aⁿ² | n ≥ 0 }',
    sample: p => 'a'.repeat(p * p),
    test: w => {
      if (!/^a*$/.test(w)) return false;
      const n = Math.round(Math.sqrt(w.length));
      return n * n === w.length;
    },
  },
};

/* ─── State ─────────────────────────────────────────────────────────────── */
let activeKey = null;   // currently selected language key ('anbn', 'custom', …)
let hasInitializedCustom = false;
let customExtraCheck = null;
let customSampleIsAuto = false;

const EXPRESSION_PRESETS = {
  anbn: {
    label: '{ aⁿbⁿ | n ≥ 0 }',
    expression: 'a^n b^n',
    regex: '^a*b*$',
    count: { left: 'a', op: 'eq', right: 'b' },
    half: false,
    perfSq: false,
    sample: p => 'a'.repeat(p) + 'b'.repeat(p),
  },
  anbncn: {
    label: '{ aⁿbⁿcⁿ | n ≥ 0 }',
    expression: 'a^n b^n c^n',
    regex: '^a*b*c*$',
    count: { left: 'a', op: 'eq', right: 'b' },
    secondCount: { left: 'b', op: 'eq', right: 'c' },
    half: false,
    perfSq: false,
    sample: p => 'a'.repeat(p) + 'b'.repeat(p) + 'c'.repeat(p),
  },
  ww: {
    label: '{ ww | w ∈ {a,b}* }',
    expression: 'ww',
    regex: '^[ab]*$',
    count: null,
    half: true,
    perfSq: false,
    sample: p => { const h = 'ab'.repeat(Math.ceil(p / 2)).slice(0, p); return h + h; },
  },
  an2: {
    label: '{ aⁿ² | n ≥ 0 }',
    expression: 'a^(n^2)',
    regex: '^a*$',
    count: null,
    half: false,
    perfSq: true,
    sample: p => 'a'.repeat(p * p),
  },
};

/* ─── DOM refs ──────────────────────────────────────────────────────────── */
const langGrid       = document.getElementById('lang-grid');
const customBuilder  = document.getElementById('custom-builder');
const customLangLbl  = document.getElementById('custom-lang-label');
const sampleInput    = document.getElementById('sample-string');
const pumpInput      = document.getElementById('pump-input');
const runBtn         = document.getElementById('run-btn');
const errorBar       = document.getElementById('lang-error');

const stringSection  = document.getElementById('string-section');
const stringDesc     = document.getElementById('string-desc');
const stringVisual   = document.getElementById('string-visual');
const partSect       = document.getElementById('partitions-section');
const partList       = document.getElementById('partitions-list');
const logSection     = document.getElementById('log-section');
const logEl          = document.getElementById('log');
const verdictEl      = document.getElementById('verdict');

// Constraint inputs
const cRegex   = document.getElementById('c-regex');
const cRegexV  = document.getElementById('c-regex-val');
const cCount   = document.getElementById('c-count');
const cChar1   = document.getElementById('c-char1');
const cCountOp = document.getElementById('c-count-op');
const cChar2   = document.getElementById('c-char2');
const cHalf    = document.getElementById('c-half');
const cPerfSq  = document.getElementById('c-perfsq');
const exampleSelect = document.getElementById('example-select');
const exampleCustomBtn = document.getElementById('example-custom-btn');
const customExpressionInput = document.getElementById('custom-expression');
const customClearBtn = document.getElementById('custom-clear');
const symbolGrid = document.getElementById('symbol-grid');
const detectBanner = document.getElementById('detect-banner');

/* ─── Language card selection ───────────────────────────────────────────── */
langGrid.addEventListener('click', e => {
  const card = e.target.closest('.lang-card');
  if (!card) return;

  const key = card.dataset.key;
  selectLanguage(key);
});

function selectLanguage(key) {
  activeKey = key;

  // Update card aria-pressed states
  langGrid.querySelectorAll('.lang-card').forEach(c => {
    c.setAttribute('aria-pressed', c.dataset.key === key ? 'true' : 'false');
  });

  // Show/hide custom builder
  customBuilder.hidden = (key !== 'custom');

  // Auto-fill sample string for presets
  if (key !== 'custom' && PRESETS[key]) {
    const p = parseInt(pumpInput.value, 10) || 3;
    sampleInput.value = PRESETS[key].sample(p);
    customSampleIsAuto = false;
  } else if (key === 'custom') {
    if (!hasInitializedCustom) {
      applyExpressionPreset('anbn');
      hasInitializedCustom = true;
    }
    analyzeCustomExpression();
    sampleInput.focus();
  }

  runBtn.disabled = false;
  hideError();
  resetResults();
}

// Re-generate preset sample when p changes
pumpInput.addEventListener('change', () => {
  const p = Math.max(1, Math.min(12, parseInt(pumpInput.value, 10) || 3));
  if (!activeKey) return;
  if (activeKey === 'custom') {
    if (customExpressionInput && customSampleIsAuto) {
      const parsed = parseExpressionRules(customExpressionInput.value.trim());
      if (parsed && typeof parsed.sample === 'function') {
        setCustomAutoSample(parsed.sample(p));
      }
    }
    return;
  }
  if (!PRESETS[activeKey]) return;
  sampleInput.value = PRESETS[activeKey].sample(p);
});

/* ─── Constraint checkbox toggling ──────────────────────────────────────── */
function wire(checkbox, ...controls) {
  const toggle = () => controls.forEach(el => { el.disabled = !checkbox.checked; });
  checkbox.addEventListener('change', toggle);
  toggle(); // initial state
}

wire(cRegex,  cRegexV);
wire(cCount,  cChar1, cCountOp, cChar2);

if (customExpressionInput) {
  customExpressionInput.addEventListener('input', () => {
    analyzeCustomExpression();
  });
}

if (exampleSelect) {
  exampleSelect.addEventListener('change', () => {
    const opt = exampleSelect.selectedOptions[0];
    if (!opt || !opt.value) return;

    loadExample({
      expr: opt.dataset.expr || '',
      sample: opt.dataset.sample || '',
      p: opt.dataset.p || '',
    });
  });
}

if (exampleCustomBtn) {
  exampleCustomBtn.addEventListener('click', () => {
    if (exampleSelect) exampleSelect.value = '';
    selectLanguage('custom');
    if (customExpressionInput) customExpressionInput.focus();
  });
}

sampleInput.addEventListener('input', () => {
  if (activeKey === 'custom') customSampleIsAuto = false;
});

if (customClearBtn) {
  customClearBtn.addEventListener('click', () => {
    if (customExpressionInput) {
      customExpressionInput.value = '';
      customExpressionInput.focus();
    }
    customSampleIsAuto = false;
    clearCustomRules();
    setDetectBanner('Cleared. Type a new expression or choose a preset.', 'info');
  });
}

if (symbolGrid) {
  symbolGrid.addEventListener('click', e => {
    const btn = e.target.closest('.sym-btn');
    if (!btn || !customExpressionInput) return;
    if (btn.dataset.action === 'backspace') {
      removeAtCursor(customExpressionInput);
    } else {
      insertAtCursor(customExpressionInput, btn.dataset.token || '');
    }
    customExpressionInput.dispatchEvent(new Event('input'));
    customExpressionInput.focus();
  });
}

/* ─── Run button ────────────────────────────────────────────────────────── */
runBtn.addEventListener('click', runProof);
sampleInput.addEventListener('keydown', e => { if (e.key === 'Enter') runProof(); });

function runProof() {
  hideError();
  resetResults();

  if (!activeKey) {
    showError('Please select a language first (Step 1).');
    return;
  }

  // Validate p
  const p = parseInt(pumpInput.value, 10);
  if (!Number.isInteger(p) || p < 1 || p > 12) {
    showError('Pumping length p must be a whole number between 1 and 12.');
    return;
  }

  // Get membership test
  let memberTest, label;
  if (activeKey === 'custom') {
    const result = buildCustomTest();
    if (!result.ok) { showError(result.error); return; }
    memberTest = result.fn;
    label = customLangLbl.value.trim() || '(custom language)';
  } else {
    memberTest = PRESETS[activeKey].test;
    label = PRESETS[activeKey].label;
  }

  // Validate sample string
  const s = sampleInput.value.trim();
  if (!s) {
    showError('Please enter a sample string s (Step 2).');
    return;
  }
  if (s.length < p) {
    showError(`Your string "${s}" has length ${s.length} but p = ${p}. The string must have length ≥ p.`);
    return;
  }

  // Confirm s ∈ L
  let sInLang;
  try { sInLang = memberTest(s); }
  catch (e) { showError(`Membership check crashed on "${s}": ${e.message}`); return; }

  if (!sInLang) {
    showError(`"${s}" is not in the language ${label}. The sample string must belong to L.`);
    return;
  }

  // Run
  const partitions = enumeratePartitions(s.length, p);
  renderString(s, p);
  renderPartitions(s, partitions, memberTest);
  renderLog(s, p, label, partitions, memberTest);
}

/* ─── Build membership test from constraint UI ──────────────────────────── */
/**
 * Translates the visual constraint form into a real JS function.
 * No raw JS ever exposed to the user.
 */
function buildCustomTest() {
  const conditions = [];

  if (cRegex.checked) {
    const pat = cRegexV.value.trim();
    if (!pat) return { ok: false, error: 'Enter a regex pattern for the "Matches pattern" constraint.' };
    let regex;
    try { regex = new RegExp(pat); } catch (e) { return { ok: false, error: `Invalid regex: ${e.message}` }; }
    conditions.push(w => {
      regex.lastIndex = 0;
      return regex.test(w);
    });
  }

  if (cCount.checked) {
    const ch1 = cChar1.value.trim();
    const ch2 = cChar2.value.trim();
    if (!ch1 || !ch2) return { ok: false, error: 'Fill in both characters for the count constraint.' };
    if (ch1.length !== 1 || ch2.length !== 1) return { ok: false, error: 'Use exactly one character in each count field.' };
    const op = cCountOp.value;
    const opFn = { eq: (a,b)=>a===b, lt: (a,b)=>a<b, gt: (a,b)=>a>b, lte: (a,b)=>a<=b, gte: (a,b)=>a>=b }[op];
    conditions.push(w => {
      const re1 = new RegExp(ch1.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'g');
      const re2 = new RegExp(ch2.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'g');
      return opFn((w.match(re1)||[]).length, (w.match(re2)||[]).length);
    });
  }

  if (cHalf.checked) {
    conditions.push(w => w.length % 2 === 0 && w.slice(0, w.length/2) === w.slice(w.length/2));
  }

  if (cPerfSq.checked) {
    conditions.push(w => { const n = Math.round(Math.sqrt(w.length)); return n * n === w.length; });
  }

  if (typeof customExtraCheck === 'function') {
    conditions.push(customExtraCheck);
  }

  if (conditions.length === 0) {
    return { ok: false, error: 'Check at least one condition for your custom language.' };
  }

  return { ok: true, fn: w => conditions.every(c => c(w)) };
}

function applyExpressionPreset(key) {
  const preset = EXPRESSION_PRESETS[key];
  if (!preset) return;

  if (customExpressionInput) customExpressionInput.value = preset.expression;

  applyRuleConfig({
    label: preset.label,
    regex: preset.regex,
    count: preset.count,
    half: preset.half,
    perfSq: preset.perfSq,
    extraCheck: key === 'anbncn'
      ? (w => {
          const b = (w.match(/b/g) || []).length;
          const c = (w.match(/c/g) || []).length;
          return b === c;
        })
      : null,
  });

  setCustomAutoSample(preset.sample(getPValue()));
  const tag = key === 'anbncn' ? ' + extra b=c check' : '';
  setDetectBanner(`Detected ${preset.label}. Rules auto-configured${tag}.`, 'ok');
}

function analyzeCustomExpression() {
  if (activeKey !== 'custom' || !customExpressionInput) return;

  const raw = customExpressionInput.value.trim();
  if (!raw) {
    clearCustomRules();
    setDetectBanner('Type a language rule expression to define membership.', 'info');
    return;
  }

  const parsed = parseExpressionRules(raw);
  if (!parsed) {
    clearCustomRules();
    setDetectBanner('Could not parse expression. Try: a^n b^m, regex:^a*b*$, or count(a)==count(b) && len%2==0', 'warn');
    return;
  }

  applyRuleConfig(parsed.config);

  if (parsed.sample && (customSampleIsAuto || !sampleInput.value.trim())) {
    setCustomAutoSample(parsed.sample(getPValue()));
  }

  setDetectBanner(parsed.message, parsed.tone);
}

function parseExpressionRules(raw) {
  const low = raw.toLowerCase().trim();
  const compact = normalizeExpression(raw);

  if (looksLikePrimeAPattern(raw)) {
    return {
      config: {
        label: '{ a^p | p is prime }',
        regex: '^a+$',
        count: null,
        half: false,
        perfSq: false,
        extraCheck: w => isPrimeNumber(w.length),
      },
      message: 'Detected prime-length language for a^p.',
      tone: 'ok',
      sample: p => 'a'.repeat(nextPrimeStrictlyGreaterThan(p)),
      presetKey: '',
    };
  }

  if (low.startsWith('regex:')) {
    const pattern = raw.slice(raw.indexOf(':') + 1).trim();
    if (!pattern) return null;
    return {
      config: { label: `{ w | w matches /${pattern}/ }`, regex: pattern, count: null, half: false, perfSq: false, extraCheck: null },
      message: 'Regex rule detected and auto-checked.',
      tone: 'ok',
      sample: null,
      presetKey: 'regex',
    };
  }

  const countMatch = raw.match(/count\s*\(\s*([^\s\)])\s*\)\s*(==|=|<=|>=|<|>)\s*count\s*\(\s*([^\s\)])\s*\)/i);
  if (countMatch) {
    const left = countMatch[1];
    const right = countMatch[3];
    const op = mapCountOperator(countMatch[2]);
    return {
      config: {
        label: `{ w | count(${left}) ${countMatch[2]} count(${right}) }`,
        regex: null,
        count: { left, op, right },
        half: false,
        perfSq: false,
        extraCheck: null,
      },
      message: 'Count-rule detected and auto-checked.',
      tone: 'ok',
      sample: null,
      presetKey: '',
    };
  }

  const defaultVariant = detectDefaultLanguageVariant(raw);
  if (defaultVariant) return defaultVariant;

  const powerNotation = parsePowerNotation(raw);
  if (powerNotation) return powerNotation;

  const predicate = compilePredicateExpression(raw);
  if (predicate.ok) {
    return {
      config: {
        label: `{ w | ${raw} }`,
        regex: null,
        count: null,
        half: false,
        perfSq: false,
        extraCheck: predicate.fn,
      },
      message: 'Custom predicate compiled. Pumping checks now use your typed rule directly.',
      tone: 'ok',
      sample: null,
      presetKey: '',
    };
  }

  if (looksLikeRegexPattern(raw)) {
    return {
      config: { label: `{ w | w matches /${raw}/ }`, regex: raw, count: null, half: false, perfSq: false, extraCheck: null },
      message: 'Regex-like expression detected and auto-checked as pattern.',
      tone: 'ok',
      sample: null,
      presetKey: '',
    };
  }

  return null;
}

function parsePowerNotation(raw) {
  const segments = parsePowerSegments(raw);
  if (!segments || segments.length === 0) return null;
  if (segments.some(seg => seg.exp.type === 'unsupported')) return null;

  const labelExpr = segments.map(seg => `${seg.symbol}^${seg.exp.text}`).join(' ');
  const regex = '^' + segments.map(segmentToRegex).join('') + '$';

  const extraCheck = w => {
    let pos = 0;
    const counts = [];

    for (const seg of segments) {
      let run = 0;
      while (pos < w.length && w[pos] === seg.symbol) {
        run++;
        pos++;
      }
      counts.push(run);
    }

    if (pos !== w.length) return false;

    const vars = Object.create(null);
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const count = counts[i];
      const exp = seg.exp;

      if (exp.type === 'const') {
        if (count !== exp.value) return false;
        continue;
      }

      if (exp.type === 'var') {
        if (vars[exp.name] === undefined) vars[exp.name] = count;
        else if (vars[exp.name] !== count) return false;
        continue;
      }

      if (exp.type === 'square') {
        if (vars[exp.name] === undefined) {
          const root = Math.sqrt(count);
          if (!Number.isInteger(root)) return false;
          vars[exp.name] = root;
        } else if (count !== vars[exp.name] * vars[exp.name]) {
          return false;
        }
      }
    }

    return true;
  };

  return {
    config: {
      label: `{ ${labelExpr} }`,
      regex,
      count: null,
      half: false,
      perfSq: false,
      extraCheck,
    },
    message: `Power notation detected: ${labelExpr}. Rules auto-configured.`,
    tone: 'ok',
    sample: p => buildPowerSample(segments, p),
    presetKey: '',
  };
}

function detectDefaultLanguageVariant(raw) {
  const normalized = normalizeVariantInput(raw);
  const compact = normalized.replace(/\s+/g, '');
  const leftSide = compact.includes('|') ? compact.slice(0, compact.indexOf('|')) : compact;

  const anbncnPattern = /a\^?n(?:\^1)?b\^?n(?:\^1)?c\^?n(?:\^1)?/;
  const anbnPattern = /a\^?n(?:\^1)?b\^?n(?:\^1)?/;
  const an2Pattern = /a\^?\(?n\^?2\)?/;

  const hasAnbncnWords =
    normalized.includes('anbncn')
    || normalized.includes('triple equal')
    || normalized.includes('equal counts of a b c')
    || normalized.includes('equal count of a b c')
    || /a\s*\^\s*n\s*b\s*\^\s*n\s*c\s*\^\s*n/.test(normalized)
    || /count\(?a\)?.*(==|=).*(count\(?b\)?).*(==|=).*(count\(?c\)?)/.test(normalized)
    || /count\(?a\)?.*(==|=).*(count\(?b\)?).*count\(?c\)?.*(==|=).*(count\(?b\)?)/.test(normalized);

  if (anbncnPattern.test(leftSide) || hasAnbncnWords) {
    return buildPresetParseResult('anbncn', 'Detected variant of { a^n b^n c^n | n >= 0 }.');
  }

  const hasAnbnWords =
    normalized.includes('anbn')
    || normalized.includes('equal counts')
    || normalized.includes('same number of a and b')
    || normalized.includes('equal number of a and b')
    || /a\s*\^\s*n\s*b\s*\^\s*n/.test(normalized)
    || /count\(?a\)?.*(==|=).*(count\(?b\)?)/.test(normalized);

  if ((anbnPattern.test(leftSide) || hasAnbnWords) && !leftSide.includes('c')) {
    return buildPresetParseResult('anbn', 'Detected variant of { a^n b^n | n >= 0 }.');
  }

  const hasWwWords =
    normalized.includes('ww')
    || normalized.includes('w w')
    || normalized.includes('copylanguage')
    || normalized.includes('copy language')
    || normalized.includes('first half equals second half')
    || normalized.includes('duplicate string')
    || normalized.includes('two copies of w')
    || /w\s*in\s*\{\s*a\s*,\s*b\s*\}\s*\*/.test(normalized)
    || /w\s*in\s*\{\s*a\s*,\s*b\s*\}\s*star/.test(normalized);

  if (hasWwWords || leftSide === 'w^2' || leftSide === 'w2') {
    return buildPresetParseResult('ww', 'Detected variant of { ww | w in {a,b}* }.');
  }

  const hasAn2Words =
    normalized.includes('an2')
    || normalized.includes('perfect square')
    || normalized.includes('square length')
    || normalized.includes('length is a square')
    || normalized.includes('a^(n^2)')
    || normalized.includes('a^n^2');

  if (an2Pattern.test(leftSide) || hasAn2Words) {
    return buildPresetParseResult('an2', 'Detected variant of { a^(n^2) | n >= 0 }.');
  }

  return null;
}

function buildPresetParseResult(key, message) {
  const preset = EXPRESSION_PRESETS[key];
  if (!preset) return null;

  return {
    config: {
      label: preset.label,
      regex: preset.regex,
      count: preset.count,
      half: preset.half,
      perfSq: preset.perfSq,
      extraCheck: key === 'anbncn'
        ? (w => {
            const b = (w.match(/b/g) || []).length;
            const c = (w.match(/c/g) || []).length;
            return b === c;
          })
        : null,
    },
    message,
    tone: 'ok',
    sample: preset.sample,
    presetKey: key,
  };
}

function parsePowerSegments(raw) {
  let expr = raw.trim();
  if (!expr) return null;

  expr = expr
    .replace(/^\s*L\s*=\s*/i, '')
    .replace(/ⁿ/g, '^n')
    .replace(/²/g, '^2');

  if (expr.includes('|')) expr = expr.split('|')[0];
  expr = expr
    .replace(/[{}]/g, '')
    .replace(/[,*]/g, ' ')
    .replace(/·/g, ' ')
    .trim();

  if (!expr.includes('^')) return null;

  const byTerms = expr.split(/\s+/).filter(Boolean);
  if (byTerms.length > 1) {
    const parsedTerms = byTerms.map(parsePowerTerm);
    if (parsedTerms.every(Boolean)) return parsedTerms;
  }

  const compact = expr.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9_^()]+$/.test(compact)) return null;

  const segments = [];
  let i = 0;
  while (i < compact.length) {
    if (!/[A-Za-z0-9]/.test(compact[i])) return null;
    const symbol = compact[i];
    i++;

    let expRaw = '1';
    let explicit = false;

    if (compact[i] === '^') {
      explicit = true;
      i++;
      if (i >= compact.length) return null;

      const read = readCompactExponent(compact, i);
      if (!read) return null;
      expRaw = read.expRaw;
      i = read.nextIndex;
    }

    segments.push({
      symbol,
      exp: parsePowerExponent(expRaw, explicit),
    });
  }

  return segments;
}

function parsePowerTerm(term) {
  const cleaned = term.trim();
  if (!cleaned) return null;

  const m = cleaned.match(/^([A-Za-z0-9])(?:\^(.+))?$/);
  if (!m) return null;

  const symbol = m[1];
  let expRaw = '1';
  let explicit = false;

  if (m[2] !== undefined) {
    explicit = true;
    expRaw = m[2].trim();
    if (!expRaw) return null;
    if (expRaw.startsWith('(') && expRaw.endsWith(')')) {
      expRaw = expRaw.slice(1, -1).trim();
      if (!expRaw) return null;
    }
  }

  return { symbol, exp: parsePowerExponent(expRaw, explicit) };
}

function readCompactExponent(expr, startIndex) {
  let i = startIndex;
  if (i >= expr.length) return null;

  if (expr[i] === '(') {
    let depth = 1;
    i++;
    const start = i;
    while (i < expr.length && depth > 0) {
      if (expr[i] === '(') depth++;
      else if (expr[i] === ')') depth--;
      i++;
    }
    if (depth !== 0) return null;
    const expRaw = expr.slice(start, i - 1);
    if (!expRaw) return null;
    return { expRaw, nextIndex: i };
  }

  if (/\d/.test(expr[i])) {
    const start = i;
    while (i < expr.length && /\d/.test(expr[i])) i++;
    return { expRaw: expr.slice(start, i), nextIndex: i };
  }

  if (/[A-Za-z_]/.test(expr[i])) {
    const start = i;
    i++; // take first identifier character
    while (i < expr.length && /[A-Za-z0-9_]/.test(expr[i])) {
      // Stop before the next segment base in forms like a^nb^m.
      if (i + 1 < expr.length && /[A-Za-z0-9]/.test(expr[i]) && expr[i + 1] === '^') break;
      i++;
    }

    // Allow compact square exponent forms like n^2.
    if (expr[i] === '^' && i + 1 < expr.length && /\d/.test(expr[i + 1])) {
      i++; // include '^'
      while (i < expr.length && /\d/.test(expr[i])) i++;
    }

    return { expRaw: expr.slice(start, i), nextIndex: i };
  }

  return null;
}

function parsePowerExponent(expRaw, explicit) {
  const text = expRaw.replace(/\s+/g, '');
  if (!explicit) return { type: 'const', value: 1, text: '1' };

  if (/^\d+$/.test(text)) {
    return { type: 'const', value: parseInt(text, 10), text };
  }

  if (/^[A-Za-z][A-Za-z0-9_]*$/.test(text)) {
    return { type: 'var', name: text, text };
  }

  const sq = text.match(/^([A-Za-z][A-Za-z0-9_]*)\^2$/);
  if (sq) {
    return { type: 'square', name: sq[1], text };
  }

  return { type: 'unsupported', text };
}

function segmentToRegex(seg) {
  const symbol = escapeRegExp(seg.symbol);
  if (seg.exp.type === 'const') {
    if (seg.exp.value === 1) return symbol;
    return `${symbol}{${seg.exp.value}}`;
  }
  return `${symbol}*`;
}

function buildPowerSample(segments, p) {
  const vars = Object.create(null);
  let out = '';

  for (const seg of segments) {
    const exp = seg.exp;
    let count = 1;

    if (exp.type === 'const') {
      count = exp.value;
    } else if (exp.type === 'var') {
      if (vars[exp.name] === undefined) vars[exp.name] = p;
      count = vars[exp.name];
    } else if (exp.type === 'square') {
      if (vars[exp.name] === undefined) vars[exp.name] = Math.max(1, Math.ceil(Math.sqrt(p)));
      count = vars[exp.name] * vars[exp.name];
    }

    out += seg.symbol.repeat(Math.max(0, count));
  }

  return out;
}

function compilePredicateExpression(raw) {
  let expr = raw.trim();
  if (!expr) return { ok: false, error: 'Expression is empty.' };

  expr = expr
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/≠/g, '!=')
    .replace(/\band\b/gi, '&&')
    .replace(/\bor\b/gi, '||')
    .replace(/\bnot\b/gi, '!')
    .replace(/\blength\b/gi, 'len');

  // count(a) => count("a") and count a => count("a")
  expr = expr.replace(/count\s*\(\s*([A-Za-z0-9])\s*\)/g, 'count("$1")');
  expr = expr.replace(/\bcount\s+([A-Za-z0-9])\b/gi, 'count("$1")');

  const scrubbed = stripStringLiterals(expr);
  if (/[;`{}\[\]]/.test(scrubbed)) {
    return { ok: false, error: 'Unsupported characters in expression.' };
  }

  const decimalSafe = scrubbed.replace(/\d+\.\d+/g, '0');
  if (decimalSafe.includes('.')) {
    return { ok: false, error: 'Property access is not allowed in custom expressions.' };
  }

  const ids = scrubbed.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) || [];
  const allowed = new Set([
    'len', 'count', 'starts', 'ends', 'has', 'contains', 're', 'match',
    'halfEq', 'square', 'even', 'odd', 'prime', 'true', 'false'
  ]);

  for (const id of ids) {
    if (!allowed.has(id)) {
      return { ok: false, error: `Unsupported identifier "${id}".` };
    }
  }

  let evaluator;
  try {
    evaluator = new Function(
      'len', 'count', 'starts', 'ends', 'has', 'contains', 're', 'match', 'halfEq', 'square', 'even', 'odd', 'prime',
      `"use strict"; return (${expr});`
    );
  } catch (e) {
    return { ok: false, error: `Invalid expression syntax: ${e.message}` };
  }

  const fn = w => {
    const len = w.length;

    const count = symbol => {
      const token = String(symbol);
      if (!token) return 0;
      const re = new RegExp(escapeRegExp(token), 'g');
      return (w.match(re) || []).length;
    };

    const starts = prefix => w.startsWith(String(prefix));
    const ends = suffix => w.endsWith(String(suffix));
    const has = chunk => w.includes(String(chunk));
    const contains = has;

    const re = (pattern, flags = '') => {
      const safeFlags = String(flags).replace(/[^gimsuy]/g, '');
      return new RegExp(String(pattern), safeFlags).test(w);
    };
    const match = re;

    const halfEq = () => w.length % 2 === 0 && w.slice(0, w.length / 2) === w.slice(w.length / 2);
    const square = n => {
      const value = Number(n);
      if (!Number.isFinite(value) || value < 0) return false;
      const root = Math.round(Math.sqrt(value));
      return root * root === value;
    };
    const even = n => Number(n) % 2 === 0;
    const odd = n => Math.abs(Number(n) % 2) === 1;
    const prime = n => isPrimeNumber(Number(n));

    return !!evaluator(len, count, starts, ends, has, contains, re, match, halfEq, square, even, odd, prime);
  };

  try {
    fn('');
  } catch (e) {
    return { ok: false, error: `Expression failed to evaluate: ${e.message}` };
  }

  return { ok: true, fn };
}

function applyRuleConfig(config) {
  customLangLbl.value = config.label || '(custom language)';

  cRegex.checked = !!config.regex;
  cRegexV.value = config.regex || '';

  cCount.checked = !!config.count;
  cChar1.value = config.count ? config.count.left : '';
  cCountOp.value = config.count ? config.count.op : 'eq';
  cChar2.value = config.count ? config.count.right : '';

  cHalf.checked = !!config.half;
  cPerfSq.checked = !!config.perfSq;

  customExtraCheck = typeof config.extraCheck === 'function' ? config.extraCheck : null;

  cRegex.dispatchEvent(new Event('change'));
  cCount.dispatchEvent(new Event('change'));
}

function clearCustomRules() {
  applyRuleConfig({
    label: '(custom language)',
    regex: null,
    count: null,
    half: false,
    perfSq: false,
    extraCheck: null,
  });
}

function setDetectBanner(text, kind) {
  if (!detectBanner) return;
  detectBanner.textContent = text;
  detectBanner.className = `detect-banner ${kind || 'info'}`;
}

function mapCountOperator(op) {
  return { '=': 'eq', '==': 'eq', '<': 'lt', '>': 'gt', '<=': 'lte', '>=': 'gte' }[op] || 'eq';
}

function looksLikeRegexPattern(raw) {
  const text = raw.trim();
  if (!text) return false;

  if (/^\/(.*)\/[gimsuy]*$/.test(text)) return true;
  if (text.startsWith('^') || text.endsWith('$')) return true;
  if (/\[[^\]]+\]|\.\*|\.\+|\\[dDsSwW]/.test(text)) return true;
  if (/^\(?[A-Za-z0-9|*+?.^$\\]+\)?$/.test(text) && !/[<>=&]/.test(text)) return true;

  return false;
}

function stripStringLiterals(text) {
  return text.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeExpression(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/ⁿ/g, '^n')
    .replace(/²/g, '^2')
    .replace(/\{a,b\}\*/g, 'ab*')
    .replace(/\{/g, '')
    .replace(/\}/g, '')
    .replace(/\|/g, '');
}

function normalizeVariantInput(raw) {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/ⁿ/g, '^n')
    .replace(/²/g, '^2')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/∈/g, ' in ')
    .replace(/[,:;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPValue() {
  return Math.max(1, Math.min(12, parseInt(pumpInput.value, 10) || 3));
}

function insertAtCursor(input, token) {
  const start = input.selectionStart || 0;
  const end = input.selectionEnd || 0;
  const next = input.value.slice(0, start) + token + input.value.slice(end);
  input.value = next;
  const pos = start + token.length;
  input.setSelectionRange(pos, pos);
}

function removeAtCursor(input) {
  const start = input.selectionStart || 0;
  const end = input.selectionEnd || 0;

  if (start !== end) {
    input.value = input.value.slice(0, start) + input.value.slice(end);
    input.setSelectionRange(start, start);
    return;
  }

  if (start === 0) return;
  const next = input.value.slice(0, start - 1) + input.value.slice(start);
  input.value = next;
  const pos = start - 1;
  input.setSelectionRange(pos, pos);
}

function setCustomAutoSample(value) {
  sampleInput.value = value;
  customSampleIsAuto = true;
}

function loadExample(example) {
  const expr = example.expr || '';
  const sample = example.sample || '';
  const p = parseInt(example.p, 10);

  selectLanguage('custom');

  if (Number.isInteger(p) && p >= 1 && p <= 12) {
    pumpInput.value = String(p);
  }

  if (customExpressionInput) {
    customExpressionInput.value = expr;
    analyzeCustomExpression();
  }

  if (sample) {
    setCustomAutoSample(sample);
  }

  hideError();
  resetResults();
}

function looksLikePrimeAPattern(raw) {
  const text = raw.toLowerCase();
  return /(a\s*\^\s*p|a\^p)/.test(text) && /prime/.test(text);
}

function isPrimeNumber(value) {
  if (!Number.isInteger(value) || value < 2) return false;
  for (let d = 2; d * d <= value; d++) {
    if (value % d === 0) return false;
  }
  return true;
}

function nextPrimeStrictlyGreaterThan(n) {
  let c = Math.max(2, Math.floor(n) + 1);
  while (!isPrimeNumber(c)) c++;
  return c;
}

/* ─── Enumerate valid partitions ────────────────────────────────────────── */
/**
 * Constraints are positional only — language-independent:
 *   xLen ≥ 0,  yLen ≥ 1,  xLen + yLen ≤ p
 */
function enumeratePartitions(strLen, p) {
  const result = [];
  for (let xLen = 0; xLen <= p - 1; xLen++) {
    for (let yLen = 1; xLen + yLen <= p; yLen++) {
      if (xLen + yLen <= strLen) result.push({ xLen, yLen });
    }
  }
  return result;
}

const PUMP_VALUES = [0, 1, 2, 3];  // i=1 is the identity (original s)

/* ─── String visualizer ─────────────────────────────────────────────────── */
function renderString(s, p) {
  // Colour with canonical first partition: x=ε, y=s[0], z=rest
  stringDesc.textContent =
    `s = "${s}"   |s| = ${s.length} ≥ p = ${p}`
    + `   ·   colour shows: x = ε, y = "${s[0]}", z = "${s.slice(1)}"`;

  const display = s.length <= 80 ? s : s.slice(0, 78) + '…';
  for (let i = 0; i < display.length; i++) {
    const cell = document.createElement('div');
    cell.className = 'char-cell ' + (i === 0 ? 'seg-y' : 'seg-z');
    cell.textContent = display[i];
    stringVisual.appendChild(cell);
  }

  stringSection.hidden = false;
}

/* ─── Partition cards ───────────────────────────────────────────────────── */
function renderPartitions(s, partitions, memberTest) {
  partitions.forEach((part, idx) => {
    const { xLen, yLen } = part;
    const x = s.slice(0, xLen);
    const y = s.slice(xLen, xLen + yLen);
    const z = s.slice(xLen + yLen);

    const card = document.createElement('div');
    card.className = 'partition-card';
    card.style.animationDelay = `${idx * 45}ms`;

    const head = document.createElement('div');
    head.className = 'partition-head';
    head.innerHTML =
      `<span style="color:var(--accent);font-weight:700">#${idx + 1}</span>` +
      `<span>x = <strong>"${x || 'ε'}"</strong></span>` +
      `<span>y = <strong>"${y}"</strong></span>` +
      `<span>z = <strong>"${z || 'ε'}"</strong></span>` +
      `<span>|xy|&nbsp;=&nbsp;<strong>${xLen + yLen}</strong></span>` +
      `<span>|y|&nbsp;=&nbsp;<strong>${yLen}</strong></span>`;
    card.appendChild(head);

    const rows = document.createElement('div');
    rows.className = 'pumped-rows';

    PUMP_VALUES.forEach(i => {
      const pumped = x + y.repeat(i) + z;
      let inLang = false;
      try { inLang = !!memberTest(pumped); } catch (_) {}

      const row = document.createElement('div');
      row.className = 'pumped-row';

      const iLabel = document.createElement('span');
      iLabel.className = 'p-i';
      iLabel.textContent = `i = ${i}`;

      const str = document.createElement('span');
      str.className = 'p-str';
      str.textContent = abbr(pumped, 60);
      str.title = pumped;

      const verdict = document.createElement('span');
      verdict.className = 'p-verdict ' + (inLang ? 'pass' : 'fail');
      if (i === 1) {
        verdict.textContent = inLang ? '∈ L ✓  (original s)' : '∉ L — check test ⚠';
      } else {
        verdict.textContent = inLang ? '∈ L ✓' : '∉ L — CONTRADICTION ✗';
      }

      row.append(iLabel, str, verdict);
      rows.appendChild(row);
    });

    card.appendChild(rows);
    partList.appendChild(card);
  });

  partSect.hidden = false;
}

/* ─── Proof log ─────────────────────────────────────────────────────────── */
function renderLog(s, p, label, partitions, memberTest) {
  const lines = [];

  lines.push(t('sl', '── Step 1 ──────────────────────────────────────'));
  lines.push(t('ok', `Assume L = ${label} is regular.`));
  lines.push('');

  lines.push(t('sl', '── Step 2 ──────────────────────────────────────'));
  lines.push(`Let p = ${p} be the pumping length.`);
  lines.push('');

  lines.push(t('sl', '── Step 3 ──────────────────────────────────────'));
  lines.push(`Witness: s = "${abbr(s, 50)}"`);
  lines.push(t('dim', `  |s| = ${s.length} ≥ p = ${p}  ✓   and   s ∈ L  ✓`));
  lines.push('');

  lines.push(t('sl', '── Step 4 ──────────────────────────────────────'));
  lines.push(`By the Pumping Lemma, s = xyz for SOME split with |xy| ≤ ${p}, |y| ≥ 1.`);
  lines.push(t('dim', `  ${partitions.length} valid partition(s) to check.`));
  lines.push('');

  lines.push(t('sl', '── Step 5 ──────────────────────────────────────'));
  lines.push('Pumping each partition (i ∈ {0, 1, 2, 3}):');
  lines.push('');

  let allRefuted = true;
  const survivors = [];

  partitions.forEach((part, idx) => {
    const { xLen, yLen } = part;
    const x = s.slice(0, xLen), y = s.slice(xLen, xLen + yLen), z = s.slice(xLen + yLen);

    let refI = null;
    for (const i of PUMP_VALUES) {
      if (i === 1) continue;
      let inL = false;
      try { inL = !!memberTest(x + y.repeat(i) + z); } catch (_) {}
      if (!inL) { refI = i; break; }
    }

    const survives = PUMP_VALUES.filter(i => i !== 1).every(i => {
      try { return !!memberTest(x + y.repeat(i) + z); } catch (_) { return false; }
    });

    lines.push(`  #${idx + 1}: x="${x||'ε'}", y="${y}", z="${z||'ε'}"`);
    if (survives) {
      allRefuted = false;
      survivors.push(idx + 1);
      lines.push(`    ` + t('wrn', '→ All pump values stay in L. Cannot refute this partition.'));
    } else {
      lines.push(`    i=${refI}: "${abbr(x + y.repeat(refI) + z, 38)}"  →  ` + t('err', '∉ L  ✗'));
    }
    lines.push('');
  });

  lines.push(t('sl', '── Conclusion ──────────────────────────────────'));

  if (allRefuted) {
    lines.push(t('err', 'Every partition fails pumping for some i ≠ 1.'));
    lines.push(t('err', 'This contradicts the Pumping Lemma.'));
    lines.push(t('ok',  `∴ L = ${label} is NOT regular. □`));
    verdictEl.className = 'verdict contradiction';
    verdictEl.textContent = `CONTRADICTION — No partition survives pumping. L = ${label} is not regular. □`;
  } else {
    lines.push(t('wrn', `Partition(s) #${survivors.join(', ')} survived all pump values.`));
    lines.push(t('wrn', 'Proof INCONCLUSIVE with this string.'));
    lines.push(t('dim', 'Try a longer string or check your constraints.'));
    verdictEl.className = 'verdict inconclusive';
    verdictEl.textContent = `INCONCLUSIVE — Some partition(s) survived. Try a different sample string.`;
  }

  logEl.innerHTML = lines.join('\n');
  logSection.hidden = false;
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */
function resetResults() {
  [stringSection, partSect, logSection].forEach(el => el.hidden = true);
  stringVisual.innerHTML = '';
  partList.innerHTML = '';
  logEl.innerHTML = '';
  verdictEl.textContent = '';
  verdictEl.className = 'verdict';
}

function showError(msg) {
  errorBar.textContent = '⚠  ' + msg;
  errorBar.hidden = false;
}

function hideError() {
  errorBar.hidden = true;
  errorBar.textContent = '';
}

function t(cls, text) { return `<span class="${cls}">${text}</span>`; }

function abbr(w, max) {
  if (w.length <= max) return w;
  const h = Math.floor((max - 3) / 2);
  return w.slice(0, h) + '…' + w.slice(-h);
}
