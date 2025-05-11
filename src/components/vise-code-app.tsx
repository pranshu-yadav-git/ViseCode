
"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AlertTriangle, CheckCircle, FileText, Languages, Loader2, Search, UploadCloud, Wand2, XIcon, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { analyzeCode, applyFix } from '@/lib/actions';
import type { AnalysisResult, Bug, FixSuggestion } from '@/types';

const ViseCodeLogo = () => (
  <div className="flex items-center space-x-3">
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <path d="m10 13-2 2 2 2"></path><path d="m14 13 2 2-2 2"></path>
    </svg>
    <h1 className="text-3xl font-bold text-foreground">ViseCode</h1>
  </div>
);

type AnalysisSeverity = 'none' | 'no-issues' | 'mild' | 'critical';

const supportedLanguages = [
  { value: "autodetect", label: "Auto-detect Language" },
  { value: "plaintext", label: "Plain Text" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "kotlin", label: "Kotlin" },
  { value: "dart", label: "Dart" },
  { value: "typescript", label: "TypeScript" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "go", label: "Go" },
  { value: "ruby", label: "Ruby" },
  { value: "php", label: "PHP" },
  { value: "csharp", label: "C#" },
  { value: "swift", label: "Swift" },
];

const fileExtensionToLanguageMap: Record<string, string> = {
  js: "javascript",
  py: "python",
  java: "java",
  cpp: "cpp",
  h: "cpp",
  hpp: "cpp",
  cxx: "cpp",
  hxx: "cpp",
  kt: "kotlin",
  kts: "kotlin",
  dart: "dart",
  ts: "typescript",
  tsx: "typescript",
  html: "html",
  css: "css",
  go: "go",
  rb: "ruby",
  php: "php",
  cs: "csharp",
  swift: "swift",
  txt: "plaintext",
};

const supportedFileExtensions = Object.keys(fileExtensionToLanguageMap);

