
"use server";

import type { AnalysisResult, AppliedFixResult, Bug, FixSuggestion } from "@/types";
import { invokeAnalyzeCodeFlow, type AnalyzeCodeInput } from '@/ai/flows/analyze-code-flow';

// CommonBugs and CommonFixes are now part of the Genkit flow, so they are removed from here.

export async function analyzeCode(
  code: string,
  fileName?: string,
  language?: string
): Promise<AnalysisResult> {
  // Call the Genkit flow
  const input: AnalyzeCodeInput = { code, fileName, language };
  // The Genkit flow now returns AnalyzeCodeOutput, which matches AnalysisResult structure.
  return invokeAnalyzeCodeFlow(input);
}


// This applyFix function remains as a mock. It could be converted to a Genkit flow in the future if needed.
const commonBugsMockForApplyFix: Bug[] = [
  {
    id: "bug-1",
    description: "Potential Null Pointer Exception",
    explanation: "The variable 'user' might be null when accessing 'user.profile.name', leading to a runtime error. Ensure 'user' and 'user.profile' are checked for nullity before access.",
    lineNumber: 5,
    codeSnippet: "const name = user.profile.name;",
    severity: "critical",
  },
  {
    id: "bug-2",
    description: "Inefficient Loop Detected",
    explanation: "The loop calculates `items.length` on each iteration. For large arrays, this can be inefficient. Cache the length in a variable before the loop.",
    lineNumber: 12,
    codeSnippet: "for (let i = 0; i < items.length; i++) {",
    severity: "warning",
  },
  {
    id: "bug-3",
    description: "Hardcoded API Key",
    explanation: "An API key seems to be hardcoded in the source. This is a security risk. Store API keys in environment variables or a secure vault.",
    codeSnippet: "const API_KEY = \"abcdef123456\";",
    severity: "critical",
  }
];


export async function applyFix(
  currentCode: string,
  fixId: string,
  allSuggestions: FixSuggestion[]
): Promise<AppliedFixResult> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const fixToApply = allSuggestions.find(fix => fix.id === fixId);

  if (!fixToApply) {
    throw new Error("Fix suggestion not found.");
  }

  let updatedCode = currentCode;
  // This simplified logic attempts to replace based on snippet or keyword.
  // A real implementation would use AST or more robust patching.
  const bugToFix = commonBugsMockForApplyFix.find(b => b.id === fixToApply.bugId);

  if (bugToFix && bugToFix.codeSnippet && currentCode.includes(bugToFix.codeSnippet)) {
    updatedCode = currentCode.replace(bugToFix.codeSnippet, fixToApply.suggestedCodePatch);
  } else if (fixToApply.bugId === "bug-1" && currentCode.includes("user.profile.name")) { // Fallback for specific cases
    updatedCode = currentCode.replace("const name = user.profile.name;", fixToApply.suggestedCodePatch);
  } else if (fixToApply.bugId === "bug-2" && currentCode.includes("items.length; i++")) {
     updatedCode = currentCode.replace("for (let i = 0; i < items.length; i++) {", fixToApply.suggestedCodePatch);
  } else if (fixToApply.bugId === "bug-3" && currentCode.includes("abcdef123456")) {
     updatedCode = currentCode.replace("const API_KEY = \"abcdef123456\";", fixToApply.suggestedCodePatch);
  } else {
    // If no direct replacement, prepend the fix as a comment or suggestion.
    // This behavior might need adjustment based on desired outcome for unpatchable code.
    updatedCode = `// Suggested fix for: ${fixToApply.description}\n${fixToApply.suggestedCodePatch}\n\n${currentCode}`;
  }
  

  return {
    updatedCode,
    message: `Fix "${fixToApply.description}" applied successfully. Please review the changes.`,
  };
}

