# Keep IR and Writers Internal Initially

The structural IR, paint IR, and writer contracts will remain internal while the rebuild establishes pagination and PDF invariants. The existing React API is the stable public surface for the first milestone; a public IR or custom-writer API can be introduced later once the representation is DOM-free, serializable, and versionable.
