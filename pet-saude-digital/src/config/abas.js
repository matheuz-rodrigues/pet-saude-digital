/*
 * Registro das abas da SPA.
 *
 * O `id` e usado como estado da aba ativa e tambem como hash da URL
 * (ex: .../#noticias), o que permite divulgar um link direto para uma
 * secao especifica no WhatsApp sem quebrar a navegacao por abas.
 */

export const abas = [
  { id: 'inicio', numero: '01', rotulo: 'Início', rotuloCurto: 'Início' },
  { id: 'eventos', numero: '02', rotulo: 'Eventos', rotuloCurto: 'Eventos' },
  { id: 'noticias', numero: '03', rotulo: 'Notícias', rotuloCurto: 'Notícias' },
  { id: 'contato', numero: '04', rotulo: 'Contato', rotuloCurto: 'Contato' },
]

export const abaInicial = 'inicio'
