import Link from "next/link";
import { safetySource } from "@/domain/safety";
export default function About() {
  return (
    <main id="main" className="page reading">
      <h1>A useful next step, with honest limits.</h1>
      <p className="lede">
        RecipeRescue helps you think through cooking problems using your
        ingredients, preparation stage, and observations.
      </p>
      <h2>How analysis works</h2>
      <p>
        With an AI provider configured, recipe details and optional photos go to
        that provider through the server. A focused question appears when
        important information is missing. Results are checked for structure, but
        model advice can still be wrong.
      </p>
      <h2>Demo mode</h2>
      <p>
        The cinnamon-roll demo is scripted. Its follow-up shows a fixed
        illustrative plan regardless of your answer. It does not diagnose your
        food and does not contact an AI provider.
      </p>
      <h2>Your recipe and photos</h2>
      <p>
        Recipe text, feedback, and results are stored in this installation’s
        SQLite database for up to 24 hours, then removed on the next database
        operation. A session cookie restricts follow-up access to your browser.
        There is no public rescue listing. Images are decoded, resized, and
        stripped of metadata before being sent to the configured provider; this
        application does not persist images.
      </p>
      <p>
        The configured provider’s own retention policy still applies. Do not
        include personal information. Closing or reloading the page clears the
        visible form; this MVP does not offer a saved-history screen.
      </p>
      <h2>Food safety comes first</h2>
      <p>
        Photos cannot establish food safety. If a possible safety concern is
        identified, RecipeRescue pauses ordinary rescue advice and shows
        maintained guidance. It does not certify that food is safe.
      </p>
      <p>
        <a href={safetySource.url} target="_blank" rel="noreferrer">
          {safetySource.title}
        </a>{" "}
        · reviewed {safetySource.reviewed}
      </p>
      <h2>Self-hosting</h2>
      <p>
        This first release is designed for a local or trusted self-hosted
        environment. Public installations need access control and shared usage
        limits at the gateway.
      </p>
      <Link href="/rescue" className="button">
        Start a rescue
      </Link>
    </main>
  );
}