export default function ViseCodeApp() {
  const [code, setCode] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("autodetect");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);
  const [isLoadingFix, setIsLoadingFix] = useState<boolean>(false);
  const [selectedFixForDialog, setSelectedFixForDialog] = useState<FixSuggestion | null>(null);
  const [fixToConfirmOverall, setFixToConfirmOverall] = useState<FixSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisSeverity, setAnalysisSeverity] = useState<AnalysisSeverity>('none');
  const [showErrors, setShowErrors] = useState<boolean>(false);
  const [defaultOpenBugAccordions, setDefaultOpenBugAccordions] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analysisSectionRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExt && supportedFileExtensions.includes(fileExt)) {
        const lang = fileExtensionToLanguageMap[fileExt];
        if (lang) {
          setSelectedLanguage(lang);
        }
      } else if (file.type.startsWith('text/')) {
         // If it's a text file but extension not in map, default to plaintext or keep autodetect
        if (selectedLanguage === "autodetect" && fileExt !== 'txt') {
            // keep autodetect
        } else {
            setSelectedLanguage("plaintext");
        }
      } else {
         toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: `Unsupported file type. Please upload one of the supported types: ${supportedFileExtensions.map(ext => `.${ext}`).join(', ')}.`,
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; 
        }
        return;
      }

      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        setCode(e.target?.result as string);
        setAnalysisResult(null); 
        setAnalysisSeverity('none');
        setShowErrors(false);
        setDefaultOpenBugAccordions([]);
      };
      reader.readAsText(file);
    }
  };

  const performScrollAfterToast = () => {
    setTimeout(() => { 
        analysisSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleAnalyzeCode = async () => {
    if (!code.trim()) {
      toast({
        variant: "destructive",
        title: "No Code Provided",
        description: "Please enter some code or upload a file to analyze.",
      });
      performScrollAfterToast();
      return;
    }
    setIsLoadingAnalysis(true);
    setError(null);
    setAnalysisResult(null);
    setAnalysisSeverity('none');
    setShowErrors(false);
    setDefaultOpenBugAccordions([]);

    try {
      const langToPass = selectedLanguage === "autodetect" ? undefined : selectedLanguage;
      const result = await analyzeCode(code, fileName || undefined, langToPass);
      setAnalysisResult(result);

      if (result.bugs.length === 0 || (result.bugs.length === 1 && result.bugs[0].severity === 'info')) {
        setAnalysisSeverity('no-issues');
        toast({ title: "Analysis Complete", description: result.bugs.length > 0 ? result.bugs[0].description : "No issues found in your code!" });
      } else if (result.bugs.some(bug => bug.severity === 'critical')) {
        setAnalysisSeverity('critical');
        setShowErrors(false);
        toast({ title: "Analysis Complete", description: "Critical issues found. Review the details below." });
      } else if (result.bugs.some(bug => bug.severity === 'warning')) {
        setAnalysisSeverity('mild');
        setShowErrors(false);
        toast({ title: "Analysis Complete", description: "Mild issues found. Review the details below." });
      } else {
        setAnalysisSeverity('no-issues'); 
        toast({ title: "Analysis Complete", description: "No significant issues found." });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during analysis.";
      setError(errorMessage);
      setAnalysisSeverity('none');
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: errorMessage,
      });
    } finally {
      setIsLoadingAnalysis(false);
      performScrollAfterToast();
    }
  };
  
  const handleShowErrorDetails = () => {
    if (analysisResult) {
      const relevantBugIds = analysisResult.bugs
        .filter(bug => bug.severity !== 'info')
        .map(bug => bug.id);
      setDefaultOpenBugAccordions(relevantBugIds);
    }
    setShowErrors(true);
  };

  const handleApplyFixConfirmation = (fix: FixSuggestion) => {
    setSelectedFixForDialog(fix); 
  };

  const handleApplyFirstFixConfirmation = () => {
    if (analysisResult && analysisResult.fixSuggestions.length > 0) {
      setFixToConfirmOverall(analysisResult.fixSuggestions[0]); 
    }
  };
  
  const executeApplyFix = async (fixToApply: FixSuggestion | null) => {
    if (!fixToApply || !analysisResult) return;
    setIsLoadingFix(true);
    setError(null);
    try {
      const result = await applyFix(code, fixToApply.id, analysisResult.fixSuggestions);
      setCode(result.updatedCode);
      setAnalysisResult(null); 
      setAnalysisSeverity('none');
      setShowErrors(false);
      setDefaultOpenBugAccordions([]);
      toast({
        title: "Fix Applied",
        description: result.message,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while applying fix.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Failed to Apply Fix",
        description: errorMessage,
      });
    } finally {
      setIsLoadingFix(false);
      setSelectedFixForDialog(null);
      setFixToConfirmOverall(null);
      performScrollAfterToast();
    }
  };


  const CodeSnippetDisplay: React.FC<{ snippet?: string, language?: string }> = ({ snippet, language = 'plaintext' }) => {
    if (!snippet) return null;
    return (
      <pre className="mt-2 p-3 bg-muted rounded-md text-sm font-mono overflow-x-auto">
        <code className={`language-${language}`}>{snippet}</code>
      </pre>
    );
  };

  const renderAnalysisContent = () => {
    if (isLoadingAnalysis) {
      return (
        <div className="flex flex-col items-center justify-center h-60">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Analyzing your code...</p>
        </div>
      );
    }

    if (error) {
         return <p className="text-sm text-destructive mt-4 text-center bg-destructive/10 p-3 rounded-md">{error}</p>;
    }

    switch (analysisSeverity) {
      case 'no-issues':
        return (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <ShieldCheck className="h-16 w-16 text-green-500 animate-pulse-icon" />
            <h3 className="mt-4 text-xl font-semibold text-foreground">No Issues Found in Your Code!</h3>
            <p className="text-muted-foreground">{analysisResult?.bugs[0]?.explanation || "Your code looks clean based on our automated checks."}</p>
          </div>
        );
      case 'mild':
        if (!showErrors) {
          return (
            <div className="flex flex-col items-center justify-center h-60 text-center">
              <ShieldAlert className="h-16 w-16 text-yellow-500 animate-pulse-icon" />
              <h3 className="mt-4 text-xl font-semibold text-foreground">Mild Issues Found</h3>
              <Button onClick={handleShowErrorDetails} className="mt-4 rounded-md">Show Details</Button>
            </div>
          );
        }
        break; 
      case 'critical':
        if (!showErrors) {
          return (
            <div className="flex flex-col items-center justify-center h-60 text-center">
              <AlertTriangle className="h-16 w-16 text-destructive animate-pulse-icon" />
              <h3 className="mt-4 text-xl font-semibold text-foreground">Critical Issues Found in Your Code</h3>
              <Button onClick={handleShowErrorDetails} className="mt-4 rounded-md">Show Details</Button>
            </div>
          );
        }
        break;
      default: 
        return (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <ShieldQuestion className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              Enter or upload your code and click "Analyze Code" to see results.
            </p>
          </div>
        );
    }
    
    if (analysisResult && (showErrors || analysisSeverity === 'no-issues')) {
      const relevantBugs = analysisResult.bugs.filter(bug => bug.severity !== 'info'); 

      if (relevantBugs.length === 0 && analysisResult.fixSuggestions.length === 0 && analysisSeverity !== 'no-issues') {
         return (
           <div className="flex flex-col items-center justify-center h-60 text-center">
              <ShieldCheck className="h-12 w-12 text-green-500" />
              <p className="mt-4 text-muted-foreground">
                No specific issues or actionable suggestions found for the provided code.
              </p>
            </div>
         );
      }

      return (
        <ScrollArea className="h-[calc(30rem-theme(spacing.16))]"> 
          <div className="space-y-6 pr-4">
            {relevantBugs.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Detected Issues</h3>
                <Accordion type="multiple" defaultValue={defaultOpenBugAccordions} className="w-full space-y-2">
                  {relevantBugs.map((bug) => (
                    <AccordionItem value={bug.id} key={bug.id} className="bg-card border border-border rounded-md shadow-sm">
                      <AccordionTrigger className="px-4 py-3 text-left hover:no-underline">
                        <div className="flex items-center gap-2">
                          {bug.severity === 'critical' && <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />}
                          {bug.severity === 'warning' && <ShieldAlert className="h-5 w-5 text-yellow-500 shrink-0" />}
                          <span className="font-medium">{bug.description}</span>
                          {bug.lineNumber && <span className="text-xs text-muted-foreground">(Line: {bug.lineNumber})</span>}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-3 pt-1 space-y-2">
                        <p className="text-sm text-muted-foreground">{bug.explanation}</p>
                        <CodeSnippetDisplay snippet={bug.codeSnippet} language={selectedLanguage === 'autodetect' ? undefined : selectedLanguage} />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}

            {analysisResult.fixSuggestions.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-3 text-foreground">Fix Suggestions</h3>
                <div className="space-y-3">
                  {analysisResult.fixSuggestions.map((suggestion) => (
                    <Card key={suggestion.id} className="bg-card border-border shadow-sm">
                      <CardHeader className="p-4">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          {suggestion.description}
                        </CardTitle>
                      </CardHeader>
                      { (suggestion.explanation || suggestion.suggestedCodePatch) &&
                        <CardContent className="px-4 pb-3 pt-0 space-y-2">
                          {suggestion.explanation && <p className="text-sm text-muted-foreground">{suggestion.explanation}</p>}
                          <CodeSnippetDisplay snippet={suggestion.suggestedCodePatch} language={selectedLanguage === 'autodetect' ? undefined : selectedLanguage} />
                        </CardContent>
                      }
                      <CardFooter className="p-4 pt-0">
                         <Button 
                              variant="default" 
                              size="sm" 
                              onClick={() => handleApplyFixConfirmation(suggestion)}
                              className="rounded-md w-full sm:w-auto"
                            >
                              Apply This Fix
                            </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      );
    }
    return (
        <div className="flex flex-col items-center justify-center h-60 text-center">
            <ShieldQuestion className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              Analysis results will appear here.
            </p>
        </div>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4 border-b border-border">
        <ViseCodeLogo />
        <p className="text-sm text-muted-foreground text-center sm:text-right">
          AI-powered static analysis for bug detection and code improvement.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Code Input
            </CardTitle>
            <CardDescription>Paste your code below or upload a file. Select the language if known.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex flex-col sm:flex-row gap-2 items-center">
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="w-full sm:w-[220px] rounded-md">
                  <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4" />
                    <SelectValue placeholder="Select Language" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {supportedLanguages.map(lang => (
                    <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto rounded-md">
                <UploadCloud className="mr-2 h-4 w-4" /> Upload File
              </Button>
              <Input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept={supportedFileExtensions.map(ext => `.${ext}`).join(',')}
              />
            </div>
            {fileName && <span className="text-sm text-muted-foreground truncate block" title={fileName}>File: {fileName}</span>}
            <Textarea
              placeholder="Enter your code snippet here..."
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setAnalysisResult(null); 
                setAnalysisSeverity('none');
                setShowErrors(false);
                setDefaultOpenBugAccordions([]);
              }}
              className="h-80 min-h-[200px] font-mono text-sm rounded-md shadow-inner"
              aria-label="Code input area"
              spellCheck={false}
            />
          </CardContent>
          <CardFooter>
            <Button onClick={handleAnalyzeCode} disabled={isLoadingAnalysis || !code.trim()} className="w-full rounded-md">
              {isLoadingAnalysis ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Analyze Code
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg" ref={analysisSectionRef}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-6 h-6 text-primary" />
              Analysis & Suggestions
            </CardTitle>
            <CardDescription>Potential bugs and fix suggestions will appear here.</CardDescription>
          </CardHeader>
          <CardContent>
            {renderAnalysisContent()}
          </CardContent>
          {analysisResult && analysisResult.fixSuggestions.length > 0 && (analysisSeverity === 'mild' || analysisSeverity === 'critical') && showErrors && (
            <CardFooter>
              <Button onClick={handleApplyFirstFixConfirmation} className="w-full rounded-md" variant="outline" disabled={isLoadingFix}>
                {isLoadingFix && fixToConfirmOverall ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Try to Apply First Suggested Fix
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
      <footer className="text-center text-sm text-muted-foreground py-8">
        <p>ViseCode analysis code through patterns. Manual review is recommended for complex logic.</p>
      </footer>

      {/* Dialog for individual fix confirmation */}
      <AlertDialog open={!!selectedFixForDialog} onOpenChange={(isOpen) => !isOpen && setSelectedFixForDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Fix Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to apply this fix: "{selectedFixForDialog?.description}"? This will modify your code in the input area.
              <CodeSnippetDisplay snippet={selectedFixForDialog?.suggestedCodePatch} language={selectedLanguage === 'autodetect' ? undefined : selectedLanguage} />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedFixForDialog(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => executeApplyFix(selectedFixForDialog)} disabled={isLoadingFix}>
              {isLoadingFix && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Apply
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog for "Try to Apply First Suggested Fix" confirmation */}
      <AlertDialog open={!!fixToConfirmOverall} onOpenChange={(isOpen) => !isOpen && setFixToConfirmOverall(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Applying First Suggestion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to apply the first suggested fix: "{fixToConfirmOverall?.description}"? This will modify your code.
              <CodeSnippetDisplay snippet={fixToConfirmOverall?.suggestedCodePatch} language={selectedLanguage === 'autodetect' ? undefined : selectedLanguage} />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFixToConfirmOverall(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => executeApplyFix(fixToConfirmOverall)} disabled={isLoadingFix}>
              {isLoadingFix && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply This Fix
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

