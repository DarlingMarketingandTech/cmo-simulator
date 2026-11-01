<claude-mem-context>
# Memory Context

# [cmo-simulator] recent context, 2026-05-10 2:51pm EDT

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision 🚨security_alert 🔐security_note
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 3 obs (1,074t read) | 46,905t work | 98% savings

### May 10, 2026
236 2:51p 🔴 Eliminated Forced Full-Screen Spinner in SimulationProvider
237 " 🔄 Replaced getUser() with getSession() in Middleware and Sim Layout
238 " 🔴 Fixed Premature Loading State Reset After Sign-In Navigation

Access 47k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>

# Project guide

Read [docs/PROGRESS_AND_ROADMAP.md](docs/PROGRESS_AND_ROADMAP.md) before changing the play path, scoring, or visual design.

The player path is Home (`/sim`) and one screen (`/sim/play`). Do not add sidebar destinations for quarters, campaigns, pipeline, or analytics. Scoring edits start in `processQuarterAdvance`, then `buildSimulationScoreBreakdowns`, then the review copy. Do not widen the 65–67 baseline until that roadmap says to.