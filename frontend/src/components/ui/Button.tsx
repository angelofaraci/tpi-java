import type { ButtonHTMLAttributes } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'md' | 'sm'
}

const base =
  'rounded-home-md font-home-display font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50'

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  md: 'h-[36px] px-[16px] text-[12.5px]',
  sm: 'h-[30px] px-[12px] text-[11.5px]',
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-home-blue-600 text-white shadow-[0_6px_18px_-6px_rgba(37,99,235,.8)] hover:bg-home-blue-500',
  secondary: 'border border-home-border-hi bg-[#111621] text-home-text-soft hover:bg-home-chip',
  ghost: 'text-home-dim hover:bg-home-chip hover:text-home-text-soft',
}

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  ...rest
}: ButtonProps) {
  const classes = [base, sizeClasses[size], variantClasses[variant], className]
    .filter(Boolean)
    .join(' ')

  return <button type={type} className={classes} {...rest} />
}
