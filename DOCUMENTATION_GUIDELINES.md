# Documentation Maintenance Guidelines

**Version:** 1.0
**Last Updated:** November 12, 2025

---

## Purpose

This document defines the process for keeping HRC Kitchen documentation **tidy, updated, accurate, and concise** to avoid context corruption when Claude Code restarts.

---

## Problems Solved

1. **Context Loss**: CLAUDE.md was too long (500+ lines), causing Claude Code to lose context on restart
2. **Stale Documentation**: Old phase summaries cluttering the repo, causing confusion
3. **Disorganization**: 17+ markdown files in root, poorly referenced and hard to maintain

---

## Documentation Structure

```
hrc-kitchen/
├── CLAUDE.md                    # MAIN - Always current, max 300 lines
├── README.md                    # Public-facing repo introduction
├── DOCUMENTATION_GUIDELINES.md  # This file - maintenance process
├── .claudeignore               # Exclude archived docs from context
└── docs/
    ├── 01-planning/            # Requirements, plans, roadmaps
    │   ├── PRD.md
    │   ├── MVP_PLAN.md
    │   └── APP_SEPARATION_PLAN.md
    ├── 02-development/         # Setup, reference, testing
    │   ├── GETTING_STARTED.md
    │   └── QUICK_REFERENCE.md
    ├── 03-deployment/          # Production deployment guides
    │   └── DEPLOYMENT.md
    ├── 04-architecture/        # Technical design docs
    │   ├── BACKEND_ARCHITECTURE.md
    │   ├── FRONTEND_ARCHITECTURE.md
    │   └── DATABASE_SCHEMA.md
    └── 05-archive/             # Historical/deprecated docs
        ├── PHASE2_COMPLETE.md
        ├── PHASE3_SUMMARY.md
        └── ... (old phase summaries)
```

---

## CLAUDE.md Principles

### Keep It Concise
- **Maximum 300 lines** (current status + key info only)
- Link to detailed docs instead of duplicating content
- Remove outdated information immediately

### Structure Template
```markdown
# Claude Code - HRC Kitchen

## Quick Start
- Links to Getting Started, PRD, Deployment

## Current State
- Current phase status
- Architecture summary (2-3 sentences)
- Link to complete status in PRD

## Test Accounts
- Management app credentials
- Public app credentials

## Development Commands
- npm run commands

## Key Implementation Notes
- Critical info only (5-10 bullet points max)
- Link to architecture docs for details

## Documentation Index
- Links to all doc folders
```

### What NOT to Include
- ❌ Detailed implementation history
- ❌ Complete phase summaries (use links)
- ❌ Extensive code examples (use architecture docs)
- ❌ Deployment procedures (use deployment docs)
- ❌ Full API documentation (use quick reference)

---

## Maintenance Process

### When to Update Documentation

**Immediate Updates (during development):**
1. After completing any phase/feature
2. When changing architecture
3. When adding new functionality
4. When test accounts change

**Regular Maintenance:**
- Weekly: Review CLAUDE.md for accuracy
- Monthly: Archive old docs, verify links
- Quarterly: Full documentation audit

### Update Checklist

When completing a phase/feature:
- [ ] Update CLAUDE.md current status section
- [ ] Archive previous phase summaries to docs/05-archive/
- [ ] Update architecture docs if structure changed
- [ ] Update test accounts if credentials changed
- [ ] Keep CLAUDE.md under 300 lines
- [ ] Verify all links work
- [ ] Update .claudeignore if needed
- [ ] Commit with clear message

### Archiving Rules

**When to Archive:**
- Phase summaries → After next phase is complete
- Implementation guides → When feature is stable for 3+ months
- Testing docs → When tests are outdated or feature removed
- Planning docs → When plan is fully implemented and verified

**How to Archive:**
1. Move document to `docs/05-archive/`
2. Add entry to `docs/05-archive/README.md` with:
   - Document name
   - Date archived
   - Reason (e.g., "Phase 5 complete, superseded by Phase 6")
   - Quick summary of valuable content
3. Update .claudeignore to exclude from context
4. Remove references from CLAUDE.md
5. Update cross-references in other docs

**Archive Index:**
Create `docs/05-archive/README.md`:
```markdown
# Archived Documentation

| Document | Archived | Reason | Key Content |
|----------|----------|--------|-------------|
| PHASE_5_COMPLETE.md | 2025-11-12 | Superseded by Phase 6 | Guest checkout implementation |
```

---

## .claudeignore Management

**Purpose:** Exclude archived/irrelevant files from Claude Code context

**Template:**
```
# Archived documentation (excluded from context)
docs/05-archive/**

# Legacy code (if needed)
frontend/

# Build outputs
**/dist/
**/node_modules/
**/.next/
**/build/

# Environment files
**/.env
**/.env.*
!**/.env.example

# Large data files
**/uploads/
**/public/images/
```

**Update when:**
- Archiving documents
- Adding large files to repo
- Excluding legacy code

---

## Cross-Reference Management

### Linking Best Practices

**Use relative paths:**
```markdown
✅ [PRD](docs/01-planning/PRD.md)
❌ [PRD](/docs/01-planning/PRD.md)
❌ [PRD](https://github.com/org/repo/blob/main/docs/01-planning/PRD.md)
```

**Link anchors for sections:**
```markdown
[Current Status](docs/01-planning/PRD.md#current-status)
```

**Verify links monthly:**
```bash
# Find broken links
grep -r "\[.*\](.*\.md" *.md docs/**/*.md | grep -v node_modules
```

---

## Document Templates

### Architecture Document Template
```markdown
# [Component Name] Architecture

**Last Updated:** YYYY-MM-DD
**Status:** Current | Deprecated

## Overview
Brief description (2-3 sentences)

## Components
- Component 1: Description
- Component 2: Description

## Data Flow
[Diagram or description]

## Key Implementation Details
- Detail 1
- Detail 2

## Related Documents
- [Link to related doc]
```

### Phase Summary Template (for archive)
```markdown
# Phase X Summary

**Completed:** YYYY-MM-DD
**Duration:** X weeks
**Status:** ✅ Complete

## Goals
- Goal 1
- Goal 2

## Completed Features
- Feature 1
- Feature 2

## Key Decisions
- Decision 1: Rationale

## Archived Reason
Superseded by Phase Y, completed on YYYY-MM-DD
```

---

## Monthly Maintenance Checklist

- [ ] Review CLAUDE.md for accuracy and conciseness (< 300 lines)
- [ ] Check all cross-references work
- [ ] Archive any completed phase summaries
- [ ] Update architecture docs if needed
- [ ] Verify test accounts are current
- [ ] Clean up .claudeignore
- [ ] Update this guidelines doc if process changed
- [ ] Commit any changes

---

## Context Corruption Prevention

### Signs of Context Corruption
- Claude Code forgets recent work
- Suggests outdated implementation approaches
- References archived/removed features
- Confused about current architecture

### Recovery Steps
1. Check CLAUDE.md is current and concise
2. Verify .claudeignore excludes archived docs
3. Confirm all links in CLAUDE.md work
4. Review recent commits for missing doc updates
5. Update CLAUDE.md with current state
6. Restart Claude Code with updated context

### Prevention Measures
- Keep CLAUDE.md under 300 lines always
- Archive old docs immediately after phase completion
- Update .claudeignore when archiving
- Include clear "Current State" section in CLAUDE.md
- Link to details instead of duplicating content

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-12 | Claude | Initial documentation guidelines |

---

**End of Document**
