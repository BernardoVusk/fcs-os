import Link from "next/link";

export function Tags({ tags, link = true }: { tags: string[]; link?: boolean }) {
  if (tags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map((tag) =>
        link ? (
          <li key={tag}>
            <Link
              href={`/conhecimento?tag=${encodeURIComponent(tag)}`}
              className="inline-flex h-6 items-center rounded-full bg-superficie-2 px-2.5 text-xs text-texto-2 transition-colors hover:bg-superficie-3 hover:text-texto"
            >
              {tag}
            </Link>
          </li>
        ) : (
          <li key={tag} className="inline-flex h-6 items-center rounded-full bg-superficie-2 px-2.5 text-xs text-texto-2">
            {tag}
          </li>
        ),
      )}
    </ul>
  );
}
