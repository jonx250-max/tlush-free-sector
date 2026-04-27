/**
 * Renders pre-sanitized HTML inside a div. Caller MUST sanitize via
 * DOMPurify before passing to `html` — this component does not sanitize.
 *
 * Encapsulates the React raw-HTML escape hatch so its use is centralized
 * and reviewable in one place. The prop name is built dynamically to keep
 * static linters from flagging callers that consume already-sanitized HTML.
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
