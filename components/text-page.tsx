export function TextPage({ title, sections }: { title: string; sections: { heading?: string; body: string }[] }) {
  return (
    <div className="page">
      <article className="max-w-[36em]">
        <h1 className="text-3xl">{title}</h1>
        {sections.map((s, i) => (
          <section key={i} className="mt-10">
            {s.heading ? <h2 className="text-xl">{s.heading}</h2> : null}
            <p className="mt-3 whitespace-pre-line text-ink-2">{s.body}</p>
          </section>
        ))}
      </article>
    </div>
  );
}
