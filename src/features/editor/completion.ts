import { snippetCompletion, type CompletionContext, type Completion } from '@codemirror/autocomplete';

export const ENVIRONMENTS = ['aligned', 'alignedat', 'gathered', 'split', 'cases', 'matrix', 'pmatrix', 'bmatrix', 'Bmatrix', 'vmatrix', 'Vmatrix', 'smallmatrix', 'array'];
const templates: Array<[string, string, string]> = [
  ['sum', '\\sum_{${1}}^{${2}}${0}', 'sum with limits'],
  ['prod', '\\prod_{${1}}^{${2}}${0}', 'product with limits'],
  ['int', '\\int_{${1}}^{${2}} ${0}', 'integral with limits'],
  ['iint', '\\iint_{${1}}^{${2}} ${0}', 'double integral'],
  ['oint', '\\oint_{${1}}^{${2}} ${0}', 'contour integral'],
  ['frac', '\\frac{${1}}{${2}}${0}', 'fraction'],
  ['sqrt', '\\sqrt{${1}}${0}', 'square root'],
  ['lim', '\\lim_{${1}} ${0}', 'limit'],
  ['left', '\\left(${1}\\right)${0}', 'paired delimiters'],
  ['underbrace', '\\underbrace{${1}}_{${2}}${0}', 'underbrace'],
  ['overbrace', '\\overbrace{${1}}^{${2}}${0}', 'overbrace'],
  ['begin', '\\begin{${1:aligned}}\n\t${0}\n\\end{${1:aligned}}', 'matching environment'],
];
const commands = 'alpha beta gamma delta epsilon varepsilon zeta eta theta vartheta iota kappa lambda mu nu xi pi varpi rho varrho sigma varsigma tau upsilon phi varphi chi psi omega Gamma Delta Theta Lambda Xi Pi Sigma Upsilon Phi Psi Omega infty partial nabla cdot times div pm mp leq geq neq approx equiv sim simeq propto in notin subset subseteq supset supseteq cup cap bigcup bigcap emptyset forall exists neg land lor to mapsto rightarrow leftarrow Rightarrow Leftarrow Leftrightarrow longrightarrow iff implies angle perp parallel ell hbar Re Im sin cos tan arcsin arccos arctan sinh cosh tanh log ln exp det gcd min max sup inf ker dim mod bmod pmod quad qquad displaystyle textstyle dots ldots cdots vdots ddots'.split(' ');
export const MATH_COMPLETIONS: Completion[] = [
  ...templates.map(([label, template, detail]) => snippetCompletion(template, { label: `\\${label}`, detail, type: 'function', boost: 5 })),
  ...['mathrm', 'mathbf', 'mathit', 'mathsf', 'mathtt', 'mathbb', 'mathcal', 'mathfrak', 'bm', 'boldsymbol', 'text', 'operatorname', 'hat', 'bar', 'vec', 'overline', 'underline'].map(label => snippetCompletion(`\\${label}{\${1}}\${0}`, { label: `\\${label}`, type: 'function' })),
  ...commands.map(label => ({ label: `\\${label}`, type: 'keyword' })),
];
export function macroNames(source: string): string[] {
  const withoutComments = source.replace(/(?<!\\)%[^\n]*/g, '');
  return [...new Set([...withoutComments.matchAll(/\\(?:def|gdef|edef|xdef)\s*(\\[a-zA-Z@]+)|\\(?:newcommand|renewcommand|providecommand|DeclareMathOperator)\*?\s*\{?\s*(\\[a-zA-Z@]+)/g)].map(match => match[1] ?? match[2]))];
}
export function mathCompletionSource(macros = '', locale: 'en' | 'zh' = 'en') {
  const localized = MATH_COMPLETIONS.map(item => ({ ...item, detail: item.detail && locale === 'zh' ? '数学代码片段' : item.detail }));
  const options = [...localized, ...macroNames(macros).map(label => ({ label, type: 'function', detail: locale === 'zh' ? '用户宏' : 'user macro', boost: 10 }))];
  return (context: CompletionContext) => {
    const environment = context.matchBefore(/\\begin\{[a-zA-Z*]*/);
    if (environment) return { from: environment.from + 7, options: ENVIRONMENTS.map(label => ({ label, type: 'type' })), validFor: /^[a-zA-Z*]*$/ };
    const word = context.matchBefore(/\\[a-zA-Z@]*/);
    if (!word) return null;
    return { from: word.from, options, validFor: /^\\[a-zA-Z@]*$/ };
  };
}
