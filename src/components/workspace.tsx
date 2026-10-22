"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  ImagePlus,
  LoaderCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  exampleRecipe,
  recipeSchema,
  stages,
  type Recipe,
  type RescueResult,
} from "@/domain/rescue";
import { RescueGuidance } from "./rescue-guidance";

type Settings = { demo: boolean; images: boolean; configured: boolean };
type FieldProps = {
  label: string;
  id: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
};
function Field({ label, id, hint, error, children }: FieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint && (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
const blankRecipe: Recipe = {
  dish: "",
  ingredients: [{ name: "", quantity: "", unit: "" }],
  stage: "Preparing",
  problem: "",
  context: "",
  safetyConcern: "no",
};

export function Workspace({
  settings,
  loadExample,
  initialProblem,
}: {
  settings: Settings;
  loadExample: boolean;
  initialProblem: string;
}) {
  const [recipe, setRecipe] = useState<Recipe>(() =>
    loadExample
      ? structuredClone(exampleRecipe)
      : { ...structuredClone(blankRecipe), problem: initialProblem },
  );
  const [result, setResult] = useState<RescueResult | null>(null);
  const [feedback, setFeedback] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const errorBox = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (result) resultHeading.current?.focus();
  }, [result]);
  useEffect(() => {
    if (error || Object.keys(errors).length) errorBox.current?.focus();
  }, [error, errors]);

  function update<K extends keyof Recipe>(key: K, value: Recipe[K]) {
    setRecipe((r) => ({ ...r, [key]: value }));
  }
  function ingredient(
    index: number,
    key: keyof Recipe["ingredients"][number],
    value: string,
  ) {
    setRecipe((r) => ({
      ...r,
      ingredients: r.ingredients.map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    }));
  }
  function loadExampleRecipe() {
    setRecipe(structuredClone(exampleRecipe));
    setErrors({});
    setError("");
    setFile(null);
    setPreview("");
    setPhotoError("");
    if (fileInput.current) fileInput.current.value = "";
  }
  function selectImage(selected?: File) {
    setPhotoError("");
    setFile(null);
    setPreview("");
    if (!selected) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(selected.type) ||
      selected.size > 5 * 1024 * 1024
    ) {
      setPhotoError("Choose a JPG, PNG, or WebP image up to 5 MB.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setErrors({});
    setError("");
    setCancelled(false);
    if (!result) {
      const parsed = recipeSchema.safeParse(recipe);
      if (!parsed.success) {
        setErrors(
          Object.fromEntries(
            parsed.error.issues.map((i) => [i.path.join("."), i.message]),
          ),
        );
        return;
      }
    } else if (feedback.trim().length < 3) {
      setError("Tell us a little more about what you observed.");
      return;
    }
    const data = new FormData();
    data.set(
      "payload",
      JSON.stringify(result ? { rescueId: result.id, feedback } : { recipe }),
    );
    if (file && !result) data.set("image", file);
    controller.current = new AbortController();
    setBusy(true);
    try {
      const response = await fetch("/api/rescue", {
        method: "POST",
        body: data,
        signal: controller.current.signal,
      });
      const output = await response.json().catch(() => {
        throw new Error(
          "The server returned an unreadable response. Your recipe is still here; try again.",
        );
      });
      if (!response.ok)
        throw new Error(
          output.error || "The rescue could not be completed. Try again.",
        );
      setResult(output);
      setFeedback("");
    } catch (err) {
      if (controller.current?.signal.aborted) setCancelled(true);
      else
        setError(
          err instanceof Error
            ? err.message
            : "We couldn’t connect. Check your connection and try again.",
        );
    } finally {
      setBusy(false);
    }
  }
  const busyStatus = busy ? (
    <div className="loading-status" role="status">
      <LoaderCircle size={20} aria-hidden="true" className="spinner" />
      <span>Looking at your recipe…</span>
      <button
        type="button"
        className="text-link"
        onClick={() => controller.current?.abort()}
      >
        Cancel
      </button>
    </div>
  ) : null;
  const errorStatus = (error || Object.keys(errors).length > 0) && (
    <div
      className="notice error-notice"
      role="alert"
      ref={errorBox}
      tabIndex={-1}
    >
      <CircleAlert size={22} aria-hidden="true" />
      <div>
        <strong>{error || "Review a few recipe details"}</strong>
        {Object.keys(errors).length > 0 && (
          <ul>
            {Object.entries(errors).map(([key, value]) => (
              <li
                key={key}
                id={
                  key.startsWith("ingredients.")
                    ? `${key.replaceAll(".", "-")}-error`
                    : undefined
                }
              >
                <a
                  href={`#${key.startsWith("ingredients.") ? key.replaceAll(".", "-") : key}`}
                >
                  {value}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
  const modeNotice = (
    <div className="mode-notice">
      <span className="badge">
        {settings.demo ? "Demo · no AI analysis" : "AI-assisted guidance"}
      </span>
      {settings.demo && (
        <span>The demo uses a scripted cinnamon-roll example.</span>
      )}
    </div>
  );

  return (
    <main id="main" className="page workspace">
      {result ? (
        <>
          <button
            type="button"
            className="back-link"
            disabled={busy}
            onClick={() => {
              setResult(null);
              setError("");
              setFeedback("");
              setCancelled(false);
            }}
          >
            {" "}
            <ArrowLeft size={18} aria-hidden="true" /> Edit recipe & start again
          </button>
          <div className="page-intro">
            <span className="badge">
              {result.mode === "demo"
                ? "Demo · illustrative guidance"
                : result.mode === "safety"
                  ? "Food-safety guidance"
                  : "AI-assisted guidance"}
            </span>
            <h1 ref={resultHeading} tabIndex={-1}>
              {result.analysis.status === "needs_more_information"
                ? "One detail before we go on."
                : "A way forward for your recipe."}
            </h1>
            <p className="lede compact">
              {result.recipe.dish} · {result.recipe.stage}
            </p>
            {result.mode === "demo" && (
              <p className="small muted">
                Scripted example, not an assessment of your food. Updates show
                the same example plan.
              </p>
            )}
          </div>
          {errorStatus}
          {cancelled && (
            <p role="status">
              Request cancelled. Your recipe and previous guidance are still
              here.
            </p>
          )}
          {!result.saved && (
            <div className="notice error-notice" role="alert">
              <CircleAlert size={22} aria-hidden="true" />
              <p>
                Your guidance is ready, but it couldn’t be saved. Follow-up is
                unavailable. Keep this page open or start again after checking
                database storage.
              </p>
            </div>
          )}
          <RescueGuidance result={result}>
            {result.saved && (
              <form onSubmit={submit} className="follow-up" aria-busy={busy}>
                <Field
                  id="feedback"
                  label={
                    result.analysis.status === "needs_more_information"
                      ? "Your answer"
                      : "How did it go?"
                  }
                  hint={
                    result.mode === "safety"
                      ? "Safety concerns remain paused for review. This tool cannot clear food as safe."
                      : "Your original recipe details stay with this rescue."
                  }
                >
                  <textarea
                    id="feedback"
                    aria-describedby="feedback-hint"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    maxLength={2000}
                    rows={4}
                    required
                    minLength={3}
                    placeholder="Tell us what you observed…"
                    disabled={busy}
                  />
                </Field>
                {busyStatus}
                <button
                  className="button"
                  disabled={busy || !feedback.trim()}
                  type="submit"
                >
                  {busy ? "Checking your update…" : "Update the guidance"}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </form>
            )}
          </RescueGuidance>
        </>
      ) : (
        <>
          <div className="page-intro">
            {modeNotice}
            <h1>Let’s work with what you have.</h1>
            <p className="lede compact">
              A few details help us find a useful next step.
            </p>
          </div>
          {!settings.configured && (
            <div className="notice error-notice" role="alert">
              <CircleAlert aria-hidden="true" />
              <p>
                The AI provider isn’t configured. Set the server’s model and
                provider settings, or explicitly enable demo mode.
              </p>
            </div>
          )}
          {errorStatus}
          {cancelled && (
            <p role="status">Request cancelled. Your recipe is still here.</p>
          )}
          <div className="workspace-grid">
            <form onSubmit={submit} noValidate aria-busy={busy}>
              <fieldset disabled={busy} className="form-fields">
                <legend className="sr-only">
                  Your recipe and cooking problem
                </legend>
                <div className="form-toolbar">
                  <p className="small muted">
                    Start from scratch or use a sample.
                  </p>
                  <button
                    type="button"
                    className="text-link"
                    onClick={loadExampleRecipe}
                  >
                    Load cinnamon-roll example
                  </button>
                </div>
                <Field
                  id="dish"
                  label="What are you making?"
                  error={errors.dish}
                >
                  <input
                    id="dish"
                    value={recipe.dish}
                    onChange={(e) => update("dish", e.target.value)}
                    maxLength={120}
                    placeholder="For example, cinnamon rolls"
                    autoComplete="off"
                    aria-invalid={!!errors.dish}
                    aria-describedby={errors.dish ? "dish-error" : undefined}
                  />
                </Field>
                <section
                  className="ingredient-section"
                  aria-labelledby="ingredients-title"
                >
                  <div className="section-heading">
                    <h2 id="ingredients-title">Ingredients</h2>
                    <span className="small muted">
                      {recipe.ingredients.length} / 40
                    </span>
                  </div>
                  <p className="hint" id="ingredients-hint">
                    Add amounts where you know them. Leave unknown amounts
                    blank.
                  </p>
                  <div className="ingredient-headers" aria-hidden="true">
                    <span>Ingredient</span>
                    <span>Amount</span>
                    <span>Unit</span>
                    <span />
                  </div>
                  <div className="ingredient-rows">
                    {recipe.ingredients.map((item, i) => (
                      <div className="ingredient-row" key={i}>
                        <input
                          id={`ingredients-${i}-name`}
                          aria-label={`Ingredient ${i + 1}`}
                          aria-describedby={`ingredients-hint${errors[`ingredients.${i}.name`] ? ` ingredients-${i}-name-error` : ""}`}
                          aria-invalid={!!errors[`ingredients.${i}.name`]}
                          value={item.name}
                          onChange={(e) =>
                            ingredient(i, "name", e.target.value)
                          }
                          maxLength={100}
                          placeholder="Flour"
                        />
                        <input
                          aria-label={`Amount for ingredient ${i + 1}`}
                          value={item.quantity}
                          onChange={(e) =>
                            ingredient(i, "quantity", e.target.value)
                          }
                          maxLength={40}
                          placeholder="e.g. 500"
                        />
                        <input
                          aria-label={`Unit for ingredient ${i + 1}`}
                          value={item.unit}
                          onChange={(e) =>
                            ingredient(i, "unit", e.target.value)
                          }
                          maxLength={40}
                          placeholder="g"
                          list="ingredient-units"
                        />
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Remove ingredient ${i + 1}`}
                          disabled={recipe.ingredients.length === 1}
                          onClick={() =>
                            update(
                              "ingredients",
                              recipe.ingredients.filter(
                                (_, index) => i !== index,
                              ),
                            )
                          }
                        >
                          <Trash2 size={18} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <datalist id="ingredient-units">
                    {[
                      "g",
                      "kg",
                      "ml",
                      "l",
                      "tsp",
                      "tbsp",
                      "cup",
                      "oz",
                      "lb",
                      "piece",
                    ].map((unit) => (
                      <option key={unit} value={unit} />
                    ))}
                  </datalist>
                  <button
                    type="button"
                    className="button secondary small-button"
                    onClick={() =>
                      update("ingredients", [
                        ...recipe.ingredients,
                        { name: "", quantity: "", unit: "" },
                      ])
                    }
                    disabled={recipe.ingredients.length >= 40}
                  >
                    <Plus size={18} aria-hidden="true" />
                    Add ingredient
                  </button>
                </section>
                <Field id="stage" label="Where are you in the recipe?">
                  <select
                    id="stage"
                    value={recipe.stage}
                    onChange={(e) =>
                      update("stage", e.target.value as Recipe["stage"])
                    }
                  >
                    {stages.map((stage) => (
                      <option key={stage}>{stage}</option>
                    ))}
                  </select>
                </Field>
                <Field
                  id="problem"
                  label="What went wrong?"
                  error={errors.problem}
                >
                  <textarea
                    id="problem"
                    value={recipe.problem}
                    onChange={(e) => update("problem", e.target.value)}
                    maxLength={4000}
                    rows={4}
                    placeholder="What does it look or feel like? What have you already tried?"
                    aria-invalid={!!errors.problem}
                    aria-describedby={
                      errors.problem ? "problem-error" : undefined
                    }
                  />
                </Field>
                <Field
                  id="context"
                  label="Recipe or extra context (optional)"
                  hint="The method, equipment, timing, or anything you changed."
                >
                  <textarea
                    id="context"
                    aria-describedby="context-hint"
                    value={recipe.context}
                    onChange={(e) => update("context", e.target.value)}
                    maxLength={8000}
                    rows={3}
                    placeholder="Paste your recipe or add details here…"
                  />
                </Field>
                <Field
                  id="safetyConcern"
                  label="Any concerns about food safety?"
                  hint="For example, storage, spoilage, contamination, or allergens."
                >
                  <select
                    id="safetyConcern"
                    aria-describedby="safetyConcern-hint"
                    value={recipe.safetyConcern}
                    onChange={(e) =>
                      update(
                        "safetyConcern",
                        e.target.value as Recipe["safetyConcern"],
                      )
                    }
                  >
                    <option value="no">No — a quality or texture issue</option>
                    <option value="yes">Yes, a possible safety issue</option>
                    <option value="unsure">I’m not sure</option>
                  </select>
                </Field>
                <div className="upload-area">
                  <ImagePlus size={24} strokeWidth={1.5} aria-hidden="true" />
                  <div>
                    <label htmlFor="photo">
                      {settings.images
                        ? "Add a photo (optional)"
                        : `Photos are unavailable ${settings.demo ? "in demo mode" : "for this model"}`}
                    </label>
                    <p className="hint" id="photo-hint">
                      {settings.images
                        ? "One JPG, PNG, or WebP, up to 5 MB and 16 megapixels. Images cannot establish food safety."
                        : "A vision-capable model must be enabled to analyze photos."}
                    </p>
                    {settings.images && (
                      <input
                        id="photo"
                        ref={fileInput}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        aria-describedby="photo-hint"
                        onChange={(e) => selectImage(e.target.files?.[0])}
                      />
                    )}
                    {photoError && (
                      <p className="field-error" role="alert">
                        {photoError}
                      </p>
                    )}
                    {preview && (
                      <div className="image-preview">
                        <Image
                          src={preview}
                          width={240}
                          height={160}
                          unoptimized
                          alt="Your selected cooking photo"
                        />
                        <button
                          className="icon-button"
                          type="button"
                          aria-label="Remove photo"
                          onClick={() => {
                            selectImage();
                            if (fileInput.current) fileInput.current.value = "";
                          }}
                        >
                          <X size={18} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p className="small muted">
                  Recipe text is stored locally for up to 24 hours.{" "}
                  {settings.demo
                    ? "Demo mode makes no AI requests."
                    : "Your recipe and any photo will be sent to the configured AI provider."}
                </p>
                <button
                  type="submit"
                  className="button submit-button"
                  disabled={busy || !settings.configured}
                >
                  {busy ? "Looking at your recipe…" : "Find a way forward"}
                  {busy ? (
                    <LoaderCircle
                      size={18}
                      className="spinner"
                      aria-hidden="true"
                    />
                  ) : (
                    <ArrowRight size={18} aria-hidden="true" />
                  )}
                </button>
              </fieldset>
              {busyStatus}
            </form>
            <aside className="context-panel">
              <h2>A useful detail beats a perfect description.</h2>
              <p>
                What flour did you use? Was the dough kneaded by hand or in a
                mixer? Did you change an ingredient?
              </p>
              <hr />
              <h3>Not sure of an amount?</h3>
              <p>Leave it blank. We’ll ask if it makes a difference.</p>
              <h3>Food safety comes first.</h3>
              <p>
                A photograph can show texture, but cannot tell us whether food
                is safe to eat.
              </p>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
