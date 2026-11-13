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
            className="inline-flex items-center gap-0.5 text-orbit-accent hover:underline font-medium"
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
          className="rounded-md bg-orbit-surface-secondary px-1.5 py-0.5 font-mono text-[11px] text-orbit-accent"
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
        <strong key={idx} className="font-bold text-orbit-text">
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
        <em key={idx} className="italic text-orbit-text">
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
              className="my-3 overflow-x-auto rounded-orbit-card border border-orbit-border bg-orbit-surface-secondary p-3.5 font-mono text-xs text-orbit-text"
            >
              {codeLanguage && (
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-orbit-text-muted">
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
        blocks.push(<hr key={`hr-${i}`} className="my-4 border-orbit-border" />);
        continue;
      }

      // Headers: #, ##, ###, ####
      if (trimmed.startsWith("# ")) {
        flushList(i);
        blocks.push(
          <h1 key={`h1-${i}`} className="mt-4 mb-2 font-display text-lg font-semibold text-orbit-text">
            {renderInlineMarkdown(trimmed.slice(2))}
          </h1>
        );
        continue;
      }

      if (trimmed.startsWith("## ")) {
        flushList(i);
        blocks.push(
          <h2 key={`h2-${i}`} className="mt-3.5 mb-1.5 font-display text-base font-semibold text-orbit-text">
            {renderInlineMarkdown(trimmed.slice(3))}
          </h2>
        );
        continue;
      }

      if (trimmed.startsWith("### ")) {
        flushList(i);
        blocks.push(
          <h3 key={`h3-${i}`} className="mt-3 mb-1 font-display text-sm font-semibold text-orbit-text">
            {renderInlineMarkdown(trimmed.slice(4))}
          </h3>
        );
        continue;
      }

      if (trimmed.startsWith("#### ")) {
        flushList(i);
        blocks.push(
          <h4 key={`h4-${i}`} className="mt-2 mb-1 text-xs font-bold text-orbit-text">
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
            className="my-2.5 border-l-3 border-orbit-accent bg-orbit-accent-soft/35 py-1.5 pl-3 pr-2 text-xs italic text-orbit-text-secondary rounded-r-lg"
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
              <CheckSquare className="h-4 w-4 text-orbit-success shrink-0" />
            ) : (
              <Square className="h-4 w-4 text-orbit-text-muted shrink-0" />
            )}
            <span
              className={isChecked ? "line-through text-orbit-text-muted" : "text-orbit-text"}
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
          <li key={`li-${i}`} className="leading-relaxed text-orbit-text-secondary">
            {renderInlineMarkdown(trimmed.replace(/^[\*\-]\s+/, ""))}
          </li>
        );
        continue;
      }

      // Ordered list: 1. 2. etc.
      if (/^\d+\.\s+/.test(trimmed)) {
        isOrderedList = true;
        listItems.push(
          <li key={`li-${i}`} className="leading-relaxed text-orbit-text-secondary">
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
        <p key={`p-${i}`} className="my-1.5 text-xs text-orbit-text-secondary leading-relaxed">
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
          className="my-3 overflow-x-auto rounded-orbit-card border border-orbit-border bg-orbit-surface-secondary p-3.5 font-mono text-xs text-orbit-text"
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

