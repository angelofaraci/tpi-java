import type { ReactNode } from 'react'

export interface ModalProps {
  open: boolean
  onClose: () => void
  titleId: string
  eyebrow?: string
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  maxWidthClassName?: string
  testId?: string
}

export function Modal({ open, titleId, eyebrow, title, children, footer, maxWidthClassName = 'max-w-[440px]', testId }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(6,8,12,.72)] p-[20px]" role="presentation">
      <div
        data-testid={testId}
        className={`w-full ${maxWidthClassName} rounded-home-3xl border border-home-border bg-home-surface p-[22px_24px] shadow-[0_24px_60px_-20px_rgba(0,0,0,.8)]`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {eyebrow && (
          <span className="mb-[8px] block font-home-mono text-[10px] tracking-[.18em] text-[#5b6deb]">
            {eyebrow}
          </span>
        )}
        <h2 id={titleId} className="font-home-display text-[17px] font-semibold text-home-text-strong">
          {title}
        </h2>
        <div className="mt-[8px] text-[12.5px] leading-[1.5] text-home-muted">{children}</div>
        {footer && <div className="mt-[20px] flex justify-end gap-[10px]">{footer}</div>}
      </div>
    </div>
  )
}
