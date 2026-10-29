import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { api, mascaraCpfInput, mascaraTel } from '../../lib/api'
import { useInscricao } from '../../contexto/Inscricao'
import { useSessao } from '../../contexto/Sessao'
import { aceitaInscricao } from '../../hooks/useEventosComInscricao'
import { dataCurta, formatarPeriodo, ordenarEventos } from '../../lib/datas'
import { reais, rotuloTaxa } from '../../lib/dinheiro'
import { suave } from '../../lib/motion'
import Campo, { classeInput, classeInputErro } from './Campo'
import AvisoDocumento from './AvisoDocumento'

const GENEROS = ['Feminino', 'Masculino', 'Não binário', 'Outro', 'Prefiro não informar']
const NOMES_ETAPAS = {
  quem: 'Quem é você',
  contato: 'Contato e acesso',
  atividades: 'Evento e atividades',
  confira: 'Confira',
  pagamento: 'Pagamento',
}
// Quem ja tem conta pula os dados pessoais: so escolhe evento e atividades.
const ETAPAS_NOVO = ['quem', 'contato', 'atividades', 'confira', 'pagamento']
const ETAPAS_CONTA = ['atividades', 'confira', 'pagamento']

const vazio = {
  nomeCompleto: '',
  usaNomeSocial: false,
  nomeSocial: '',
  genero: '',
  nascimento: '',
  cpf: '',
  email: '',
  telefone: '',
  senha: '',
  senha2: '',
  atividades: [],
  aceiteLgpd: false,
}

function validarEtapa(etapa, f, { evento, jaInscrito, logado }) {
  const e = {}
  if (etapa === 'quem') {
    if (f.nomeCompleto.trim().split(/\s+/).length < 2) e.nomeCompleto = 'Informe nome e sobrenome.'
    if (f.usaNomeSocial && f.nomeSocial.trim().length < 2) e.nomeSocial = 'Informe o nome social.'
    if (!f.genero) e.genero = 'Selecione uma opção.'
    if (!f.nascimento) e.nascimento = 'Informe a data.'
    if (f.cpf.replace(/\D/g, '').length !== 11) e.cpf = 'CPF incompleto.'
  }
  if (etapa === 'contato') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'E-mail inválido.'
    if (f.telefone.replace(/\D/g, '').length < 10) e.telefone = 'Telefone incompleto.'
    if (f.senha.length < 8) e.senha = 'Mínimo de 8 caracteres.'
    if (f.senha !== f.senha2) e.senha2 = 'As senhas não coincidem.'
  }
  if (etapa === 'atividades') {
    if (!evento) e.evento = 'Escolha um evento.'
    else if (jaInscrito) e.evento = 'Você já está inscrito neste evento.'
  }
  if (etapa === 'confira' && !logado && !f.aceiteLgpd) e.aceiteLgpd = 'É preciso aceitar para continuar.'
  return e
}

