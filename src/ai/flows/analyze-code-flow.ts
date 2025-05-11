
'use server';
/**
 * @fileOverview A Genkit flow for analyzing code snippets for bugs and suggesting fixes.
 *
 * - invokeAnalyzeCodeFlow - A function that executes the code analysis flow.
 * - AnalyzeCodeInput - The type for the input to the analysis flow.
 * - AnalyzeCodeOutput - The type for the output from the analysis flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
// No longer importing Bug, FixSuggestion from @/types as the schema types are sufficient
import { AnalyzeCodeInputSchema, AnalyzeCodeOutputSchema } from '@/lib/schemas';


export type AnalyzeCodeInput = z.infer<typeof AnalyzeCodeInputSchema>;
export type AnalyzeCodeOutput = z.infer<typeof AnalyzeCodeOutputSchema>;


// Mock data removed as GenAI call is now active.
// const commonBugs: Bug[] = [ ... ];
// const commonFixes: FixSuggestion[] = [ ... ];


const analyzeCodePrompt = ai.definePrompt({
  name: 'analyzeCodePrompt',
  input: { schema: AnalyzeCodeInputSchema },
  output: { schema: AnalyzeCodeOutputSchema },
  prompt: `You are an expert code reviewer specializing in identifying bugs and suggesting improvements.
Analyze the following code snippet.
{{#if language}}The code is written in {{{language}}}.{{/if}}
{{#if fileName}}File Name: {{{fileName}}}{{else}}File Name: Not Provided{{/if}}

Code:
\`\`\`
{{{code}}}
\`\`\`

Please identify:
1.  Bugs: For each bug, provide an ID (unique string, e.g., "bug-001"), description, detailed explanation, line number (if applicable), the relevant code snippet (a short segment of the code where the bug is), and severity (critical, warning, info).
2.  Fix Suggestions: For each bug that can be fixed, provide an ID (unique string, e.g., "fix-001"), the associated bug ID, a description of the fix, the suggested code patch (what the code should look like after the fix), and an explanation of why the fix works.

If no bugs are found, return empty arrays for bugs and fixSuggestions.
If bugs are found but no specific fix can be suggested for some, only include fix suggestions for the ones that can be fixed.

Format your output strictly as JSON matching the provided schema.
Ensure that all fields in the schema are populated if applicable. For example, 'codeSnippet' for a bug should be the actual code segment.
'lineNumber' should be an integer if the bug pertains to a specific line.
'bugId' in FixSuggestionSchema must correspond to an 'id' in one of the BugSchema objects.
`,
});


const analyzeCodeFlow = ai.defineFlow(
  {
    name: 'analyzeCodeFlow',
    inputSchema: AnalyzeCodeInputSchema,
    outputSchema: AnalyzeCodeOutputSchema,
    // Optional: Configure safety settings if needed, though default should be fine for code.
    // config: {
    //   safetySettings: [
    //     { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    //   ],
    // },
  },
  async (input: AnalyzeCodeInput): Promise<AnalyzeCodeOutput> => {
    // Simulate API call delay or actual GenAI call
    // await new Promise((resolve) => setTimeout(resolve, 500)); // Keep for UI testing if needed, but remove for production

    // Actual LLM call
    const { output } = await analyzeCodePrompt(input);
    
    // Ensure output is not null, and if it is, return a default empty structure.
    // This handles cases where the LLM might fail to produce valid JSON or any output.
    if (!output) {
        console.warn("AnalyzeCodeFlow: LLM returned null output. Returning empty analysis.");
        return { bugs: [], fixSuggestions: [] };
    }
    
    // Validate output against schema (Genkit does this internally, but good for debugging)
    const parsedOutput = AnalyzeCodeOutputSchema.safeParse(output);
    if (!parsedOutput.success) {
        console.error("AnalyzeCodeFlow: LLM output failed schema validation.", parsedOutput.error.format());
        // Optionally, attempt to salvage or return a specific error structure
        // For now, returning empty structure as a fallback
        return { bugs: [], fixSuggestions: [] };
    }

    return parsedOutput.data;
  }
);

export async function invokeAnalyzeCodeFlow(input: AnalyzeCodeInput): Promise<AnalyzeCodeOutput> {
  return analyzeCodeFlow(input);
}

