export default function Loading() {
  // You can add any UI inside Loading, including a Skeleton.
  return (
    <section className="section">
      <div className="container has-text-centered">
        <p className="title is-4">Loading login page...</p>
        <progress className="progress is-small is-primary mt-3" max="100"></progress>
      </div>
    </section>
  );
} 