import Link from "next/link";

export default function Home() {
  return (
    <main id="main" className="page landing">
      <section className="hero">
        <div className="hero-copy">
          <h1>
            A kitchen mishap.
            <br />
            Not a lost cause.
          </h1>
          <p className="muted">
            Dough that tears. A sauce that splits. Tell us what happened and
            work out what to try next.
          </p>
          <Link className="button" href="/rescue">
            Rescue my recipe
          </Link>
          <p className="small muted">
            No account needed. Start with what you know.
          </p>
        </div>
        <div className="example-preview">
          <h2>My dough keeps tearing.</h2>
          <p className="muted">Cinnamon rolls · Kneading</p>
          <hr />
          <div className="example-observation">
            <strong>What happened</strong>
            <p>It feels soft, but splits when I stretch it.</p>
          </div>
          <div className="example-question">
            <strong>Before adding more flour</strong>
            <p>What flour did you use, and how much flour and milk went in?</p>
          </div>
          <Link href="/rescue?example=1" className="button secondary">
            Try the cinnamon-roll example
          </Link>
          <p className="small muted">
            Illustrative example. Demo mode makes no AI request.
          </p>
        </div>
      </section>
      <section className="split-section common-problems">
        <div>
          <h2>
            Something
            <br />
            feel off?
          </h2>
          <p className="muted">
            Start with the symptom. The recipe details help narrow down what
            matters.
          </p>
        </div>
        <div className="problem-links">
          {[
            [
              "Dough that won’t cooperate",
              "Tearing, sticky, dense or hard to shape",
              "My dough keeps tearing",
            ],
            [
              "A sauce that has separated",
              "Grainy texture, oil pooling or lost thickness",
              "My sauce separated",
            ],
            [
              "A bake that looks wrong",
              "Uneven texture, a sunken middle or changed ingredients",
              "My bake has an uneven texture",
            ],
          ].map(([title, description, problem]) => (
            <Link
              href={`/rescue?problem=${encodeURIComponent(problem)}`}
              key={title}
            >
              <h3>{title}</h3>
              <p>{description}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="how-it-works" id="how-it-works">
        <h2>From the problem to the next step.</h2>
        <ol className="journey">
          <li>
            <h3>Tell us the story</h3>
            <p>
              Your dish, ingredients and where things went off track. Unknown
              amounts can stay blank.
            </p>
          </li>
          <li>
            <h3>Fill in what matters</h3>
            <p>
              Answer a focused question when a missing detail could change the
              advice.
            </p>
          </li>
          <li>
            <h3>Try an observable next step</h3>
            <p>
              Read practical instructions, what to look for, and when to stop.
            </p>
          </li>
        </ol>
      </section>
      <section className="landing-limits" aria-label="Safety and privacy">
        <div>
          <h2>Not every dish can be rescued.</h2>
          <p>
            Spoilage or unsafe storage changes the answer. A photograph cannot
            tell us whether food is safe to eat.
          </p>
        </div>
        <div>
          <h2>Know what you’re sharing.</h2>
          <p>
            Live analysis sends recipe details and any photo to the configured
            AI provider. The demo makes no AI request.
          </p>
        </div>
      </section>
      <section className="split-section before-you-start">
        <h2>A couple of useful things.</h2>
        <div className="answers">
          <div>
            <h3>What if I don’t know the amounts?</h3>
            <p>
              Leave them blank. Unknown is more useful than a made-up
              measurement.
            </p>
          </div>
          <div>
            <h3>Do I need a photograph?</h3>
            <p>
              No. The written recipe and what you observed are the starting
              point. Photos are optional when supported.
            </p>
          </div>
          <Link className="button" href="/rescue">
            Start with your recipe
          </Link>
        </div>
      </section>
    </main>
  );
}
