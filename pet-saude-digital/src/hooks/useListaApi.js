import { useEffect, useState } from 'react'
import { api } from '../lib/api'

/**
 * Carrega uma lista publica da API (eventos, noticias).
 *
 * O site tambem e publicado como estatico, sem API: nesse caso `erro` fica
 * verdadeiro e a secao mostra um aviso em vez de um painel vazio.
 *
 * @param {string} caminho  rota da API, ex: '/eventos'
 * @param {string} chave    campo da resposta que contem a lista
 */
export function useListaApi(caminho, chave) {
  const [estado, setEstado] = useState({ itens: [], carregando: true, erro: false })

  useEffect(() => {
    let ativo = true
    api(caminho)
      .then((data) => ativo && setEstado({ itens: data[chave] || [], carregando: false, erro: false }))
      .catch(() => ativo && setEstado({ itens: [], carregando: false, erro: true }))
    return () => {
      ativo = false
    }
  }, [caminho, chave])

  return estado
}
