# Recurring CSV exports, one visible recipe

Use this synthetic exercise to prepare two user validation sessions. It asks one
question: **How much paid revenue came from each region this month?** The files
contain invented orders and teams. No customer or personal data is needed.

The walkthrough covers local import, a filter, a left join, a grouped chart, and
an exported SQL recipe. The replay command runs that SQL in a fresh DuckDB-Wasm
engine using the existing project dependency. It checks the source bytes, shaped
row count, and grouped answer against the fixture's expected result.

## Prepare

Run the project as described in [Development](DEVELOPMENT.md), then open `/app`.
Download both CSV files from [September](demo/2026-09/) and
[October](demo/2026-10/) into separate folders. Keep the names unchanged.

The `expected.json` files and answer table below are for the facilitator. Keep
them out of view until the participant has reached an answer. These sessions
have not happened yet; the exercise is preparation, not evidence of demand.

## Build September's answer

1. Open September's `monthly-orders.csv` and `region-teams.csv` together. Inspect
   the six orders and the detected column types.
2. In Recipe, filter `status` with `equals` and value `paid`. Four rows remain.
3. Join `region-teams.csv` on `region` on both sides. Use **keep every current
   row**, the left join. The team lookup supplies context without dropping an
   order that lacks a team.
4. In Chart, set the title to `Paid revenue by region`, Group by to `region`,
   Calculation to `sum`, and Measure to `net_revenue`. Leave the type as Bar.
5. Wait for the three groups. Export SQL. The file includes both the shaped-row
   query and the current chart-answer query once the chart query succeeds.
6. Keep the SQL beside the original CSVs. The source comments record file names,
   sizes, and SHA-256 fingerprints. Export safe CSV if you also need the shaped
   rows in a spreadsheet; it contains rows, not the chart's aggregation.

For this small fixture, summing `net_revenue` is intentional. Do not sum a
region-level target after a one-to-many join because that would count it once
per order. Duplicate lookup keys would also multiply orders; inspect the lookup
before trusting a join.

## Replay and repeat

From the repository root, verify the checked-in September recipe:

```bash
pnpm demo:replay
```

Verify your actual SQL download instead:

```bash
pnpm demo:replay /path/to/monthly-orders.dataskein.sql docs/demo/2026-09
```

Reuse the same recipe with October's exports:

```bash
pnpm demo:replay docs/demo/paid-revenue.dataskein.sql docs/demo/2026-10
```

This deliberate source replacement should change the answer. The archived SQL
comments still describe September's original fingerprints. The replay command
checks October's bytes against October's `expected.json`. For an auditable
October deliverable, open October in a fresh workspace, repeat the steps, and
export new SQL with October's fingerprints. DataSkein does not import saved SQL
recipes back into its visual builder.

To replay outside this test command, install DuckDB, put the original CSVs beside
the SQL, and run `duckdb < monthly-orders.dataskein.sql` from that folder. DuckDB
returns two result sets, shaped rows and the chart answer. It does not verify
the fingerprint comments for you. Inspect SQL before running someone else's
recipe. The project checks replay with its pinned DuckDB-Wasm version; other
DuckDB versions may infer types differently.

| Export    | Paid rows | Chart answer in descending revenue order | Total |
| --------- | --------- | ---------------------------------------- | ----- |
| September | 4         | East 300, North 250, South 200           | 750   |
| October   | 6         | East 400, South 200, North 180, West 50  | 830   |

October has a paid West order without a matching team. The left join keeps it.
An inner join would silently change this exercise's total to 780.

## Run two sessions

Allow about 20 minutes per participant. Use the same September task with both
people, then introduce October as a second month. Reset the workspace between
participants. Let each person try before showing the numbered walkthrough.

- Ask how they currently answer this question from recurring exports and where
  they record the steps.
- Give them the CSVs and the question. Record time to first correct answer,
  where they stop, and each hint you give.
- Ask them to explain which rows count, what the join does, and what someone
  else would need to reproduce the result.
- Introduce October. Ask what they expect to change, then check whether they
  notice the unmatched West order and preserve it.
- Ask which part they would use in their existing workflow and what would stop
  them from using it again next month.

Record observations separately for both sessions: correct answer reached,
steps completed without hints, misunderstanding or failed action, existing
alternative, and whether they want to try a second export. Do not treat a
completed synthetic exercise or polite interest as a product commitment.

Automated replay proves this fixture's arithmetic and SQL export behavior. The
sessions still need to establish whether the workflow is understandable and
useful to people who handle recurring exports.
