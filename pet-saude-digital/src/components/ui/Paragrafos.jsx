/** Texto livre cadastrado no admin: cada linha em branco vira um paragrafo. */
export default function Paragrafos({ texto, className = '' }) {
  const blocos = String(texto || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  return blocos.map((p, i) => (
    <p key={i} className={`whitespace-pre-line text-[13.5px] leading-relaxed text-pet-navy/85 ${className}`}>
      {p}
    </p>
  ))
}
