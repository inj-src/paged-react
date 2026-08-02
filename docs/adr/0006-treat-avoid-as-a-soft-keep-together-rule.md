# Treat Avoid as a Soft Keep-Together Rule

`break-inside: avoid` and `page-break-inside: avoid` will move a fragment to a fresh page when the complete fragment fits there, but will not prevent continuation when the fragment is taller than a page. The paginator will split breakable descendants or text and will place an indivisible oversized item once with an explicit diagnostic rather than looping indefinitely.
