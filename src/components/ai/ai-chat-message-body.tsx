import { Fragment } from "react";
import { Link } from "react-router-dom";

import { ExternalBrowserLink } from "@/components/layout/external-browser-link";
import { safeHttpHref } from "@/lib/safe-url";

const MD_LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

export function AiChatMessageBody({ content }: { content: string }) {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const match of content.matchAll(MD_LINK)) {
    const m = match as RegExpMatchArray & { index: number };
    const full = m[0];
    const label = m[1];
    const href = m[2]?.trim() ?? "";
    if (m.index > last) {
      nodes.push(
        <span key={`t-${k++}`}>{content.slice(last, m.index)}</span>,
      );
    }
    if (href.startsWith("/")) {
      nodes.push(
        <Link
          key={`l-${k++}`}
          to={href}
          className="font-medium text-primary underline underline-offset-2 hover:text-primary/90"
        >
          {label}
        </Link>,
      );
    } else {
      const safe = safeHttpHref(href);
      if (safe) {
        nodes.push(
          <ExternalBrowserLink
            key={`l-${k++}`}
            href={safe}
            className="inline font-medium text-primary underline underline-offset-2 hover:text-primary/90"
          >
            {label}
          </ExternalBrowserLink>,
        );
      } else {
        nodes.push(<span key={`l-${k++}`}>{full}</span>);
      }
    }
    last = m.index + full.length;
  }
  if (last < content.length) {
    nodes.push(<span key={`t-${k++}`}>{content.slice(last)}</span>);
  }
  return (
    <div className="whitespace-pre-wrap break-words text-sm">
      {nodes.length === 0 ? (
        content
      ) : (
        nodes.map((n, i) => <Fragment key={i}>{n}</Fragment>)
      )}
    </div>
  );
}
