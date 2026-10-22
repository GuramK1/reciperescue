import Link from "next/link";
import { ArrowRight, Sprout } from "lucide-react";

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
          <p className="lede">
            Dough that tears. A sauce that splits. Tell us what happened, and
            work out what to try next.
          </p>
          <Link className="button" href="/rescue">
            Rescue my recipe <ArrowRight size={19} aria-hidden="true" />
          </Link>
          <p className="small muted">
            Start with what’s in your bowl. No account needed.
          </p>
        </div>
        <div className="example-preview">
          <div className="preview-top">
            <h2>“My dough keeps tearing.”</h2>
            <Sprout size={28} strokeWidth={1.6} aria-hidden="true" />
          </div>
          <div className="example-meta">
            <span className="badge">Illustrative example</span>
            <span>Cinnamon rolls · Kneading</span>
          </div>
          <hr />
          <h3>Before adding more flour…</h3>
          <p>
            The flour type, ingredient amounts, and how you’re kneading can
            change the next step.
          </p>
          <div className="example-question">
            <strong>One useful question</strong>
            <p>
              What flour did you use, and how much flour and milk are in the
              dough?
            </p>
          </div>
          <Link href="/rescue?example=1" className="text-link">
            Try this example <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>
      <section className="how-it-works">
        <h2>From “what went wrong?” to “what next?”</h2>
        <ol className="journey">
          <li>
            <h3>Tell us the story</h3>
            <p>Your dish, ingredients, and where things went off track.</p>
          </li>
          <li>
            <h3>Fill in what matters</h3>
            <p>A focused question when the details could change the advice.</p>
          </li>
          <li>
            <h3>Try a practical next step</h3>
            <p>A clear plan, honest limits, and signs to look for.</p>
          </li>
        </ol>
      </section>
      <section className="common-problems">
        <h2>Something feel off?</h2>
        <div className="problem-links">
          {[
            "My sauce separated",
            "My cake is raw in the middle",
            "I added too much sugar",
          ].map((problem) => (
            <Link
              href={`/rescue?problem=${encodeURIComponent(problem)}`}
              key={problem}
            >
              {problem}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
