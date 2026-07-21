---
name: Bug report
about: Report something that does not work as documented
title: "[BUG] "
labels: bug
assignees: ""
---

## Expected behavior

<!-- What did you expect to happen? -->

## Actual behavior

<!-- What happened instead? Include the full error message and stack trace if
there was one. -->

## Steps to reproduce

1.
2.
3.

## Code sample

<!-- The smallest snippet that shows the problem. If it involves a specific
Letterboxd account or film, name it, since feed contents vary. -->

```ts
import { getDiary } from 'letterboxd-rss';

const entries = await getDiary('username');
```

## Environment

- letterboxd-rss version:
- Node version (`node -v`):
- OS:
- Package manager:

## Additional context

<!-- Anything else worth knowing. If the issue is a parsing problem, a snippet
of the raw RSS from https://letterboxd.com/{username}/rss/ is the single most
useful thing you can include. -->
