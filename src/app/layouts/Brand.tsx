import { Link } from 'react-router'

/** Marca de Ato Logística: el logo (con fondo transparente) y, en el encabezado, el nombre al lado. */
export function Brand({ size = 'md' }: { size?: 'md' | 'lg' }) {
  if (size === 'lg') {
    // En login y registro el logo se ve grande y ya incluye el nombre.
    return (
      <Link to="/" className="flex flex-col items-center gap-2 rounded-2xl" aria-label="Ato Logística, inicio">
        <img src="/logo-ato-512.webp" alt="" width={144} height={144} className="size-36" fetchPriority="high" />
        <span className="text-sm font-semibold tracking-wide text-gris uppercase">Reportes</span>
      </Link>
    )
  }
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2 rounded-xl" aria-label="Ato Logística Reportes, inicio">
      <img src="/logo-ato-256.webp" alt="" width={44} height={44} className="size-11" />
      <span className="leading-tight font-extrabold text-tinta">
        Ato Logística<span className="block text-xs font-semibold text-naranja-700">Reportes</span>
      </span>
    </Link>
  )
}