export default function ModalInscricao() {
  const { aberto, eventoId: eventoInicial, fechar } = useInscricao()
  const { participante, setParticipante } = useSessao()
  const [passo, setPasso] = useState(0)
  const [form, setForm] = useState(vazio)
  const [erros, setErros] = useState({})
  const [eventos, setEventos] = useState([])
  const [eventoId, setEventoId] = useState(null)
  const [dia, setDia] = useState(null)
  const [emailExiste, setEmailExiste] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [insc, setInsc] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [modoPagamento, setModoPagamento] = useState('pix')
  // A lista de etapas e fixada ao abrir: criar a conta no meio do caminho
  // nao pode encurtar o assistente e pular a tela de pagamento.
  const [logado, setLogado] = useState(false)

  const etapas = logado ? ETAPAS_CONTA : ETAPAS_NOVO
  const etapa = etapas[passo]

  useEffect(() => {
    if (!aberto) return
    setLogado(Boolean(participante))
    setEventoId(eventoInicial)
    api('/eventos')
      .then((d) => {
        const abertos = ordenarEventos(d.eventos).filter(aceitaInscricao)
        setEventos(abertos)
        // Um evento so: ja vem escolhido.
        if (!eventoInicial && abertos.length === 1) setEventoId(abertos[0].id)
      })
      .catch(() => setErros({ geral: 'Não foi possível carregar os eventos.' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  useEffect(() => {
    if (!aberto || !insc || insc.status !== 'aguardando_pix') return
    const t = setInterval(async () => {
      try {
        const conta = await api('/inscricoes/eu')
        setParticipante(conta)
        const atual = conta.inscricoes.find((i) => i.id === insc.id)
        if (atual) setInsc(atual)
      } catch {
        /* sessão ainda não pronta */
      }
    }, 3000)
    return () => clearInterval(t)
  }, [aberto, insc?.id, insc?.status, setParticipante])

  const evento = eventos.find((e) => e.id === eventoId) || null
  const jaInscrito = Boolean(
    evento && participante?.inscricoes?.some((i) => i.evento.id === evento.id && i.status !== 'cancelada'),
  )
  const dias = evento ? [...new Set(evento.atividades.map((a) => a.data))] : []
  const diaAtivo = dias.includes(dia) ? dia : dias[0]
  const escolhidas = (evento?.atividades || []).filter((a) => form.atividades.includes(a.id))
  const total = escolhidas.reduce((s, a) => s + a.precoExtra, evento ? evento.taxa : 0)

  function setCampo(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErros((e) => ({ ...e, [campo]: undefined }))
  }

  function escolherEvento(id) {
    setEventoId(id)
    setDia(null)
    setForm((f) => ({ ...f, atividades: [] }))
    setErros((e) => ({ ...e, evento: undefined }))
  }

  async function checarEmail() {
    if (!form.email) return
    try {
      const { existe } = await api(`/inscricoes/email?email=${encodeURIComponent(form.email)}`)
      setEmailExiste(existe)
    } catch {
      setEmailExiste(false)
    }
  }

  function aplicar({ conta, inscricao }) {
    if (conta) setParticipante(conta)
    if (inscricao) setInsc(inscricao)
  }

  async function avancar() {
    const e = validarEtapa(etapa, form, { evento, jaInscrito, logado })
    setErros(e)
    if (Object.keys(e).length) return
    if (etapa === 'contato' && emailExiste) return
    if (etapa === 'confira') {
      setEnviando(true)
      try {
        const corpo = { eventoId: evento.id, atividades: form.atividades }
        const criada = logado
          ? await api('/inscricoes/eventos', { method: 'POST', body: corpo })
          : await api('/inscricoes', { method: 'POST', body: { ...form, ...corpo } })
        aplicar(criada)
        // Evento gratuito ja volta confirmado, sem Pix.
        if (criada.inscricao.status === 'aguardando_pix') {
          aplicar(await api(`/inscricoes/${criada.inscricao.id}/pix`, { method: 'POST' }))
        }
        setPasso((n) => n + 1)
      } catch (err) {
        setErros({ geral: err.message })
      } finally {
        setEnviando(false)
      }
      return
    }
    setPasso((n) => n + 1)
  }

  async function pedirGratuidade() {
    setEnviando(true)
    try {
      aplicar(await api(`/inscricoes/${insc.id}/gratuidade`, { method: 'POST', body: { motivo } }))
    } catch (err) {
      setErros({ geral: err.message })
    } finally {
      setEnviando(false)
    }
  }

  async function simularPix() {
    setEnviando(true)
    try {
      setInsc(await api('/webhooks/dev/simular-pix', { method: 'POST', body: { inscricaoId: insc.id } }))
      setParticipante(await api('/inscricoes/eu'))
    } catch (err) {
      setErros({ geral: err.message })
    } finally {
      setEnviando(false)
    }
  }

  function resetarEFechar() {
    setPasso(0)
    setForm(vazio)
    setErros({})
    setInsc(null)
    setMotivo('')
    setModoPagamento('pix')
    setEmailExiste(false)
    fechar()
  }

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          className="fixed inset-0 z-50 flex items-stretch justify-center bg-pet-ink/55 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ duration: 0.28, ease: suave }}
            className="flex h-full w-full max-w-lg flex-col bg-pet-paper sm:h-auto sm:max-h-[92vh]"
          >
            <header className="flex items-center justify-between gap-3 bg-pet-navy px-4 py-3 text-white">
              <p className="min-w-0 truncate text-[14px] font-semibold">
                Inscrição · {evento ? evento.nome : 'PET Saúde Digital'}
              </p>
              <button type="button" onClick={resetarEFechar} className="flex-none text-[13px] text-white/70">
                Fechar
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <p className="mb-3 text-[12px] text-pet-navy/60">
                Formulário para participantes. Palestrantes: a organização entra em contato.
              </p>
              <div className="mb-2 flex gap-1">
                {etapas.map((id, i) => (
                  <span key={id} className={`h-1.5 flex-1 ${i <= passo ? 'bg-pet-navy' : 'bg-pet-navy/15'}`} />
                ))}
              </div>
              <p className="label mb-4 text-pet-navy/45">
                Etapa {passo + 1} de {etapas.length} · {NOMES_ETAPAS[etapa]}
              </p>

              {erros.geral && <p className="mb-3 text-[13px] text-pet-orange">{erros.geral}</p>}

              {etapa === 'quem' && (
                <>
                  <Campo rotulo="Nome completo" obrigatorio erro={erros.nomeCompleto} hint="Como no documento">
                    <input className={`${classeInput} ${erros.nomeCompleto ? classeInputErro : ''}`} value={form.nomeCompleto} onChange={(e) => setCampo('nomeCompleto', e.target.value)} />
                  </Campo>
                  <label className="mb-3 flex items-center gap-2 text-[13px] text-pet-navy">
                    <input type="checkbox" checked={form.usaNomeSocial} onChange={(e) => setCampo('usaNomeSocial', e.target.checked)} />
                    Quero usar nome social
                  </label>
                  {form.usaNomeSocial && (
                    <Campo rotulo="Nome social" obrigatorio hint="Aparece no crachá e no comprovante" erro={erros.nomeSocial}>
                      <input className={classeInput} value={form.nomeSocial} onChange={(e) => setCampo('nomeSocial', e.target.value)} />
                    </Campo>
                  )}
                  <Campo rotulo="Gênero" obrigatorio erro={erros.genero}>
                    <select className={classeInput} value={form.genero} onChange={(e) => setCampo('genero', e.target.value)}>
                      <option value="">Selecione</option>
                      {GENEROS.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </Campo>
                  <div className="grid grid-cols-2 gap-3">
                    <Campo rotulo="Nascimento" obrigatorio erro={erros.nascimento}>
                      <input type="date" className={classeInput} value={form.nascimento} onChange={(e) => setCampo('nascimento', e.target.value)} />
                    </Campo>
                    <Campo rotulo="CPF" obrigatorio erro={erros.cpf}>
                      <input className={classeInput} value={form.cpf} onChange={(e) => setCampo('cpf', mascaraCpfInput(e.target.value))} placeholder="000.000.000-00" />
                    </Campo>
                  </div>
                </>
              )}

              {etapa === 'contato' && (
                <>
                  <Campo rotulo="E-mail" obrigatorio hint="Será o seu login e onde chega o comprovante" erro={erros.email}>
                    <input
                      type="email"
                      className={`${classeInput} ${emailExiste ? classeInputErro : ''}`}
                      value={form.email}
                      onChange={(e) => {
                        setEmailExiste(false)
                        setCampo('email', e.target.value)
                      }}
                      onBlur={checarEmail}
                    />
                  </Campo>
                  {emailExiste && (
                    <div className="mb-3 border border-pet-navy/15 bg-white p-3 text-[13px] text-pet-navy">
                      Este e-mail já tem cadastro. Entre na sua conta para se inscrever.
                      <div className="mt-2 flex gap-2">
                        <Link to="/entrar" onClick={resetarEFechar} className="bg-pet-navy px-3 py-1.5 text-[12px] font-semibold text-white">
                          Entrar
                        </Link>
                      </div>
                    </div>
                  )}
                  <Campo rotulo="Telefone / WhatsApp" obrigatorio erro={erros.telefone}>
                    <input className={classeInput} value={form.telefone} onChange={(e) => setCampo('telefone', mascaraTel(e.target.value))} placeholder="(91) 90000-0000" />
                  </Campo>
                  <Campo rotulo="Crie uma senha" obrigatorio hint="Mínimo de 8 caracteres" erro={erros.senha}>
                    <input type="password" className={classeInput} value={form.senha} onChange={(e) => setCampo('senha', e.target.value)} />
                  </Campo>
                  <Campo rotulo="Repita a senha" obrigatorio erro={erros.senha2}>
                    <input type="password" className={classeInput} value={form.senha2} onChange={(e) => setCampo('senha2', e.target.value)} />
                  </Campo>
                </>
              )}

              {etapa === 'atividades' && (
                <>
                  {!eventoInicial && eventos.length > 1 && (
                    <div className="mb-4">
                      <p className="mb-2 text-[12px] font-semibold text-pet-navy">Evento</p>
                      <div className="space-y-1.5">
                        {eventos.map((e) => (
                          <label
                            key={e.id}
                            className={`flex items-start gap-2 border px-2.5 py-2 text-[13px] text-pet-navy ${eventoId === e.id ? 'border-pet-navy bg-white' : 'border-pet-navy/15'}`}
                          >
                            <input type="radio" name="evento" className="mt-0.5" checked={eventoId === e.id} onChange={() => escolherEvento(e.id)} />
                            <span className="min-w-0 flex-1">
                              <span className="block font-semibold text-pet-deep">{e.nome}</span>
                              <span className="block text-[11.5px] text-pet-navy/60">
                                {formatarPeriodo(e.dataInicio, e.dataFim)} · {rotuloTaxa(e.taxa)}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {!eventos.length && !erros.geral && (
                    <p className="text-[13px] text-pet-navy/70">Nenhum evento com inscrição aberta no momento.</p>
                  )}
                  {erros.evento && <p className="mb-3 text-[13px] text-pet-orange">{erros.evento}</p>}
                  {jaInscrito && (
                    <Link to="/minha-inscricao" onClick={resetarEFechar} className="mb-3 inline-block text-[13px] text-pet-navy underline">
                      Ver minhas inscrições
                    </Link>
                  )}

                  {evento && !jaInscrito && (
                    <>
                      <p className="mb-3 border border-pet-navy/15 bg-white px-3 py-2 text-[12.5px] text-pet-navy/75">
                        <b className="text-pet-deep">{evento.nome}</b>
                        <br />
                        {formatarPeriodo(evento.dataInicio, evento.dataFim)}
                        {evento.local && ` · ${evento.local}`}
                        <br />
                        Taxa de inscrição: <b className="text-pet-deep">{rotuloTaxa(evento.taxa)}</b>
                      </p>
                      {evento.atividades.length === 0 ? (
                        <p className="text-[13px] text-pet-navy/70">
                          Este evento não tem atividades para escolher. A inscrição vale para o evento todo.
                        </p>
                      ) : (
                        <>
                          <p className="mb-2 text-[13px] text-pet-navy/70">
                            Marque as atividades que quer acompanhar. As que têm limite mostram as vagas.
                          </p>
                          {dias.length > 1 && (
                            <div className="mb-3 flex gap-1 overflow-x-auto">
                              {dias.map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => setDia(d)}
                                  className={`flex-1 whitespace-nowrap px-2 py-1.5 text-[11px] font-semibold uppercase ${diaAtivo === d ? 'bg-pet-navy text-white' : 'border border-pet-navy/20 text-pet-navy'}`}
                                >
                                  {dataCurta(d)}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="space-y-2">
                            {evento.atividades
                              .filter((a) => a.data === diaAtivo)
                              .map((a) => (
                                <label key={a.id} className={`flex items-start gap-2 border px-2.5 py-2 text-[13px] ${a.esgotada ? 'border-pet-navy/10 text-pet-navy/40' : 'border-pet-navy/15 text-pet-navy'}`}>
                                  <input
                                    type="checkbox"
                                    className="mt-0.5"
                                    disabled={a.esgotada}
                                    checked={form.atividades.includes(a.id)}
                                    onChange={(e) => {
                                      setCampo(
                                        'atividades',
                                        e.target.checked ? [...form.atividades, a.id] : form.atividades.filter((id) => id !== a.id),
                                      )
                                    }}
                                  />
                                  <span>
                                    {a.horario && <span className="label mr-1.5 text-pet-navy/45">{a.horario}</span>}
                                    {a.titulo}
                                    {a.precoExtra > 0 && <span className="ml-1 text-pet-orange">+ {reais(a.precoExtra)}</span>}
                                    {a.vagas != null && !a.esgotada && (
                                      <span className="ml-1 text-[11px] text-pet-navy/45">{a.vagas - a.ocupadas} vagas</span>
                                    )}
                                    {a.esgotada && <span className="ml-1 uppercase">esgotado</span>}
                                  </span>
                                </label>
                              ))}
                          </div>
                          <p className="mt-2 text-[11px] text-pet-navy/45">{form.atividades.length} selecionadas no total</p>
                        </>
                      )}
                    </>
                  )}
                </>
              )}

              {etapa === 'confira' && (
                <>
                  {logado ? (
                    <BlocoRevisao titulo="Participante">
                      <p>{participante?.nome}</p>
                      <p>{participante?.email}</p>
                    </BlocoRevisao>
                  ) : (
                    <>
                      <BlocoRevisao titulo="Dados pessoais" aoEditar={() => setPasso(etapas.indexOf('quem'))}>
                        <p>{form.nomeCompleto}</p>
                        {form.usaNomeSocial && <p>Nome social: {form.nomeSocial}</p>}
                        <p>{form.genero} · {form.nascimento.split('-').reverse().join('/')}</p>
                      </BlocoRevisao>
                      <BlocoRevisao titulo="Contato" aoEditar={() => setPasso(etapas.indexOf('contato'))}>
                        <p>{form.email}</p>
                        <p>{form.telefone}</p>
                      </BlocoRevisao>
                    </>
                  )}
                  <BlocoRevisao titulo="Evento" aoEditar={() => setPasso(etapas.indexOf('atividades'))}>
                    <p className="font-semibold">{evento?.nome}</p>
                    <p>{evento && formatarPeriodo(evento.dataInicio, evento.dataFim)}</p>
                    <p>Taxa: {rotuloTaxa(evento?.taxa)}</p>
                  </BlocoRevisao>
                  {evento?.atividades.length > 0 && (
                    <BlocoRevisao titulo={`${escolhidas.length} atividades`} aoEditar={() => setPasso(etapas.indexOf('atividades'))}>
                      {escolhidas.length ? escolhidas.map((a) => <p key={a.id}>{a.titulo}</p>) : <p>Nenhuma selecionada</p>}
                    </BlocoRevisao>
                  )}
                  {!logado && (
                    <>
                      <label className="mt-2 flex items-start gap-2 text-[13px] text-pet-navy">
                        <input type="checkbox" className="mt-0.5" checked={form.aceiteLgpd} onChange={(e) => setCampo('aceiteLgpd', e.target.checked)} />
                        <span>
                          Li e aceito a <Link to="/privacidade" className="underline" onClick={fechar}>política de privacidade</Link>
                          <span className="text-pet-orange"> *</span>
                        </span>
                      </label>
                      {erros.aceiteLgpd && <p className="mt-1 text-[11px] text-pet-orange">{erros.aceiteLgpd}</p>}
                    </>
                  )}
                </>
              )}

              {etapa === 'pagamento' && insc?.status === 'pago' && (
                <div className="text-center">
                  <p className="text-3xl text-pet-navy">✓</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-display text-pet-deep">Inscrição confirmada</h2>
                  <p className="mt-1 text-[13px] text-pet-navy/70">Enviamos o comprovante para {participante?.email}</p>
                  <p className="my-4 border border-pet-navy/15 bg-white px-3 py-2 text-left text-[13px]">
                    <span className="label text-pet-navy/40">Evento</span>
                    <br />
                    <b>{insc.evento.nome}</b>
                    <br />
                    <span className="label text-pet-navy/40">Nº do participante</span>
                    <br />
                    <b>{participante?.numero}</b>
                  </p>
                  <AvisoDocumento />
                  <Link to="/minha-inscricao" onClick={resetarEFechar} className="mt-4 inline-block bg-pet-orange px-4 py-2.5 text-[13px] font-semibold text-white">
                    Ver minhas inscrições
                  </Link>
                </div>
              )}

              {etapa === 'pagamento' && insc?.status === 'aguardando_gratuidade' && (
                <div>
                  <h2 className="text-lg font-semibold text-pet-deep">Pedido enviado</h2>
                  <p className="mt-1 text-[13px] text-pet-navy/70">
                    A organização vai analisar a gratuidade. Você acompanha o status em Minhas inscrições.
                  </p>
                  <Link to="/minha-inscricao" onClick={resetarEFechar} className="mt-4 inline-block bg-pet-navy px-4 py-2.5 text-[13px] font-semibold text-white">
                    Acompanhar
                  </Link>
                </div>
              )}

              {etapa === 'pagamento' && insc?.status === 'aguardando_pix' && (
                <div className="text-center">
                  <p className="label text-pet-navy/45">Pague com Pix</p>
                  <p className="mt-1 text-lg font-semibold text-pet-deep">
                    {reais(insc.valor)}
                  </p>
                  {insc.pix?.qrcode ? (
                    <img src={insc.pix.qrcode} alt="QR Code Pix" className="mx-auto my-3 h-40 w-40" />
                  ) : (
                    <div className="mx-auto my-3 grid h-40 w-40 place-items-center bg-pet-navy/10 text-[11px] text-pet-navy/50">
                      QR Code Pix
                    </div>
                  )}
                  <p className="break-all border border-pet-navy/15 bg-white px-2 py-2 text-left text-[11px] text-pet-navy/70">
                    {insc.pix?.payload}
                  </p>
                  <button
                    type="button"
                    className="mt-2 w-full border border-pet-navy/20 py-2 text-[13px] font-semibold text-pet-navy"
                    onClick={() => navigator.clipboard.writeText(insc.pix?.payload || '')}
                  >
                    Copiar código Pix
                  </button>
                  <p className="mt-3 text-[12px] text-pet-navy/50">Aguardando pagamento… o código vale por 30 min</p>
                  <button type="button" onClick={simularPix} className="mt-2 text-[11px] text-pet-navy/40 underline">
                    Simular pagamento (sem chave Asaas)
                  </button>
                  <button
                    type="button"
                    className="mt-4 block w-full text-[12px] text-pet-navy/60 underline"
                    onClick={() => setModoPagamento(modoPagamento === 'pix' ? 'gratuidade' : 'pix')}
                  >
                    {modoPagamento === 'pix' ? 'Não posso pagar — pedir gratuidade' : 'Voltar ao Pix'}
                  </button>
                  {modoPagamento === 'gratuidade' && (
                    <div className="mt-3 text-left">
                      <textarea
                        className={`${classeInput} h-24 py-2`}
                        placeholder="Conte por que pede isenção da taxa"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                      />
                      <button type="button" disabled={enviando} onClick={pedirGratuidade} className="mt-2 w-full bg-pet-navy py-2.5 text-[13px] font-semibold text-white">
                        Enviar pedido
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {etapa !== 'pagamento' && (
              <footer className="flex gap-2 border-t border-pet-navy/10 px-4 py-3">
                {passo > 0 && (
                  <button type="button" onClick={() => setPasso((n) => n - 1)} className="flex-1 border border-pet-navy/20 py-2.5 text-[13px] font-semibold text-pet-navy">
                    Voltar
                  </button>
                )}
                <button
                  type="button"
                  disabled={enviando || (etapa === 'contato' && emailExiste)}
                  onClick={avancar}
                  className="flex-[2] bg-pet-orange py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
                >
                  {etapa !== 'confira' ? 'Continuar' : total > 0 ? `Ir para pagamento · ${reais(total)}` : 'Confirmar inscrição'}
                </button>
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function BlocoRevisao({ titulo, aoEditar, children }) {
  return (
    <div className="mb-2 border border-pet-navy/15 bg-white px-3 py-2.5 text-[13px] text-pet-navy">
      <div className="mb-1 flex justify-between">
        <span className="label text-pet-navy/40">{titulo}</span>
        {aoEditar && (
          <button type="button" onClick={aoEditar} className="text-[11px] text-pet-navy/50">
            editar
          </button>
        )}
      </div>
      {children}
    </div>
  )
}
