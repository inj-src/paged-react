# Support Normalized Page Break Directives

The first rebuild will normalize `break-before` and `break-after` values of `page` or `always`, their `page-break-before` and `page-break-after` legacy aliases, and `break-inside: avoid` with its legacy alias into structural IR break directives. `<PageBreak />` remains supported; advanced values such as recto/verso, columns, named pages, and widow/orphan controls are deferred.

This intentionally expands the current behavior, which documents the before and after properties as ignored. The package documentation and lab scenario must be updated with the new contract rather than treating the change as an invisible implementation detail.
