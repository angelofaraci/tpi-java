import { useState } from 'react'

export function CopyCodeButton({ code, size = 'sm', variant = 'default' }: { code: string; size?: 'sm' | 'md'; variant?: 'default' | 'dark' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const dimension = size === 'md' ? '2.25rem' : '1.75rem'
  const iconSize = size === 'md' ? 18 : 14
  const idleColor = variant === 'dark' ? 'rgba(255,255,255,0.5)' : 'var(--color-foreground-muted)'
  const idleBorder = variant === 'dark' ? 'rgba(255,255,255,0.2)' : 'var(--color-border)'

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy code'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dimension,
        height: dimension,
        padding: 0,
        border: '1px solid',
        borderColor: copied ? '#22c55e' : idleBorder,
        borderRadius: '0.375rem',
        backgroundColor: copied ? 'rgba(34,197,94,0.15)' : 'transparent',
        color: copied ? '#22c55e' : idleColor,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        flexShrink: 0,
      }}
    >
      {copied ? (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  )
}
