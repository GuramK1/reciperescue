import type { ReactNode } from "react";
import type { RescueResult } from "@/domain/rescue";
import { safetySource } from "@/domain/safety";

const recoveryLabels = {
  recoverable: "May be recoverable",
  partial: "Partially recoverable",
  unlikely: "Unlikely to recover",
  unsafe: "Unsafe to continue",
  undetermined: "More information needed",
};

export function RescueGuidance({
  result,
  children,
  onEdit,
  busy,
}: {
  result: RescueResult;
  children: ReactNode;
  onEdit: () => void;
  busy: boolean;
}) {
  const { analysis, recipe } = result;
  return (
    <div className="workspace-grid result-grid">
      <section className="result-main" aria-label="Rescue guidance">
        <h2>{analysis.problem}</h2>
        <p
          className={`recovery-status ${analysis.safetyConcern ? "safety-status" : ""}`}
        >
          {recoveryLabels[analysis.recovery]}
        </p>
        <p className="muted">{analysis.uncertainty}</p>
        {analysis.warnings.length > 0 && (
          <div
            className={`notice ${analysis.safetyConcern ? "error-notice" : ""}`}
          >
            <div>
              <h3>Keep in mind</h3>
              <ul>
                {analysis.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {analysis.status === "complete" && analysis.steps.length > 0 && (
          <section className="result-section">
            <h2>Try this next</h2>
            <ol className="rescue-steps">
              {analysis.steps.map((step, index) => (
                <li key={`${index}-${step.title}`}>
                  <span className="step-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.instruction}</p>
                    <p className="checkpoint">
                      <strong>What to look for</strong>
                      <span>{step.checkpoint}</span>
                    </p>
                    {step.caution && (
                      <p className="small muted">{step.caution}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}
        {analysis.questions.length > 0 && (
          <section className="result-section">
            <h2>What we need to know</h2>
            <ul className="questions">
              {analysis.questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </section>
        )}
        {children}
        <section className="result-section">
          <h2>
            {analysis.safetyConcern
              ? "What this means for the recipe"
              : "Why this can happen"}
          </h2>
          <p>{analysis.explanation}</p>
        </section>
        {analysis.prevention.length > 0 && (
          <section className="result-section">
            <h2>For next time</h2>
            <ul>
              {analysis.prevention.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
        )}
        {analysis.alternatives.length > 0 && (
          <details>
            <summary>Other possible explanations</summary>
            <ul>
              {analysis.alternatives.map((alternative) => (
                <li key={alternative}>{alternative}</li>
              ))}
            </ul>
          </details>
        )}
      </section>
      <aside className="context-panel recipe-summary">
        {analysis.safetyConcern && (
          <>
            <h2>A photo can’t establish safety.</h2>
            <p>
              Images may help describe texture. They cannot verify storage,
              contamination or a safe internal temperature.
            </p>
            <a
              className="text-link"
              href={safetySource.url}
              target="_blank"
              rel="noreferrer"
            >
              Read food safety guidance
            </a>
            <hr />
          </>
        )}
        <h2>Your recipe</h2>
        <h3>{recipe.dish}</h3>
        <p className="small">{recipe.stage}</p>
        <hr />
        <ul className="summary-ingredients">
          {recipe.ingredients.map((ingredient, index) => (
            <li key={index}>
              <span>{ingredient.name}</span>
              <span>
                {[ingredient.quantity, ingredient.unit]
                  .filter(Boolean)
                  .join(" ") || "Amount unknown"}
              </span>
            </li>
          ))}
        </ul>
        <hr />
        <h3>What you noticed</h3>
        <p>{recipe.problem}</p>
        {recipe.context && (
          <>
            <h3>Your extra context</h3>
            <p className="preserve-text">{recipe.context}</p>
          </>
        )}
        {analysis.evidence.length > 0 && (
          <>
            <h3>Supporting observations</h3>
            <ul>
              {analysis.evidence.map((observation) => (
                <li key={observation}>{observation}</li>
              ))}
            </ul>
          </>
        )}
        <button
          type="button"
          className="button secondary"
          onClick={onEdit}
          disabled={busy}
        >
          {analysis.safetyConcern ? "Review recipe details" : "Edit recipe"}
        </button>
      </aside>
    </div>
  );
}
