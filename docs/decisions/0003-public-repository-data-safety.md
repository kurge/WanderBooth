# ADR 0003: Public Repository and Data Safety

- Status: Accepted
- Date: 2026-10-02

## Decision

The WanderBooth source repository is public at [kurge/WanderBooth](https://github.com/kurge/WanderBooth). Customer photos, session databases, cash records, secrets, local backups, and diagnostic exports must never be committed.

## Why

- The owner created the repository publicly.
- Public visibility makes disciplined documentation and secret handling essential from the first commit.

## Controls

- `.gitignore` excludes known runtime and customer-data paths.
- Runtime data will live outside the source tree where practical.
- Development uses synthetic images with known redistribution rights.
- Secrets use ignored environment files or operating-system credential storage.
- Git history is reviewed before every public push containing new data types.

## Trade-offs

- Product plans and implementation details are publicly visible.
- Mistakenly committed sensitive data may persist in Git history even after file deletion.
- A software license remains an open decision; public visibility alone does not grant reuse rights.
