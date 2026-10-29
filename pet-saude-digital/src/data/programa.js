/*
 * Dados institucionais do PET Saude Digital.
 *
 * O site deixou de ser de um evento so: o que e de cada evento (datas, local,
 * descricao) vem do cadastro de eventos no admin. Aqui fica apenas o que e do
 * programa e vale para todos eles. Nomes de pessoas e contatos seguem
 * FICTICIOS, conforme acordado nas reunioes de levantamento de requisitos.
 */

import fotoJoseMatheus from '../assets/coordenacao/anderson-souza.jpg'

export const programa = {
  nome: 'PET Saúde Digital',
  instituicao: 'Universidade do Estado do Pará',
  sigla: 'UEPA',
  chamada: 'Tecnologia, dados e cuidado em saúde na Amazônia.',
  publico: 'Comunidade acadêmica e profissionais de saúde e tecnologia',
  email: 'petsaudedigital@uepa.br',
  instagram: '@petsaudedigital.uepa',
}

export const objetivos = [
  'Divulgar o andamento dos projetos desenvolvidos pelo PET Saúde Digital.',
  'Aproximar a prática em saúde do uso aplicado de tecnologia e de dados.',
  'Oferecer eventos de formação técnica à comunidade acadêmica e aos serviços.',
  'Dar visibilidade à produção científica dos estudantes do programa.',
]

export const coordenacao = [
  {
    id: 'camila-andrade',
    nome: 'Camila Rocha Andrade',
    titulo: 'Profª Drª',
    cargo: 'Coordenadora geral do PET Saúde Digital',
    formacao: 'Doutora em Saúde Coletiva (UFPA)',
    bio: 'Pesquisadora em telessaúde e gestão da informação em saúde na Amazônia. Coordena o PET Saúde Digital desde 2024 e integra o grupo de pesquisa em Informática em Saúde da UEPA.',
  },
  {
    id: 'jose-matheus',
    nome: 'José Matheus R. S. Filho',
    titulo: 'Prof. Pós Dr.',
    cargo: 'Coordenador adjunto do PET Saúde Digital',
    formacao: 'Doutor em Engenharia da Computação (UFPA)',
    bio: 'Atua em projetos de transformação digital em saúde e orienta trabalhos sobre sistemas de apoio à decisão clínica.',
    foto: fotoJoseMatheus,
  },
]

/** Gera as iniciais usadas no monograma, no lugar da foto. */
export function iniciais(nome) {
  const partes = nome.split(' ').filter((p) => p.length > 2)
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

/** Monta um link de e-mail com assunto pré-preenchido. */
export function linkEmail(assunto) {
  return `mailto:${programa.email}?subject=${encodeURIComponent(assunto)}`
}
