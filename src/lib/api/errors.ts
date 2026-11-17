import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from './client'

/**
 * Lleva los `detalles` de un 400 a los campos del formulario. Los paths del
 * backend (`productos.0.cantidad`) coinciden con los de React Hook Form.
 * Devuelve el mensaje general a mostrar arriba del formulario.
 */
export function applyApiErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields?: readonly string[],
  /** Mensaje propio por campo, en lugar del que manda el backend (que viene en inglés). */
  mensajes: Record<string, string> = {},
): string {
  if (!(error instanceof ApiError)) return 'Ocurrió un error inesperado.'
  if (error.detalles.length === 0) return error.message

  const sinCampo: string[] = []
  for (const { campo, mensaje } of error.detalles) {
    const raiz = campo.split('.')[0]
    if (campo && (!knownFields || knownFields.includes(raiz))) {
      setError(campo as Path<T>, { type: 'server', message: mensajes[campo] ?? mensaje })
    } else {
      sinCampo.push(campo ? `${campo}: ${mensaje}` : mensaje)
    }
  }
  return sinCampo.length > 0 ? `Revisá los datos: ${sinCampo.join('; ')}` : 'Revisá los campos marcados.'
}
