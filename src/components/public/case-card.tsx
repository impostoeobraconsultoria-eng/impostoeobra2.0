import type { PublicCase } from "@/lib/public-content";

export function PublicCaseCard({ item }: { item: PublicCase }) {
  return (
    <article className="border-b border-border py-9 md:border-r md:px-8 md:first:pl-0">
      {item.imagem_url && (
        <div
          role="img"
          aria-label={`Imagem do case ${item.cliente_display}`}
          className="mb-7 aspect-video bg-slate-100 bg-cover bg-center"
          style={{ backgroundImage: `url("${item.imagem_url}")` }}
        />
      )}
      <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.12em] text-primary">
            {item.tipo_obra || "Regularização"}
          </p>
          <h2 className="mt-2 text-xl font-bold">{item.cliente_display}</h2>
        </div>
        {item.economia_pct != null && (
          <strong className="shrink-0 text-2xl text-accent">
            −{formatPercent(item.economia_pct)}
          </strong>
        )}
      </div>
      <p className="mt-7 text-4xl font-extrabold tracking-[-.05em] text-text">
        {formatMoney(item.economia_valor)}
      </p>
      <p className="mt-2 text-sm uppercase tracking-[.1em] text-brandMuted">
        economizados
      </p>
      {item.descricao && (
        <p className="mt-6 leading-7 text-brandMuted">
          {truncate(item.descricao, 200)}
        </p>
      )}
    </article>
  );
}

function formatMoney(value: number | null) {
  return value == null
    ? "Economia comprovada"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(value);
}

function formatPercent(value: number) {
  return `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function truncate(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}
