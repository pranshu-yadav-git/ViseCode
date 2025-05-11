
import { NextResponse, type NextRequest } from 'next/server';
import { invokeAnalyzeCodeFlow } from '@/ai/flows/analyze-code-flow';
import { AnalyzeCodeInputSchema } from '@/lib/schemas'; // Updated import path
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = AnalyzeCodeInputSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ error: "Invalid input", details: validationResult.error.format() }, { status: 400 });
    }

    const { code, fileName } = validationResult.data;
    const analysisResult = await invokeAnalyzeCodeFlow({ code, fileName });

    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error("Error in /api/analyze-code:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: "Failed to analyze code", details: errorMessage }, { status: 500 });
  }
}
