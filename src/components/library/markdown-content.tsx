"use client";

import React, { useMemo } from "react";
import { ExternalLink, CheckSquare, Square } from "lucide-react";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Parses inline markdown: bold, italic, inline code, and links.
 */
function renderInlineMarkdown(text: string): React.ReactNode[] {
  // Regex to match inline tokens:
  // 1. Links: [text](url)
  // 2. Inline code: `code`
  // 3. Bold: **text** or __text__
  // 4. Italic: *text* or _text_
  const tokenRegex = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Link: [text](url)
    if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
      const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) {
        const [, label, url] = match;
        const isSafe = /^https?:\/\//i.test(url) || url.startsWith("#");
        return (
          <a
            key={idx}
            href={isSafe ? url : "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-indigo-600 hover:underline dark:text-indigo-400 font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{label}</span>
            <ExternalLink className="inline h-3 w-3 ml-0.5" />
          </a>
        );
      }
    }

    // Inline Code: `code`
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={idx}
          className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-indigo-700 dark:bg-slate-800 dark:text-indigo-300"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold: **text** or __text__
    if (
      (part.startsWith("**") && part.endsWith("**") && part.length > 4) ||
      (part.startsWith("__") && part.endsWith("__") && part.length > 4)
    ) {
      return (
        <strong key={idx} className="font-bold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic: *text* or _text_
    if (
      (part.startsWith("*") && part.endsWith("*") && part.length > 2) ||
      (part.startsWith("_") && part.endsWith("_") && part.length > 2)
    ) {
      return (
        <em key={idx} className="italic text-slate-800 dark:text-slate-200">
          {part.slice(1, -1)}
        </em>
      );
    }

    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

/**
 * Lightweight, safe React Markdown Renderer for ORBIT Personal Library notes.
 * Zero external dependencies, pure React & Tailwind CSS.
 */
export function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  const elements = useMemo(() => {
    if (!content.trim()) return null;

    const lines = content.split("\n");
    const blocks: React.ReactNode[] = [];

    let inCodeBlock = false;
    let codeLanguage = "";
    let codeLines: string[] = [];
    let listItems: React.ReactNode[] = [];
    let isOrderedList = false;

    function flushList(key: string | number) {
      if (listItems.length > 0) {
        if (isOrderedList) {
          blocks.push(
            <ol key={`ol-${key}`} className="my-2.5 ml-5 list-decimal space-y-1 text-xs">
              {listItems}
            </ol>
          );
        } else {
          blocks.push(
            <ul key={`ul-${key}`} className="my-2.5 ml-5 list-disc space-y-1 text-xs">
              {listItems}
            </ul>
          );
        }
        listItems = [];
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Code Block boundary: ```
      if (trimmed.startsWith("```")) {
        if (inCodeBlock) {
          blocks.push(
            <div
              key={`code-${i}`}
              className="my-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 p-3.5 font-mono text-xs text-slate-100 dark:border-slate-800"
            >
              {codeLanguage && (
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {codeLanguage}
                </div>
              )}
              <pre className="text-xs leading-relaxed">
                <code>{codeLines.join("\n")}</code>
              </pre>
            </div>
          );
          inCodeBlock = false;
          codeLanguage = "";
          codeLines = [];
        } else {
          flushList(i);
          inCodeBlock = true;
          codeLanguage = trimmed.slice(3).trim();
          codeLines = [];
        }
        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      // Horizontal Rule: --- or ***
      if (/^(\-{3,}|\*{3,})$/.test(trimmed)) {
        flushList(i);
        blocks.push(<hr key={`hr-${i}`} className="my-4 border-slate-200 dark:border-slate-800" />);
        continue;
      }

      // Headers: #, ##, ###, ####
      if (trimmed.startsWith("# ")) {
        flushList(i);
        blocks.push(
          <h1 key={`h1-${i}`} className="mt-4 mb-2 text-lg font-bold text-slate-900 dark:text-white">
            {renderInlineMarkdown(trimmed.slice(2))}
          </h1>
        );
        continue;
      }

      if (trimmed.startsWith("## ")) {
        flushList(i);
        blocks.push(
          <h2 key={`h2-${i}`} className="mt-3.5 mb-1.5 text-base font-bold text-slate-900 dark:text-white">
            {renderInlineMarkdown(trimmed.slice(3))}
          </h2>
        );
        continue;
      }

      if (trimmed.startsWith("### ")) {
        flushList(i);
        blocks.push(
          <h3 key={`h3-${i}`} className="mt-3 mb-1 text-sm font-bold text-slate-900 dark:text-white">
            {renderInlineMarkdown(trimmed.slice(4))}
          </h3>
        );
        continue;
      }

      if (trimmed.startsWith("#### ")) {
        flushList(i);
        blocks.push(
          <h4 key={`h4-${i}`} className="mt-2 mb-1 text-xs font-bold text-slate-900 dark:text-white">
            {renderInlineMarkdown(trimmed.slice(5))}
          </h4>
        );
        continue;
      }

      // Blockquote: >
      if (trimmed.startsWith("> ")) {
        flushList(i);
        blocks.push(
          <blockquote
            key={`quote-${i}`}
            className="my-2.5 border-l-3 border-indigo-500 bg-indigo-50/40 py-1.5 pl-3 pr-2 text-xs italic text-slate-700 dark:bg-indigo-950/20 dark:text-slate-300 rounded-r-lg"
          >
            {renderInlineMarkdown(trimmed.slice(2))}
          </blockquote>
        );
        continue;
      }

      // Task List items: - [ ] or - [x]
      if (/^[\*\-]\s+\[([ xX])\]\s+/.test(trimmed)) {
        flushList(i);
        const isChecked = trimmed.includes("[x]") || trimmed.includes("[X]");
        const textContent = trimmed.replace(/^[\*\-]\s+\[([ xX])\]\s+/, "");
        blocks.push(
          <div key={`task-${i}`} className="my-1.5 flex items-center gap-2 text-xs">
            {isChecked ? (
              <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <Square className="h-4 w-4 text-slate-400 shrink-0" />
            )}
            <span
              className={isChecked ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-200"}
            >
              {renderInlineMarkdown(textContent)}
            </span>
          </div>
        );
        continue;
      }

      // Unordered list: - or *
      if (/^[\*\-]\s+/.test(trimmed)) {
        isOrderedList = false;
        listItems.push(
          <li key={`li-${i}`} className="leading-relaxed text-slate-700 dark:text-slate-300">
            {renderInlineMarkdown(trimmed.replace(/^[\*\-]\s+/, ""))}
          </li>
        );
        continue;
      }

      // Ordered list: 1. 2. etc.
      if (/^\d+\.\s+/.test(trimmed)) {
        isOrderedList = true;
        listItems.push(
          <li key={`li-${i}`} className="leading-relaxed text-slate-700 dark:text-slate-300">
            {renderInlineMarkdown(trimmed.replace(/^\d+\.\s+/, ""))}
          </li>
        );
        continue;
      }

      // Empty line -> paragraph separator
      if (!trimmed) {
        flushList(i);
        continue;
      }

      // Regular paragraph line
      flushList(i);
      blocks.push(
        <p key={`p-${i}`} className="my-1.5 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
          {renderInlineMarkdown(line)}
        </p>
      );
    }

    flushList("end");

    // In case code block wasn't closed
    if (inCodeBlock && codeLines.length > 0) {
      blocks.push(
        <div
          key="code-unclosed"
          className="my-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-900 p-3.5 font-mono text-xs text-slate-100 dark:border-slate-800"
        >
          <pre className="text-xs leading-relaxed">
            <code>{codeLines.join("\n")}</code>
          </pre>
        </div>
      );
    }

    return blocks;
  }, [content]);

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}

