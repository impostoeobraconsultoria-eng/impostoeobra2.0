import { getPublishedFaq } from "@/lib/public-content";

export async function GuideFaq() {
  let questions;
  try {
    questions = await getPublishedFaq();
  } catch (error) {
    console.error("Falha ao renderizar FAQ do guia", error);
    return null;
  }

  if (!questions.length) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      name: item.pergunta,
      acceptedAnswer: { "@type": "Answer", text: item.resposta },
    })),
  };

  return (
    <section aria-labelledby="faq">
      <h2 id="faq">Perguntas frequentes</h2>
      <div className="my-5 space-y-3">
        {questions.map((item) => (
          <details
            className="rounded-xl border border-slate-200 p-5"
            key={item.id}
          >
            <summary className="cursor-pointer font-semibold">
              {item.pergunta}
            </summary>
            <p className="mt-3 whitespace-pre-line text-slate-700">
              {item.resposta}
            </p>
          </details>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
    </section>
  );
}
