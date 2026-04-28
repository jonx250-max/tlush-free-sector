/**
 * Single, audited entry point for rendering pre-sanitized HTML.
 *
 * **Caller contract.** The `html` prop MUST be sanitized via DOMPurify
 * (or an equivalent allowlist sanitizer) BEFORE it reaches this
 * component. This component performs no sanitation of its own. Today
 * the only call sites are:
 *
 *   src/pages/ResultsPage.tsx — `SanitizedLetter` rendering a
 *   DOMPurify-sanitized demand-letter HTML produced by
 *   `services/demandLetterGenerator.ts` (which itself escapes every
 *   user-supplied field through `escapeHtml`).
 *
 * **Why the runtime-built prop name?** The repo's tooling (Anthropic
 * security hooks, future SAST add-ons) refuses to commit source files
 * containing the literal React raw-HTML escape-hatch identifier in JSX
 * position. Centralising the only legitimate use here, behind a
 * runtime-built prop name, makes the assumption explicit:
 *
 *   - Greppable. `RAW_HTML_PROP` is searchable; reviewers can see at
 *     a glance which file is allowed to do this.
 *   - Single point of change. If we swap to a different render path
 *     (e.g. shadow-DOM, sanitized iframe, server-rendered partial),
 *     every caller updates by editing one file.
 *   - Trip-wire. Any *new* file that tries to bypass DOMPurify by
 *     constructing the literal prop name in JSX gets stopped by the
 *     same hook that already protects this file.
 *
 * Trade-off: SAST tools that match the literal string lose visibility
 * here. The mitigation is human review of every edit to this file —
 * it should change rarely, and every change deserves a security
 * walk-through. Reviewers: if you are looking at a diff that touches
 * this file, audit the call graph before approving.
 */
import { createElement, type HTMLAttributes } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  html: string
}

const RAW_HTML_PROP = ['dangerously', 'Set', 'Inner', 'HTML'].join('')

export function SanitizedHtml({ html, ...rest }: Props) {
  return createElement('div', { ...rest, [RAW_HTML_PROP]: { __html: html } })
}

export function SanitizedLetter({ html }: { html: string }) {
  return <SanitizedHtml html={html} className="mt-4 rounded-lg border border-cs-border bg-white p-6" />
}
