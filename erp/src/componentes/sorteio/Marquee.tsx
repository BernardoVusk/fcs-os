import Image from "next/image";

/**
 * Faixa infinita de fotos só com CSS: a lista entra duas vezes no trilho e a animação anda
 * metade da largura (globals.css, .marquee-faixa). Com poucas fotos, a lista é repetida para o
 * trilho ser mais largo que a tela.
 */
export function Marquee({ fotos }: { fotos: readonly string[] }) {
  if (fotos.length === 0) return null;
  const lista = fotos.length < 6 ? [...fotos, ...fotos, ...fotos] : [...fotos];
  return (
    <div className="overflow-hidden" aria-label="Peças impressas no estúdio">
      <div className="marquee-faixa">
        {[0, 1].map((copia) => (
          <ul key={copia} className="flex shrink-0 gap-3 pr-3" aria-hidden={copia === 1}>
            {lista.map((src, i) => (
              <li
                key={`${copia}-${i}`}
                className="relative size-44 shrink-0 overflow-hidden rounded-[4px] bg-[#141414] sm:size-56"
              >
                <Image
                  src={src}
                  alt=""
                  width={640}
                  height={640}
                  sizes="224px"
                  className="size-full object-cover"
                  loading={copia === 0 && i < 4 ? "eager" : "lazy"}
                />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
