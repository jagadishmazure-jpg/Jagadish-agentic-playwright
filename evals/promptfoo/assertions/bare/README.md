# Bare-boolean versions (comparison only)

Each file wraps the named rule and returns only `true` or `false`. `promptfooconfig.bare.yaml` uses these files to show what a failure report looks like without a rule name or evidence: in our run, 0 of 34 failures quoted any text. Do not use these for real checks.

| File | What it does |
|---|---|
| `*.js` | `(output, context) => rule(output, context).pass` for each of the 7 rules |
