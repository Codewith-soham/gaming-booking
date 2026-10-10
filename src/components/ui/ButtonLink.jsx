import { Link } from 'react-router-dom'
import { buttonClasses } from './buttonStyles'

// A navigation link that looks like a Button (avoids nesting a <button> inside an <a>).
export default function ButtonLink({ variant = 'primary', className, children, ...props }) {
  return (
    <Link className={buttonClasses(variant, className)} {...props}>
      {children}
    </Link>
  )
}
