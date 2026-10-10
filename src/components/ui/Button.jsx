import { buttonClasses } from './buttonStyles'

export default function Button({
  variant = 'primary',
  className,
  type = 'button',
  loading = false,
  disabled,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, className)}
      {...props}
    >
      {loading ? 'Working...' : children}
    </button>
  )
}
