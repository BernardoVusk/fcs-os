import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renderiza o conteúdo em markdown com a tipografia do painel. Sem HTML cru. */
export function Markdown({ texto }: { texto: string }) {
  return (
    <div className="prosa max-w-[72ch] text-[15px] leading-7 text-texto">
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
        {texto}
      </ReactMarkdown>
    </div>
  );
}
