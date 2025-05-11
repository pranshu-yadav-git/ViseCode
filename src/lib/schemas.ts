
import { z } from 'zod';

// Zod Schemas for validation and type generation
export const BugSchema = z.object({
  id: z.string(),
  description: z.string(),
  explanation: z.string(),
  lineNumber: z.number().optional(),
  codeSnippet: z.string().optional(),
  severity: z.enum(['critical', 'warning', 'info']),
});

export const FixSuggestionSchema = z.object({
  id: z.string(),
  bugId: z.string().optional(),
  description: z.string(),
  suggestedCodePatch: z.string(),
  explanation: z.string().optional(),
});

export const AnalyzeCodeInputSchema = z.object({
  code: z.string().describe("The code snippet to analyze."),
  fileName: z.string().optional().describe("The name of the file containing the code, if available."),
  language: z.string().optional().describe("The programming language of the code snippet (e.g., 'javascript', 'python', 'java')."),
});

export const AnalyzeCodeOutputSchema = z.object({
  bugs: z.array(BugSchema),
  fixSuggestions: z.array(FixSuggestionSchema),
});

