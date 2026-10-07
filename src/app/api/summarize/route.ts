import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini API
// Make sure to add GEMINI_API_KEY to your .env.local file
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });

export async function POST(req: NextRequest) {
  try {
    // Polyfills for pdf-parse (which depends on pdfjs-dist) in Node environments
    if (typeof globalThis.DOMMatrix === "undefined") {
      (globalThis as any).DOMMatrix = class DOMMatrix {};
    }
    if (typeof globalThis.Path2D === "undefined") {
      (globalThis as any).Path2D = class Path2D {};
    }
    
    // Import pdf-parse dynamically inside the route to avoid Next.js module evaluation crashes
    const pdfParse = require("pdf-parse");

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Read the file into a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF text - Limit to first 5 pages for extreme speed
    const parse = pdfParse.default || pdfParse;
    const pdfData = await parse(buffer, { max: 5 });
    const text = pdfData.text;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract text from the PDF. It might be empty or an image-based PDF." },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    // Prompt Gemini for a structured summary
    const prompt = `
You are an expert summarizer. I will provide you with the text extracted from a PDF document.
I need you to summarize it and output the result strictly in JSON format.
The JSON must have the following structure:
{
  "shortSummary": "A concise paragraph summarizing the entire document.",
  "mainPoints": ["Point 1", "Point 2", "Point 3", ...],
  "keyFindings": ["Finding 1", "Finding 2", ...]
}

Here is the document text:
"""
${text.substring(0, 5000)} // Limit to 5000 chars to strictly prevent API timeouts
"""
    `;

    let resultText = "";
    let retries = 6;
    let delay = 2000;
    
    while (retries > 0) {
      try {
        const fetchRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
              }
            }),
            signal: AbortSignal.timeout(30000)
          }
        );
        
        if (!fetchRes.ok) {
           const errText = await fetchRes.text();
           throw new Error(errText);
        }
        
        const data = await fetchRes.json();
        resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        break;
      } catch (err: any) {
        if (err?.name === "TimeoutError" || err?.message?.includes("503") || err?.message?.includes("UNAVAILABLE")) {
          retries--;
          if (retries === 0) throw err;
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          throw err;
        }
      }
    }
    
    if (!resultText) {
      throw new Error("No response from AI");
    }

    const summary = JSON.parse(resultText);

    return NextResponse.json({ summary });

  } catch (error: any) {
    console.error("PDF Summarization Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process PDF" },
      { status: 500 }
    );
  }
}
