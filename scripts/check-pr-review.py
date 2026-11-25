#!/usr/bin/env python3
"""The pull request's Review section records the review's outcome (SESSION §4, list-picker-code-review).

Reads PR_TITLE and PR_BODY from the environment. A milestone's plan or close (`docs(M<n>): ...`) is
exempt: the owner approves it explicitly (SESSION §7). Otherwise it fails when the "## Review" section is missing,
empty once the template's comments are gone, or a placeholder for a review still to come (#83 merged
with "see the comment below once it has run" and no review on record).
"""
import os
import re
import sys

PLACEHOLDERS = re.compile(r"see the comment below|once it has run", re.I)

if re.match(r"docs\(M\d+\):", os.environ.get("PR_TITLE", "")):
    print("review section: a milestone pull request, approved by the owner")
    sys.exit(0)
body = os.environ.get("PR_BODY", "")
match = re.search(r"^##\s+Review\b[^\n]*(?:\n|\Z)(.*?)(?=^##\s|\Z)", body, re.S | re.M)
if not match:
    sys.exit("The body has no '## Review' section: record the list-picker-code-review outcome there.")
section = re.sub(r"<!--.*?-->", "", match.group(1), flags=re.S).strip()
if not section:
    sys.exit("The '## Review' section is empty: record the review's findings and fixes, or 'No findings'.")
if PLACEHOLDERS.search(section):
    sys.exit(f"The '## Review' section is a placeholder ({section[:80]!r}): run the review, then record it.")
print("review section: ok")
