/** Solo los dígitos (y el + inicial) para un link `tel:`; null si no parece un teléfono. */
export function telefonoParaLlamar(contacto: string) {
  const telefono = contacto.replace(/[^\d+]/g, '')
  return telefono.replace(/\D/g, '').length >= 6 ? telefono : null
}

/**
 * Link de WhatsApp (`https://wa.me/595…`). Los números locales de Paraguay se pasan al
 * formato internacional: 0981 123 456 → 595981123456. Devuelve null si no parece un teléfono.
 */
export function whatsappUrl(contacto: string) {
  let digitos = contacto.replace(/\D/g, '')
  if (digitos.startsWith('00')) digitos = digitos.slice(2)
  else if (contacto.trim().startsWith('+') || digitos.startsWith('595')) {
    // Ya viene con código de país.
  } else if (digitos.startsWith('0')) digitos = `595${digitos.slice(1)}`
  else if (/^9\d{8}$/.test(digitos)) digitos = `595${digitos}`
  return digitos.length >= 11 && digitos.length <= 15 ? `https://wa.me/${digitos}` : null
}
