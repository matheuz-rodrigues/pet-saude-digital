import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Le um parametro que vem depois do id da aba no hash.
 * Ex.: em `#noticias&noticia=12`, parametroHash('noticia') devolve '12'.
 * E assim que a primeira tela abre uma noticia ou evento especifico.
 */
export function parametroHash(nome) {
  const resto = window.location.hash.replace('#', '').split('&').slice(1).join('&')
  return new URLSearchParams(resto).get(nome)
}

/**
 * Controla a navegacao por abas da SPA.
 *
 * Alem de guardar a aba ativa, o hook:
 *  - sincroniza a aba com o hash da URL (link direto e botao voltar);
 *  - calcula a direcao da troca, usada para animar o painel;
 *  - habilita as setas do teclado para navegar entre abas.
 *
 * @param {{id: string}[]} abas   lista de abas registradas
 * @param {string} inicial        id da aba exibida por padrao
 */
export function useAbas(abas, inicial) {
  const ids = abas.map((a) => a.id)

  const lerHash = () => {
    const fromQuery = new URLSearchParams(window.location.search).get('aba')
    if (fromQuery && ids.includes(fromQuery)) return fromQuery
    const hash = window.location.hash.replace('#', '').split('&')[0]
    return ids.includes(hash) ? hash : inicial
  }

  const [ativa, setAtiva] = useState(lerHash)
  const [direcao, setDirecao] = useState(0)
  const anterior = useRef(ativa)

  const ir = useCallback(
    (id) => {
      if (!ids.includes(id) || id === anterior.current) return
      setDirecao(ids.indexOf(id) > ids.indexOf(anterior.current) ? 1 : -1)
      anterior.current = id
      setAtiva(id)
      window.history.replaceState(null, '', `#${id}`)
    },
    // ids e derivado de `abas`, que e uma constante do modulo de configuracao
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // Botao voltar / link colado com hash
  useEffect(() => {
    const aoTrocarHash = () => {
      const id = lerHash()
      if (id !== anterior.current) {
        setDirecao(ids.indexOf(id) > ids.indexOf(anterior.current) ? 1 : -1)
        anterior.current = id
        setAtiva(id)
      }
    }
    window.addEventListener('hashchange', aoTrocarHash)
    return () => window.removeEventListener('hashchange', aoTrocarHash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Setas do teclado — acessibilidade e navegacao rapida em apresentacoes
  useEffect(() => {
    const aoTeclar = (e) => {
      const alvo = e.target
      if (alvo && ['INPUT', 'TEXTAREA'].includes(alvo.tagName)) return
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return

      const i = ids.indexOf(anterior.current)
      const proximo = e.key === 'ArrowRight' ? i + 1 : i - 1
      if (proximo >= 0 && proximo < ids.length) ir(ids[proximo])
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ir])

  return { ativa, direcao, ir }
}
