# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Status bar item showing Claude Code's 5-hour and 7-day rate limit usage
  (`$(clock) 5h NN%  $(calendar) 7d NN%`), sourced from the `statusLine` hook's
  `rate_limits` field via a bridge script and a shared JSON file.
- File-watch (with polling fallback) based live updates.
- Guided, opt-in setup of the Claude Code `statusLine` bridge, wrapping any
  pre-existing `statusLine` command instead of replacing it.
- Per-window severity markers (🟡 warning / 🔴 critical), independent for 5h
  and 7d — see [`docs/DESIGN.md`](docs/DESIGN.md) section 4 for why this
  isn't a shared background color.
- `usageBar.*` settings for the shared file path, thresholds, poll interval,
  stale-data threshold, and auto-setup toggle.
