import { Link } from 'react-router-dom'

export default function Privacidade() {
  return (
    <div className="min-h-full bg-pet-paper px-4 py-8">
      <article className="mx-auto max-w-2xl text-[14px] leading-relaxed text-pet-navy">
        <p className="label text-pet-navy/40">LGPD</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-display text-pet-deep">Política de privacidade</h1>
        <p className="mt-4">
          Este formulário coleta nome, nome social (se houver), gênero, data de nascimento, CPF, e-mail e telefone
          para organizar o credenciamento nos eventos do PET Saúde Digital e emitir o comprovante de inscrição.
        </p>
        <p className="mt-3">
          Os dados ficam no servidor do programa até o encerramento da edição acadêmica e não são vendidos. O e-mail é
          o identificador da inscrição. Para correção ou exclusão, fale com a organização.
        </p>
        <p className="mt-3 text-pet-navy/60">Protótipo acadêmico — conteúdo fictício, sem vínculo oficial com a UEPA.</p>
        <Link to="/" className="mt-6 inline-block text-pet-orange">← Voltar</Link>
      </article>
    </div>
  )
}
