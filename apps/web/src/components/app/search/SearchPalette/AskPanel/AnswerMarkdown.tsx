import type { ReactElement } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Renders the streamed Ask-Dhaga answer as Markdown. The Sonnet answer stage
 * emits Markdown (bold names, bullet lists, links); rendering it as a raw
 * `whitespace-pre-wrap` string showed the literal `**` / `-` syntax. Streaming
 * is safe: react-markdown re-parses the growing string each delta, and a
 * half-written token (an unclosed `**`) simply renders as text until it closes.
 *
 * No raw HTML: react-markdown does not render embedded HTML unless `rehype-raw`
 * is added (it is not), and its default URL sanitiser strips dangerous link
 * protocols — the answer is model-generated, so that guarantee matters.
 */
const COMPONENTS: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-paper">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-ember underline decoration-ember/40 underline-offset-2 hover:decoration-ember"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="mb-3 ml-1 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 ml-1 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-1 marker:text-fog">{children}</li>,
  h1: ({ children }) => <h3 className="mb-2 mt-3 font-semibold text-paper first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 mt-3 font-semibold text-paper first:mt-0">{children}</h3>,
  h3: ({ children }) => <h3 className="mb-2 mt-3 font-semibold text-paper first:mt-0">{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-seam pl-3 text-fog">{children}</blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-seam/60 px-1 py-0.5 font-mono text-[0.85em] text-paper">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg bg-seam/40 p-3 font-mono text-xs [&_code]:bg-transparent [&_code]:p-0">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-3 border-seam" />,
};

export function AnswerMarkdown({ content, className }: { content: string; className?: string }): ReactElement {
  return (
    <div className={cn("text-sm leading-relaxed text-paper", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
