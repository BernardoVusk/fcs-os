import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";

/** Intervalo de datas por GET (funciona sem JavaScript); preserva os outros filtros. */
export function FiltroDatas({
  acao,
  de,
  ate,
  manter = {},
}: {
  acao: string;
  de?: string;
  ate?: string;
  manter?: Record<string, string | string[] | undefined>;
}) {
  return (
    <form method="get" action={acao} className="flex flex-wrap items-end gap-2">
      {Object.entries(manter).flatMap(([k, v]) =>
        (Array.isArray(v) ? v : v ? [v] : []).map((x, i) => (
          <input key={`${k}-${i}`} type="hidden" name={k} value={x} />
        )),
      )}
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-texto-3">De</span>
        <Input type="date" name="de" defaultValue={de} className="h-8 w-auto" />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-texto-3">Até</span>
        <Input type="date" name="ate" defaultValue={ate} className="h-8 w-auto" />
      </label>
      <Button type="submit" size="sm" variant="outline">
        Aplicar datas
      </Button>
    </form>
  );
}
