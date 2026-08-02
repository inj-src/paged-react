# Use a DOM-Preserving HTML Writer First

The first HTML writer will emit real page DOM fragments from the structural IR, preserving existing element semantics, CSS behavior, and documented hooks. The paint layer remains available for the future PDF writer, which can use layout2vector-style geometry without forcing HTML output to become an absolutely positioned drawing.
