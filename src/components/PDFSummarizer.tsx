"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileText, Loader2, File, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type SummaryState = "idle" | "uploading" | "summarizing" | "done" | "error";

interface SummaryData {
  shortSummary: string;
  mainPoints: string[];
  keyFindings: string[];
}

export default function PDFSummarizer() {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<SummaryState>("idle");
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile);
      setState("idle");
    } else {
      setErrorMsg("Please upload a valid PDF file.");
      setState("error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setState("idle");
    }
  };

  const handleSummarize = async () => {
    if (!file) return;

    setState("summarizing");
    setErrorMsg("");
    setSummary(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errData;
        try {
          errData = await response.json();
        } catch (e) {
          throw new Error(`Server returned status ${response.status}: ${response.statusText}`);
        }
        throw new Error(errData.error || "Failed to summarize PDF.");
      }

      const data = await response.json();
      setSummary(data.summary);
      setState("done");
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
      setState("error");
    }
  };

  const resetState = () => {
    setFile(null);
    setSummary(null);
    setState("idle");
    setErrorMsg("");
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          PDF Summarizer
        </h1>
        <p className="text-gray-400">
          Extract key insights, findings, and summaries from your PDFs in seconds using AI.
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-gray-600 hover:border-gray-500 hover:bg-white/5"
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="application/pdf"
                onChange={handleFileChange}
              />
              <div className="bg-white/10 p-4 rounded-full mb-4">
                <UploadCloud className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-lg font-medium text-gray-200">
                Drop your PDF here
              </p>
              <p className="text-sm text-gray-400 mt-2">
                or click to browse from your computer
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="file-info"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-500/20 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-200 line-clamp-1">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                {state === "idle" && (
                  <button
                    onClick={resetState}
                    className="text-sm text-gray-400 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              {state === "error" && (
                <div className="flex items-start space-x-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">Error summarizing PDF</p>
                    <p className="text-sm opacity-80 mt-1">{errorMsg}</p>
                  </div>
                </div>
              )}

              {state === "idle" || state === "error" ? (
                <button
                  onClick={handleSummarize}
                  className="w-full flex items-center justify-center py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98]"
                >
                  Generate Summary
                </button>
              ) : state === "summarizing" ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                  <p className="text-gray-300 font-medium animate-pulse">
                    Extracting text and analyzing document...
                  </p>
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {state === "done" && summary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl space-y-8"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
                Analysis Complete
              </h2>
              <button
                onClick={resetState}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
              >
                Summarize Another
              </button>
            </div>

            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold text-blue-400 mb-3">
                  Short Summary
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  {summary.shortSummary}
                </p>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="bg-white/5 rounded-xl p-5 border border-white/5">
                  <h3 className="text-lg font-semibold text-purple-400 mb-3 flex items-center gap-2">
                    Main Points
                  </h3>
                  <ul className="space-y-2">
                    {summary.mainPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-300">
                        <span className="text-purple-500 mt-1.5 flex-shrink-0">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="bg-white/5 rounded-xl p-5 border border-white/5">
                  <h3 className="text-lg font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                    Key Findings
                  </h3>
                  <ul className="space-y-2">
                    {summary.keyFindings.map((finding, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-300">
                        <span className="text-emerald-500 mt-1.5 flex-shrink-0">•</span>
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
