# Rescue API

`POST /api/rescue` accepts `multipart/form-data` with a JSON string in `payload` and an optional file in `image`. It is a same-origin browser endpoint; requests must include the app's origin and preserve its session cookie for follow-up.

## Start a rescue

Send this JSON as the `payload` field:

```json
{
  "recipe": {
    "dish": "Cinnamon rolls",
    "ingredients": [
      { "name": "Flour", "quantity": "500", "unit": "g" },
      { "name": "Milk", "quantity": "", "unit": "" }
    ],
    "stage": "Kneading",
    "problem": "The dough tears when I stretch it.",
    "context": "I am kneading by hand.",
    "safetyConcern": "no"
  }
}
```

Quantities and units are strings. Unknown amounts stay empty; they are not converted to zero. `safetyConcern` accepts `no`, `yes`, or `unsure`. Allowed stages and field limits are defined in [src/domain/rescue.ts](../src/domain/rescue.ts).

The optional image must be a non-animated JPEG, PNG, or WebP, no larger than 5 MiB or 16 megapixels. The server checks the decoded content, removes metadata, and resizes it before sending it to the provider. The full multipart request is limited to 6 MiB. Images require a configured vision model and are accepted only on the initial request.

## Follow up

Use the returned rescue ID and the same browser session:

```json
{
  "rescueId": "8cdbdf2f-4f3a-4a51-8bd4-5811e12d79cb",
  "feedback": "I used bread flour and kneaded by hand."
}
```

Follow-up includes the original recipe and previous analyses. A rescue accepts six updates and expires 24 hours after creation. Switching between demo and AI mode requires a new rescue. Safety holds remain in place across updates.

## Response

A successful request returns HTTP 200 with these fields:

| Field      | Meaning                                                                     |
| ---------- | --------------------------------------------------------------------------- |
| `id`       | Rescue UUID used for follow-up.                                             |
| `mode`     | `demo`, `ai`, or `safety`.                                                  |
| `recipe`   | Validated original recipe.                                                  |
| `analysis` | Structured guidance, described below.                                       |
| `saved`    | Whether storage succeeded. If false, show the result but disable follow-up. |

`analysis.status` is `needs_more_information` or `complete`. The result includes a recovery classification, problem description, uncertainty statement, supporting observations, alternative explanations, steps, questions, warnings, explanation, and prevention tips. Steps contain an instruction, checkpoint, and caution text that can be empty. Uncertainty is expressed in words, not a confidence percentage.

The exact contract is [analysisSchema](../src/domain/rescue.ts). A request for more information must include questions, use an undetermined recovery classification, and contain no rescue steps. A complete result cannot also request clarification. Invalid or contradictory output returns an error rather than a partial rescue plan. Unsafe results use maintained safety guidance and remain unsafe across follow-ups.

## Errors

Errors return `{ "error": "Message for the user" }`. Responses use `Cache-Control: no-store`.

| Status                        | Meaning                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| `400` / `415`                 | Invalid data, unsupported request format, or unavailable photo support.                                 |
| `403` / `404`                 | Origin mismatch, expired rescue, or rescue belonging to another session.                                |
| `409` / `422`                 | Mode changed, rescue changed or expired during processing, or update limit reached. |
| `413` / `429`                 | Request too large or local request limit reached. HTTP 429 includes `Retry-After: 60`.                  |
| `500` / `502` / `503` / `504` | Internal failure, provider failure or invalid output, missing model configuration, or provider timeout. |

Keep the user's entered recipe when a request fails. See [self-hosting](self-hosting.md) for storage, privacy, and deployment limits.
