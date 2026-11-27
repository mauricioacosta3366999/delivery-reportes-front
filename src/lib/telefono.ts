/** Número para wa.me: solo dígitos, con código de Paraguay si viene en formato local (0981… → 595981…). */
export function numeroWhatsApp(contacto: string): string | null {
  let digitos = contacto.replace(/\D/g, '')
  if (contacto.trim().startsWith('+')) return digitos.length >= 8 ? digitos : null
  if (digitos.startsWith('00')) digitos = digitos.slice(2)
  else if (digitos.startsWith('0')) digitos = `595${digitos.slice(1)}`
  else if (digitos.length === 9 && digitos.startsWith('9')) digitos = `595${digitos}`
  return digitos.length >= 10 ? digitos : null
}
