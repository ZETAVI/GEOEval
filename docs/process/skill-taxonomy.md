# Skill Taxonomy

## Why classify skills

Classification helps discover gaps, prevent broad skills from absorbing unrelated workflows, and decide which skills should be implicit, explicit, project-local, or optional.

Each skill has one primary functional category.

## Functional categories

| ID | Category | Purpose |
| --- | --- | --- |
| `library-api-reference` | Library and API reference | Correct use of libraries, SDKs, CLIs, schemas, and known Gotchas |
| `product-verification` | Product verification | Prove real behavior through browsers, contracts, state, or programmatic assertions |
| `data-analysis` | Data fetching and analysis | Retrieve, correlate, and interpret data or observability signals |
| `business-process` | Business process and team automation | Standardize coordination, reporting, handoff, and tracker workflows |
| `scaffolding` | Code scaffolding and templates | Create known-good project, module, migration, or artifact structures |
| `code-quality` | Code quality and review | Apply testing, architecture, style, debugging, and review disciplines |
| `delivery` | CI/CD and deployment | Build, release, deploy, observe, and roll back |
| `runbook` | Runbooks | Investigate symptoms and produce repeatable findings |
| `infrastructure-operations` | Infrastructure operations | Perform guarded maintenance or destructive operational procedures |

## Invocation classes

### Explicit orchestrator

The human deliberately invokes an end-to-end workflow such as starting a change, closing a release, or performing a production migration. Explicit invocation is preferred when the workflow changes state, consumes significant time, or needs setup choices.

### Implicit discipline

The agent may select a focused skill when the task matches its trigger description—for example source research, architecture review, or verification. Implicit skills should avoid surprising side effects.

## Scope

- `framework`: portable across projects and technologies.
- `project`: shared by one repository.
- `module`: relevant only under a bounded subtree or service.
- `user`: personal workflow across repositories.

## Risk

- `read-only`: inspection, analysis, or reporting by default.
- `write`: creates or updates recoverable local/project state.
- `destructive`: deletes, migrates, publishes, deploys, or changes external state. Must be explicit and guarded.

## Maturity

- `sandbox`: an idea or imported candidate under review.
- `pilot`: implemented and used on limited real tasks.
- `stable`: validated, documented, and suitable for normal use.
- `deprecated`: still discoverable for migration but no longer recommended.

Classification lives in `skill-catalog.yaml`; do not encode it as deeply nested skill directories.

