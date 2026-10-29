import { motion } from 'framer-motion'
import { linkEmail, programa } from '../../data/programa'
import { surgir } from '../../lib/motion'
import { useInscricao } from '../../contexto/Inscricao'
import TituloSecao from '../ui/TituloSecao'
import BlocoAcao from '../ui/BlocoAcao'
import Sanfona from '../ui/Sanfona'
import { useEventosComInscricao } from '../../hooks/useEventosComInscricao'
import { rotuloTaxa } from '../../lib/dinheiro'

export default function Contato() {
  const { abrir } = useInscricao()
  const { eventos: abertos } = useEventosComInscricao()
  const duvidas = [
    {
      pergunta: 'Como faço a inscrição?',
      resumo: 'Pelo site, em cada evento com inscrição',
      resposta:
        'Na aba Eventos, abra o evento e clique em Inscrever-se. Cada evento tem a sua taxa, paga por Pix, e você escolhe as atividades na própria inscrição. Com a conta criada, as próximas inscrições não pedem os seus dados de novo. Quem já se inscreveu acompanha tudo em Minhas inscrições.',
    },
    {
      pergunta: 'As atividades têm vagas limitadas?',
      resumo: 'Algumas, sim',
      resposta:
        'Palestras e mesas-redondas costumam ter vagas livres. Minicursos e oficinas têm limite de participantes, mostrado ao lado de cada atividade na inscrição.',
    },
    {
      pergunta: 'Preciso ser estudante da UEPA?',
      resumo: 'Não, os eventos são abertos ao público externo',
      resposta:
        'Não. Os eventos do PET Saúde Digital são abertos à comunidade externa, especialmente a profissionais e estudantes das áreas de saúde e tecnologia.',
    },
    {
      pergunta: 'Onde fico sabendo dos próximos eventos?',
      resumo: 'Nas abas Eventos e Notícias',
      resposta:
        'Todos os eventos do programa ficam na aba Eventos, e os avisos e resultados saem na aba Notícias. A página inicial sempre mostra o próximo evento e as últimas notícias.',
    },
  ]
  const blocos = [
    ...duvidas.map((d, i) => ({
      id: `duvida-${i}`,
      titulo: d.pergunta,
      resumo: d.resumo,
      conteudo: (
        <p className="text-[13.5px] leading-relaxed text-pet-navy/80">{d.resposta}</p>
      ),
    })),
    {
      id: 'outros',
      titulo: 'Outros canais e organização',
      resumo: `Instagram ${programa.instagram}`,
      conteudo: (
        <div className="space-y-3">
          <div>
            <p className="label text-pet-navy/40">Redes sociais</p>
            <p className="mt-1 text-[14px] font-semibold tracking-tight text-pet-deep">
              {programa.instagram}
            </p>
            <p className="mt-0.5 text-[12.5px] text-pet-navy/60">
              Divulgação dos eventos e das notícias do programa.
            </p>
          </div>
          <div>
            <p className="label text-pet-navy/40">Comissão organizadora</p>
            <p className="mt-1 text-[13px] leading-relaxed text-pet-navy/75">
              Coordenação do PET Saúde Digital, com apoio da Liga Acadêmica de Informática em Saúde
              da UEPA.
            </p>
          </div>
          <div>
            <p className="label text-pet-navy/40">Horário de atendimento</p>
            <p className="mt-1 text-[13px] text-pet-navy/75">
              Segunda a sexta, das 09h às 18h.
            </p>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-3xl">
      <TituloSecao numero="04" etiqueta="Contato" titulo="Fale com a organização">
        A inscrição é feita neste site. WhatsApp e e-mail ficam para dúvidas.
      </TituloSecao>

      <motion.div
        variants={surgir}
        initial="oculto"
        animate="visivel"
        className="grid grid-cols-2 gap-px bg-pet-navy/12"
      >
        {abertos.length ? (
          <BlocoAcao
            tom="orange"
            onClick={() => abrir(abertos.length === 1 ? abertos[0].id : null)}
            etiqueta="Inscrições abertas"
            titulo="Inscrever-se"
            descricao={
              abertos.length === 1
                ? `${abertos[0].nome} · ${rotuloTaxa(abertos[0].taxa)}`
                : `${abertos.length} eventos com inscrição aberta`
            }
          />
        ) : (
          <BlocoAcao
            tom="orange"
            href="#eventos"
            etiqueta="Inscrições"
            titulo="Ver eventos"
            descricao="Nenhuma inscrição aberta agora"
          />
        )}
        <BlocoAcao
          tom="navy"
          href={linkEmail('Contato — PET Saúde Digital')}
          etiqueta="Assuntos formais"
          titulo="E-mail"
          descricao={programa.email}
        />
      </motion.div>

      <div className="mt-6">
        <p className="label mb-1 text-pet-navy/40">Dúvidas frequentes</p>
        {/* Comeca tudo fechado: e uma lista de consulta, nao de leitura. */}
        <Sanfona itens={blocos} inicial={null} />
      </div>
    </div>
  )
}
