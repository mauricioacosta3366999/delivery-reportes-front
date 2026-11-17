import { Link } from 'react-router'

export function Brand({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const large = size === 'lg'
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5 rounded-xl" aria-label="Delivery Reportes, inicio">
      <svg viewBox="0 0 32 32" className={large ? 'size-11' : 'size-9'} aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#326080" />
        <path d="M8 12.5 16 8l8 4.5v8L16 25l-8-4.5z" fill="none" stroke="#FFF1E7" strokeWidth="2" strokeLinejoin="round" />
        <path d="M8 12.5 16 17l8-4.5M16 17v8" fill="none" stroke="#B5D2E6" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <span className={large ? 'text-xl leading-tight font-extrabold text-azul-900' : 'leading-tight font-extrabold text-azul-900'}>
        Delivery<span className="font-semibold text-cafe"> Reportes</span>
      </span>
    </Link>
  )
}
