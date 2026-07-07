# VMailx — AI Feature Module (Phase 2)

This directory is reserved for Phase 2 AI features.

## Planned sub-modules

| Directory | Feature |
|---|---|
| `summary/` | Email summarization |
| `compose/` | AI-assisted compose / smart replies |
| `search/` | Semantic email search |
| `tasks/` | Task extraction from emails |
| `providers/` | AI provider implementations (OpenAI, Gemini, etc.) |
| `prompts/` | Prompt templates |

## Phase 1 Rule

**DO NOT implement anything in this directory in Phase 1.**

The only file allowed in Phase 1 is this README and the `providers/index.ts` re-export of the `AIProvider` interface from `lib/providers/ai/`.

## Phase 2 Checklist (future)

- [ ] Choose AI provider (OpenAI / Gemini / local Ollama)
- [ ] Implement `AIProvider` interface
- [ ] Wire in `lib/container.ts`
- [ ] Build `summary/` component + service
- [ ] Build `compose/` smart reply component
- [ ] Build `search/` semantic search
- [ ] Add vector DB (pgvector) for embeddings
