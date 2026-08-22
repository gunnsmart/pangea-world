# PANGEA_OS Agent Instructions

This file contains persistent rules and guidelines for AI Coding Agents working on this project.

## Architectural Principles
- **Separation of Concerns:** Keep the Simulation Engine (Core Logic) strictly decoupled from the UI (React/Canvas). All communication must happen via the documented Message Protocol.
- **Deterministic Simulation:** Always prioritize deterministic behavior. Use seeds and avoid relying on variable hardware timers within the simulation loop.
- **Data Integrity:** Every significant world event must be captured in the History/Timeline.
- **KPI Awareness:** When optimizing, refer to the KPIs defined in `docs/ARCHITECTURE_REVIEW.md` (e.g., Target <16ms tick duration).

## UI & Design Conventions
- Follow the "Pangea Console" aesthetic: high-contrast dark mode, mono fonts for data, neon accents for active signals.
- Use `framer-motion` for all tab transitions and notification entrances.
- Subject selection must be consistent across Neural, Crafting, and Biometric views.

## Simulation Contract
- When adding new subsystems to `World.ts`, ensure they register their logs with the `[SYSTEM]` prefix if they are environmental or administrative.
- Map history events to the standard `HistoryManager` categories: `log`, `system`, `event`, `milestone`.
