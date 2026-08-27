# Contributing

Thanks for considering a contribution to Usage Bar for Claude Code.

This is currently a solo-maintained project, so reviews may take a while — thanks for your patience. If a PR sits unreviewed for a long time, a friendly ping on the issue/PR is welcome.

## Development setup

See [`README.md` — テストについて](../README.md#テストについて) for how to install dependencies, run the test suite, and launch the extension in a real VS Code window (`F5`). There's no separate setup process for contributors.

## Branching and commits

- Base branch is `main`. Work in a short-lived branch (`feat/...`, `fix/...`, `docs/...`) and open a pull request rather than pushing directly to `main`.
- [Conventional Commits](https://www.conventionalcommits.org/) (`type(scope): summary`) are preferred for commit subjects — it keeps `git log` and future changelog generation readable. Not strictly enforced by CI today.
- Keep PRs focused; unrelated cleanup can be its own PR.

## Before opening a PR

- `npm test` (typecheck + lint + unit tests) must pass locally — CI runs the same checks.
- Update `docs/DESIGN.md` if you're changing a documented design decision (section 4), and `CHANGELOG.md` under `[Unreleased]` for any user-facing change.
- No DCO / sign-off is required at this stage of the project.

## Reporting bugs / requesting features

Use the issue templates — they ask for just enough detail (Claude Code version, VS Code version, OS, steps to reproduce) to act on a report quickly.

## Security issues

Please do not open a public issue for a security vulnerability — see [`SECURITY.md`](SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under this project's [MIT License](../LICENSE).
