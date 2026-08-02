# Preserve a Compatibility Shell

The rebuild will preserve the current public React components, exported types, documented DOM hooks, and `paginateDocument` entry point while replacing the pagination core behind them. New IR and writer capabilities will be additive, so the migration can improve internals without forcing existing consumers to adopt a new document model first.

## Consequences

- Existing consumers remain the first compatibility test for the new paginator.
- Internal source cloning and undocumented attributes are not compatibility promises.
- New output backends must not require a breaking change to the React component API.
