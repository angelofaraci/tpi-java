import type { InputHTMLAttributes } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  font?: 'display' | 'mono'
}

const base =
  'h-[34px] w-full rounded-home-lg border bg-home-well px-[11px] text-[12.5px] text-home-text outline-none transition-colors duration-150 placeholder:text-home-placeholder focus:border-home-border-acc disabled:opacity-50'

const monoClasses = 'font-home-mono text-[11.5px] tracking-[.08em]'

export function Input({ invalid = false, font = 'display', className = '', ...rest }: InputProps) {
  const border = invalid ? 'border-home-danger' : 'border-home-border-mid'
  const classes = [base, border, font === 'mono' ? monoClasses : '', className]
    .filter(Boolean)
    .join(' ')

  return <input className={classes} {...rest} />
}
