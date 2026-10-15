"use client";

import { useActionState, useEffect, useState } from "react";
import { inscreverSorteio } from "@/acoes/publico/sorteio";
import { CANAIS_SORTEIO } from "@/dominio/sorteio/inscricao";
import { erroPt } from "@/lib/erros-pt";
import { FORM_INICIAL } from "@/lib/forms";
import { cn } from "@/lib/utils";

type Produto = { id: string; nome: string };

// A página pública tem cores fixas (não segue o cookie de tema do ERP), por isso não usa Campo
// nem SelectNativo do painel.
const CAMPO =
  "block w-full rounded-[4px] border border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3 text-base text-white placeholder:text-[#6F7781] outline-none transition focus:border-[#00D8FF] focus:ring-2 focus:ring-[#00D8FF]/30";
const ROTULO = "mb-1.5 block text-sm font-semibold text-[#F2F4F6]";

function Erro({ chave, id }: { chave?: string; id: string }) {
  const texto = erroPt(chave);
  if (!texto) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-[#FF7A7A]">
      {texto}
    </p>
  );
}

export function FormSorteio({
  produtos,
  whatsappUrl,
  via,
}: {
  produtos: Produto[];
  whatsappUrl: string;
  via: string;
}) {
  const [estado, acao, pendente] = useActionState(inscreverSorteio, FORM_INICIAL);
  const [outro, setOutro] = useState(false);

  if (estado.ok) return <Confirmacao whatsappUrl={whatsappUrl} />;

  return (
    <form action={acao} className="space-y-5" noValidate>
      <input type="hidden" name="via" value={via} />
      {/* Campo armadilha para robôs: fora da tela e fora da ordem de foco. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
        <label>
          Site
          <input type="text" name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label htmlFor="nome" className={ROTULO}>
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          className={CAMPO}
          autoComplete="name"
          maxLength={160}
          aria-describedby="erro-nome"
          aria-invalid={Boolean(estado.erros.nome)}
        />
        <Erro id="erro-nome" chave={estado.erros.nome} />
      </div>

      <div>
        <label htmlFor="email" className={ROTULO}>
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          className={CAMPO}
          autoComplete="email"
          maxLength={160}
          aria-describedby="erro-email"
          aria-invalid={Boolean(estado.erros.email)}
        />
        <Erro id="erro-email" chave={estado.erros.email} />
      </div>

      <div>
        <label htmlFor="telefone" className={ROTULO}>
          WhatsApp
        </label>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          inputMode="tel"
          className={CAMPO}
          autoComplete="tel-national"
          placeholder="(31) 99999-9999"
          maxLength={40}
          aria-describedby="erro-telefone"
          aria-invalid={Boolean(estado.erros.telefone)}
        />
        <Erro id="erro-telefone" chave={estado.erros.telefone} />
      </div>

      <fieldset>
        <legend className={ROTULO}>Onde você comprou</legend>
        <div className="grid grid-cols-3 gap-2">
          {CANAIS_SORTEIO.map((c) => (
            <label
              key={c.tipo}
              className="relative flex cursor-pointer items-center justify-center rounded-[4px] border border-[#2A2A2A] bg-[#0A0A0A] px-2 py-3 text-center text-sm font-semibold text-[#F2F4F6] transition has-[:checked]:border-[#00D8FF] has-[:checked]:bg-[#00D8FF]/10 has-[:checked]:text-[#00D8FF] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#00D8FF]/40"
            >
              <input
                type="radio"
                name="canal"
                value={c.tipo}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              />
              {c.rotulo}
            </label>
          ))}
        </div>
        <Erro id="erro-canal" chave={estado.erros.canal} />
      </fieldset>

      <div>
        <label htmlFor="produto_id" className={ROTULO}>
          Qual produto você comprou
        </label>
        <select
          id="produto_id"
          name="produto_id"
          className={cn(CAMPO, "appearance-none")}
          defaultValue=""
          onChange={(e) => setOutro(e.currentTarget.value === "outro")}
          aria-describedby="erro-produto_id"
          aria-invalid={Boolean(estado.erros.produto_id)}
        >
          <option value="">Escolha na lista</option>
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
          <option value="outro">Outro produto</option>
        </select>
        <Erro id="erro-produto_id" chave={estado.erros.produto_id} />
        {outro && (
          <div className="mt-3">
            <label htmlFor="produto_outro" className={ROTULO}>
              Qual produto
            </label>
            <input
              id="produto_outro"
              name="produto_outro"
              className={CAMPO}
              maxLength={120}
              placeholder="Escreva o nome que aparece no seu pedido"
              aria-describedby="erro-produto_outro"
            />
            <Erro id="erro-produto_outro" chave={estado.erros.produto_outro} />
          </div>
        )}
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-[#A3AAB3]">
          <input
            type="checkbox"
            name="aceita_contato"
            className="mt-0.5 size-5 shrink-0 accent-[#00D8FF]"
            aria-describedby="erro-aceita_contato"
          />
          <span>
            Aceito receber mensagens da FCS 3D STUDIO sobre o sorteio e novidades. Posso sair a
            qualquer momento.
          </span>
        </label>
        <Erro id="erro-aceita_contato" chave={estado.erros.aceita_contato} />
      </div>

      <Erro id="erro-form" chave={estado.erros._form} />

      <button
        type="submit"
        disabled={pendente}
        className="w-full rounded-[4px] bg-[#00D8FF] px-6 py-4 text-base font-bold tracking-wide text-[#0A0A0A] uppercase transition hover:shadow-[0_0_24px_rgba(0,216,255,0.35)] disabled:opacity-60"
      >
        {pendente ? "Enviando..." : "Cadastrar e entrar no grupo"}
      </button>
    </form>
  );
}

function Confirmacao({ whatsappUrl }: { whatsappUrl: string }) {
  useEffect(() => {
    if (!whatsappUrl) return;
    const t = setTimeout(() => window.location.assign(whatsappUrl), 2000);
    return () => clearTimeout(t);
  }, [whatsappUrl]);
  return (
    <div role="status" className="space-y-5 text-center">
      <p className="font-titulo text-2xl font-bold text-[#00D8FF] uppercase">Cadastro feito.</p>
      <p className="text-base text-[#F2F4F6]">
        Você já está concorrendo. Agora é só entrar no grupo.
      </p>
      {whatsappUrl ? (
        <>
          <a
            href={whatsappUrl}
            className="block w-full rounded-[4px] bg-[#00D8FF] px-6 py-4 text-base font-bold tracking-wide text-[#0A0A0A] uppercase"
          >
            Entrar no grupo do WhatsApp
          </a>
          <p className="text-sm text-[#A3AAB3]">Abrindo o WhatsApp em instantes.</p>
        </>
      ) : (
        <p className="text-sm text-[#A3AAB3]">O link do grupo chega por WhatsApp em breve.</p>
      )}
    </div>
  );
}
