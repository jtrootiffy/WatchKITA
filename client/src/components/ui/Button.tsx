import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors duration-200 ease-editorial disabled:pointer-events-none disabled:opacity-40'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary/90 active:bg-primary',
  secondary: 'border border-line bg-transparent text-white hover:border-muted hover:bg-surface',
  ghost: 'text-muted hover:bg-surface hover:text-white',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-sm',
}

export function buttonStyles(variant: Variant = 'primary', size: Size = 'md', extra = ''): string {
  return [base, variants[variant], sizes[size], extra].filter(Boolean).join(' ')
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return <button className={buttonStyles(variant, size, className)} {...props} />
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant
  size?: Size
  children: ReactNode
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonStyles(variant, size, className)} {...props}>
      {children}
    </Link>
  )
}

export function ButtonAnchor({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; size?: Size }) {
  return (
    <a className={buttonStyles(variant, size, className)} {...props}>
      {children}
    </a>
  )
}
