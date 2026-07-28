import type { ReactNode } from 'react'

export interface FormFieldProps {
  id: string
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
}

export function FormField({ id, label, hint, error, required, children }: FormFieldProps) {
  return (
    <div className="mb-[14px]">
      <label htmlFor={id} className="mb-[10px] block font-home-mono text-[10px] uppercase tracking-[.16em] text-home-dim-2">
        {label}
        {required ? ' *' : ''}
      </label>
      {children}
      {error && <span className="mt-[5px] block text-[11.5px] text-home-danger">{error}</span>}
      {!error && hint && <span className="mt-[5px] block text-[11.5px] text-home-dim">{hint}</span>}
    </div>
  )
}
