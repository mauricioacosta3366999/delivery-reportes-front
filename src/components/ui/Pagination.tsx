import { Button } from './Button'

interface PaginationProps {
  pagina: number
  limite: number
  total: number
  onChange: (pagina: number) => void
}

export function Pagination({ pagina, limite, total, onChange }: PaginationProps) {
  const paginas = Math.max(1, Math.ceil(total / limite))
  if (total === 0) return null
  const desde = (pagina - 1) * limite + 1
  const hasta = Math.min(total, pagina * limite)
  return (
    <nav aria-label="Paginación" className="mt-4 flex items-center justify-between gap-3 text-sm text-gris">
      <span className="tabular">
        {desde}–{hasta} de {total}
      </span>
      {paginas > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={pagina <= 1} onClick={() => onChange(pagina - 1)}>
            Anterior
          </Button>
          <span className="tabular px-1">
            {pagina} / {paginas}
          </span>
          <Button variant="secondary" size="sm" disabled={pagina >= paginas} onClick={() => onChange(pagina + 1)}>
            Siguiente
          </Button>
        </div>
      )}
    </nav>
  )
}
