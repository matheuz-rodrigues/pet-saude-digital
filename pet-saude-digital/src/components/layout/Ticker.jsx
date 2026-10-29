import { programa } from '../../data/programa'
import { useListaApi } from '../../hooks/useListaApi'

/**
 * Faixa superior em movimento continuo.
 *
 * Concentra o que precisa ser lido antes de qualquer clique — o cliente pediu
 * que o site funcionasse sem rolagem. Mostra as manchetes das ultimas
 * noticias cadastradas no admin; sem noticias (ou sem API), cai em frases
 * fixas do programa para a faixa nunca ficar vazia.
 */
export default function Ticker() {
  const { itens: noticias } = useListaApi('/noticias', 'noticias')
  const itens = noticias.length
    ? noticias.slice(0, 5).map((n) => n.titulo)
    : [programa.nome, programa.chamada, 'Inscrições pelo site, com Pix', programa.instagram]
  // Com uma ou duas noticias a faixa ficaria mais curta que a tela e
  // abriria buracos; repete as manchetes ate ter pelo menos seis.
  let faixa = itens
  while (faixa.length < 6) faixa = [...faixa, ...itens]
  // A lista e duplicada porque a animacao translada -50%: quando a primeira
  // metade sai da tela, a segunda ja esta no lugar e o loop fica continuo.
  const sequencia = [...faixa, ...faixa]

  return (
    /*
     * Oculto no celular: a faixa custava 26px dos ~650px uteis de tela, e as
     * manchetes ja aparecem na aba Inicio.
     */
    <div className="relative hidden overflow-hidden border-b border-white/10 bg-pet-orange text-white sm:block">
      <div className="flex w-max animate-marquee items-center whitespace-nowrap py-1.5">
        {sequencia.map((item, i) => (
          <span key={i} className="flex items-center">
            <span className="label px-5">{item}</span>
            <span className="h-1 w-1 bg-white/60" />
          </span>
        ))}
      </div>
    </div>
  )
}
