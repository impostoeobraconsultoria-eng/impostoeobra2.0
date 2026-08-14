import Link from "next/link";

export function Brand() {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-2.5 text-foreground no-underline hover:no-underline"
      aria-label="Imposto & Obra Consultoria — início"
    >
      <span className="grid size-[38px] place-items-center rounded-lg bg-primary text-lg font-extrabold text-primary-foreground">
        I&amp;O
      </span>
      <span className="text-[18px] font-bold leading-[1.1]">
        Imposto &amp; Obra
        <small className="block text-xs font-medium text-muted-foreground">
          Consultoria
        </small>
      </span>
    </Link>
  );
}
