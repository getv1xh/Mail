/**
 * VMailx — AIProvider Interface (Phase 2 Scaffold)
 *
 * This file exists to define the extension point for AI features.
 * DO NOT implement anything here in Phase 1.
 *
 * When Phase 2 begins:
 *  - Add method signatures to this interface
 *  - Implement providers in: lib/providers/ai/openai/, lib/providers/ai/gemini/, etc.
 *  - Wire in lib/container.ts
 *  - Implement features in: features/ai/summary/, features/ai/compose/, etc.
 */

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AIProvider {
  // Phase 2 — not implemented
  //
  // Planned methods (do not implement yet):
  //   summarizeEmail(emailId: string, accountId: string): Promise<string>
  //   suggestReply(emailId: string, accountId: string): Promise<string[]>
  //   classifySpam(email: EmailDetail): Promise<{ isSpam: boolean; confidence: number }>
  //   searchSemantic(query: string, accountId: string): Promise<EmailSummary[]>
  //   extractTasks(emailId: string, accountId: string): Promise<Task[]>
}
