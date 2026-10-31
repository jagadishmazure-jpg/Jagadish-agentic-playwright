'use strict';
// Shared helpers for the business-rule assertions.
// Every rule returns a promptfoo GradingResult: { pass, score, reason }.
// On failure the reason is always "FAILED: <rule> → <evidence>"; <evidence> quotes
// the words in the description that caused the failure.

const ARROW = '\u2192'; // →

function passed(rule) {
  return { pass: true, score: 1, reason: `PASSED: ${rule}` };
}

function failed(rule, evidence) {
  return { pass: false, score: 0, reason: `FAILED: ${rule} ${ARROW} ${evidence}` };
}

// The test case's variables. Rules read product facts from here, never from code.
function varsOf(context) {
  return (context && context.vars) || {};
}

function text(output) {
  return String(output ?? '');
}

// Quote evidence on one line; long text is cut with an ellipsis so CI logs stay readable.
function quote(s, max = 90) {
  let t = String(s).replace(/\s+/g, ' ').trim();
  if (t.length > max) t = `${t.slice(0, max - 1)}\u2026`;
  return `"${t}"`;
}

// Accept a YAML list or a comma-separated string.
function asList(v) {
  if (v == null || v === '') return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return String(v)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function norm(s) {
  return String(s)
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function words(s) {
  return text(s).trim().split(/\s+/).filter(Boolean);
}

module.exports = { ARROW, passed, failed, varsOf, text, quote, asList, norm, words };
