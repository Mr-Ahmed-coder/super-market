function PlaceholderPage({ title }) {
  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <p className="eyebrow">Module</p>
          <h1>{title}</h1>
          <p>This workspace is ready for the next phase of supermarket operations.</p>
        </div>
      </section>

      <article className="panel-card empty-state">
        <h2>{title} module</h2>
        <p>Phase 1 has routing, access control, and layout prepared for this section.</p>
      </article>
    </div>
  );
}

export default PlaceholderPage;
