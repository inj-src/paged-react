# Core

Internal pagination engine modules will live here.

The intended model is:

1. collect segment slots from rendered React content
2. measure generated page shells in the browser
3. paginate each segment body into repeated pages
4. carry continuation state with break tokens
5. render final page DOM with repeated headers and footers
