# Deliver HTML Parity Before Direct PDF Output

The rebuild will first replace the pagination internals while preserving the current HTML/page behavior, then add a direct PDF writer against the stabilized IR. This stages the two highest-risk changes—page fragmentation and non-HTML painting—so existing scenarios can validate the new core before PDF fidelity becomes a second moving target.

## Consequences

- The first branch can be accepted without exposing a premature PDF API.
- The IR must still carry enough structural and paint information for the later PDF writer.
- Direct PDF output is a follow-up milestone, not a reason to compromise HTML compatibility.
