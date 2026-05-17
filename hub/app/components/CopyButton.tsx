'use client'

import { useState } from 'react'

export default function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy to clipboard"
      className={className}
      style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: copied ? 1 : 0.5, padding: '0 4px', fontSize: 13, color: copied ? '#F5C518' : 'inherit' }}
    >
      {copied ? '✓' : '⧉'}
    </button>
  )
}
