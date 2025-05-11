
export interface Bug {
  id: string;
  description: string;
  explanation: string;
  lineNumber?: number;
  codeSnippet?: string;
  severity: 'critical' | 'warning' | 'info'; // Added severity
}

export interface FixSuggestion {
  id: string;
  bugId?: string;
  description: string;
  suggestedCodePatch: string; // e.g., what to replace or add
  explanation?: string; // Explanation of why this fix works
}

export interface AnalysisResult {
  bugs: Bug[];
  fixSuggestions: FixSuggestion[];
}

export interface AppliedFixResult {
  updatedCode: string;
  message: string;
}
