"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMarkdownProps {
    content: string;
    className?: string;
}

export function ChatMarkdown({ content, className }: ChatMarkdownProps) {
    return (
        <div className={`prose prose-sm dark:prose-invert max-w-none ${className || ""}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-1.5">{children}</h3>,
                    h2: ({ children }) => <h4 className="text-sm font-semibold mt-2.5 mb-1">{children}</h4>,
                    h3: ({ children }) => <h5 className="text-sm font-medium mt-2 mb-1">{children}</h5>,
                    p: ({ children }) => <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="text-sm list-disc pl-4 space-y-0.5 mb-2">{children}</ul>,
                    ol: ({ children }) => <ol className="text-sm list-decimal pl-4 space-y-0.5 mb-2">{children}</ol>,
                    li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
                    code: ({ className: codeClassName, children, ...props }) => {
                        const isInline = !codeClassName;
                        if (isInline) {
                            return (
                                <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono" {...props}>
                                    {children}
                                </code>
                            );
                        }
                        return (
                            <pre className="rounded-md bg-muted p-3 overflow-x-auto my-2">
                                <code className="text-xs font-mono" {...props}>
                                    {children}
                                </code>
                            </pre>
                        );
                    },
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-2">
                            <table className="text-xs w-full border-collapse">{children}</table>
                        </div>
                    ),
                    th: ({ children }) => (
                        <th className="border border-border bg-muted px-2 py-1.5 text-left font-medium">{children}</th>
                    ),
                    td: ({ children }) => (
                        <td className="border border-border px-2 py-1.5">{children}</td>
                    ),
                    a: ({ href, children }) => (
                        <a href={href} className="text-primary underline underline-offset-2 hover:text-primary/80" target="_blank" rel="noopener noreferrer">
                            {children}
                        </a>
                    ),
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-primary/30 pl-3 my-2 text-muted-foreground italic">
                            {children}
                        </blockquote>
                    ),
                    hr: () => <hr className="border-border my-3" />,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
