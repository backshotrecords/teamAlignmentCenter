import DOMPurify from "dompurify";
import { marked } from "marked";
import { useEffect, useMemo, useRef } from "react";

interface MarkdownPreviewProps {
  markdown: string;
  label?: string;
}

marked.setOptions({
  breaks: true,
  gfm: true,
});

export function MarkdownPreview({ markdown, label }: MarkdownPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const html = useMemo(() => {
    const rawHtml = marked.parse(markdown || "_Nothing generated yet._") as string;
    return DOMPurify.sanitize(rawHtml, {
      ADD_ATTR: ["target", "rel"],
    });
  }, [markdown]);

  useEffect(() => {
    const container = previewRef.current;

    if (!container) {
      return;
    }

    const mermaidBlocks = Array.from(
      container.querySelectorAll("pre code.language-mermaid, code.language-mermaid"),
    );

    if (!mermaidBlocks.length) {
      return;
    }

    let cancelled = false;

    import("mermaid").then(({ default: mermaid }) => {
      if (cancelled) {
        return;
      }

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        themeVariables: {
          primaryColor: "#eef7f3",
          primaryTextColor: "#1b1f23",
          primaryBorderColor: "#1f7a5f",
          lineColor: "#64748b",
          secondaryColor: "#fff5e1",
          tertiaryColor: "#f8fafc",
        },
      });

      mermaidBlocks.forEach((block, index) => {
        const source = block.textContent?.trim();

        if (!source) {
          return;
        }

        const id = `tac-mermaid-${Date.now()}-${index}`;
        const wrapper = document.createElement("div");

        wrapper.className = "mermaid-render";

        mermaid
          .render(id, source)
          .then(({ svg }) => {
            wrapper.innerHTML = DOMPurify.sanitize(svg, {
              USE_PROFILES: { svg: true, svgFilters: true },
            });
            const parentPre = block.closest("pre");

            if (parentPre) {
              parentPre.replaceWith(wrapper);
            } else {
              block.replaceWith(wrapper);
            }
          })
          .catch(() => {
            wrapper.className = "mermaid-render mermaid-render--error";
            wrapper.textContent = source;
            const parentPre = block.closest("pre");

            if (parentPre) {
              parentPre.replaceWith(wrapper);
            } else {
              block.replaceWith(wrapper);
            }
          });
      });
    });

    return () => {
      cancelled = true;
    };
  }, [html]);

  return (
    <div className="markdown-preview-shell" aria-label={label}>
      <div
        ref={previewRef}
        className="markdown-preview"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
