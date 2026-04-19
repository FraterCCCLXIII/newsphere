import { useMemo, type ComponentPropsWithoutRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";

import { ExternalBrowserLink } from "@/components/layout/external-browser-link";
import { safeHttpHref } from "@/lib/safe-url";
import { cn } from "@/lib/utils";

type MdComponents = NonNullable<ComponentPropsWithoutRef<typeof Markdown>["components"]>;

function ChatMarkdownAnchor({
  href,
  children,
  className,
}: ComponentPropsWithoutRef<"a">) {
  if (!href) {
    return <span className={className}>{children}</span>;
  }
  if (href.startsWith("/")) {
    return (
      <Link
        to={href}
        className={cn(
          "font-medium text-primary underline underline-offset-2 hover:text-primary/90",
          className,
        )}
      >
        {children}
      </Link>
    );
  }
  const safe = safeHttpHref(href);
  if (safe) {
    return (
      <ExternalBrowserLink
        href={safe}
        className={cn(
          "inline font-medium text-primary underline underline-offset-2 hover:text-primary/90",
          className,
        )}
      >
        {children}
      </ExternalBrowserLink>
    );
  }
  return (
    <span className={cn("text-muted-foreground", className)}>{children}</span>
  );
}

function buildComponents(): MdComponents {
  return {
    p: ({ children }) => (
      <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    del: ({ children }) => (
      <del className="text-muted-foreground line-through">{children}</del>
    ),
    h1: ({ children }) => (
      <h3 className="mb-1 mt-3 text-base font-semibold first:mt-0">{children}</h3>
    ),
    h2: ({ children }) => (
      <h3 className="mb-1 mt-3 text-base font-semibold first:mt-0">{children}</h3>
    ),
    h3: ({ children }) => (
      <h4 className="mb-1 mt-2 text-sm font-semibold first:mt-0">{children}</h4>
    ),
    h4: ({ children }) => (
      <h4 className="mb-1 mt-2 text-sm font-semibold first:mt-0">{children}</h4>
    ),
    h5: ({ children }) => (
      <h5 className="mb-1 mt-2 text-sm font-medium first:mt-0">{children}</h5>
    ),
    h6: ({ children }) => (
      <h5 className="mb-1 mt-2 text-sm font-medium first:mt-0">{children}</h5>
    ),
    ul: ({ children }) => (
      <ul className="my-2 list-disc pl-5 [li]:my-0.5">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-2 list-decimal pl-5 [li]:my-0.5">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="my-2 border-l-2 border-muted-foreground/35 pl-3 text-muted-foreground">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="my-3 border-border" />,
    pre: ({ children }) => (
      <pre className="my-2 overflow-x-auto rounded-md border border-border bg-muted/40 p-3 text-xs leading-relaxed">
        {children}
      </pre>
    ),
    code: ({ className, children, ...props }) => {
      const isBlock = /\blanguage-/.test(className ?? "");
      if (isBlock) {
        return (
          <code
            className={cn(
              "block whitespace-pre font-mono text-foreground",
              className,
            )}
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.875em] text-foreground"
          {...props}
        >
          {children}
        </code>
      );
    },
    a: ChatMarkdownAnchor,
    table: ({ children }) => (
      <div className="my-2 max-w-full overflow-x-auto">
        <table className="w-full min-w-[12rem] border-collapse border border-border text-xs">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-muted/50">{children}</thead>
    ),
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => <tr className="border-b border-border last:border-b-0">{children}</tr>,
    th: ({ children }) => (
      <th className="border border-border px-2 py-1.5 text-left font-medium">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-border px-2 py-1.5 align-top">{children}</td>
    ),
    img: ({ src, alt, ...props }) => {
      const safe = src ? safeHttpHref(src) : null;
      if (!safe) return null;
      return (
        <img
          src={safe}
          alt={alt ?? ""}
          className="my-2 max-h-48 max-w-full rounded-md border border-border object-contain"
          {...props}
        />
      );
    },
  };
}

export function AiChatMessageBody({ content }: { content: string }) {
  const components = useMemo(() => buildComponents(), []);

  if (content.trim() === "") {
    return null;
  }

  return (
    <div className="text-sm leading-relaxed text-foreground [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={components}
      >
        {content}
      </Markdown>
    </div>
  );
}
