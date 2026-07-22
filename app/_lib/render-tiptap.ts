import "server-only";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import LinkExt from "@tiptap/extension-link";
import ImageExt from "@tiptap/extension-image";
import sanitizeHtml from "sanitize-html";

// Must mirror the editor's extensions so stored JSON renders identically.
const extensions = [
  StarterKit.configure({ heading: { levels: [2, 3] } }),
  LinkExt.configure({ openOnClick: false }),
  ImageExt.configure({ inline: false }),
];

/** Coerce stored content to a Tiptap doc object (handles jsonb-as-string). */
function toDoc(content: unknown): Record<string, unknown> | null {
  if (typeof content === "string") {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  if (content && typeof content === "object") return content as Record<string, unknown>;
  return null;
}

/** Drop image nodes that have no src (legacy empty inserts) so they don't
 *  render as broken/empty <img>. Mutates a shallow-cloned tree. */
function stripEmptyImages(node: unknown): unknown {
  if (!node || typeof node !== "object") return node;
  const n = node as { type?: string; attrs?: { src?: unknown }; content?: unknown[] };
  if (Array.isArray(n.content)) {
    n.content = n.content
      .filter((c) => !(isImage(c) && !hasSrc(c)))
      .map(stripEmptyImages);
  }
  return n;
}
function isImage(c: unknown): boolean {
  return !!c && typeof c === "object" && (c as { type?: string }).type === "image";
}
function hasSrc(c: unknown): boolean {
  const src = (c as { attrs?: { src?: unknown } }).attrs?.src;
  return typeof src === "string" && src.length > 0;
}

/** Tiptap JSON document → sanitized HTML string for public rendering. */
export function renderTiptap(content: unknown): string {
  const doc = toDoc(content);
  if (!doc) return "";
  let html = "";
  try {
    html = generateHTML(stripEmptyImages(structuredClone(doc)) as Record<string, unknown>, extensions);
  } catch {
    return "";
  }
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2"]),
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
      code: ["class"],
      span: ["class"],
      pre: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto", "data"],
  });
}

/** Inject sequential ids into each <h2> so the TOC anchors line up. */
export function injectHeadingIds(html: string): string {
  let i = 0;
  return html.replace(/<h2(\s[^>]*)?>/g, () => `<h2 id="sec-${i++}">`);
}

/** Extract H2 headings (text + id) to build the table of contents. */
export function extractToc(content: unknown): { id: string; text: string }[] {
  const doc = toDoc(content);
  if (!doc) return [];
  const items: { id: string; text: string }[] = [];
  let i = 0;
  const walk = (node: { type?: string; attrs?: { level?: number }; content?: unknown[] }) => {
    // Mirror the renderer: a heading renders as <h2> unless its level is 3.
    // (Stored docs sometimes omit `level`, which falls back to <h2>.)
    if (node.type === "heading" && node.attrs?.level !== 3) {
      const text = collectText(node);
      items.push({ id: `sec-${i++}`, text: text || "제목 없음" });
    }
    if (Array.isArray(node.content)) node.content.forEach((c) => walk(c as never));
  };
  walk(doc as never);
  return items;
}

function collectText(node: { text?: string; content?: unknown[] }): string {
  if (node.text) return node.text;
  if (Array.isArray(node.content))
    return node.content.map((c) => collectText(c as never)).join("");
  return "";
}
