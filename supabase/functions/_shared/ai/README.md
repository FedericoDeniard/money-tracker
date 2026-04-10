# Transaction Agent Integration Tests

This folder includes an integration suite that calls the real Grok model through the same production module (`extractTransactionFromEmail`).

## Prerequisite

- `XAI_API_KEY` must be set in your environment.

## Run only this suite

```bash
cd supabase
deno test --no-check --env-file="functions/.env" --allow-env --allow-net "functions/_shared/ai/transaction-agent.integration.test.ts"
```

## Notes

- These tests are integration tests: they are slower and consume model tokens.
- Fixtures are defined in `functions/_shared/ai/fixtures/transaction-agent-cases.ts`.

## Refresh fixtures from Langfuse export

1. Export dataset items from Langfuse.
2. Generate the fixture file:

```bash
cd supabase
deno run --allow-read --allow-write "functions/_shared/ai/fixtures/import-langfuse-dataset.ts" "/absolute/path/to/lf-dataset_items-export.json"
```

3. Update manual labels in `functions/_shared/ai/fixtures/transaction-agent-labels.ts`.
4. Run the integration test suite again.
