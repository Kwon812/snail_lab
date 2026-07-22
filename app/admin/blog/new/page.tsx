"use client";

import {useEditor, EditorContent, type Editor} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import LinkExt from "@tiptap/extension-link";
import ImageExt from "@tiptap/extension-image";
import FileHandler from "@tiptap/extension-file-handler";
import {Suspense, useEffect, useMemo, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useRouter, useSearchParams} from "next/navigation";
import {Arrow, Chip, Eyebrow, Section} from "../../../_components/ui";
import {Spinner} from "../../../_components/spinner";
import {createPost, getPost, updatePost} from "../../../_actions/posts";
import {uploadImage} from "../../../_lib/upload";
import {ThumbnailField} from "../../_components/ThumbnailField";
import {categories} from "../../../_data/content";

const CATS = categories.filter((c) => c !== "전체");
const TONE = {a: "#f2933f", b: "#cf4500"};
const TODAY = "2026.07.22";

export default function WritePage() {
    return (
        <Suspense fallback={<div className="flex justify-center pt-48"><Spinner size={52}/></div>}>
            <WriteEditor/>
        </Suspense>
    );
}

function WriteEditor() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("id"); // present ⇒ edit mode
    const isEdit = !!editId;

    const [title, setTitle] = useState("");
    const [excerpt, setExcerpt] = useState("");
    const [cat, setCat] = useState(CATS[0]);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [thumbnail, setThumbnail] = useState<string | null>(null);
    const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
    const [preview, setPreview] = useState(false);
    const [saved, setSaved] = useState<string | null>(null);

    function addTag(raw: string) {
        const t = raw.trim().replace(/^#/, "");
        if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
        setTagInput("");
    }

    function removeTag(t: string) {
        setTags((prev) => prev.filter((x) => x !== t));
    }

    function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.nativeEvent.isComposing) return; // 한글 IME 조합 중이면 무시 (마지막 글자 중복 방지)
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(tagInput);
        } else if (e.key === "Backspace" && tagInput === "" && tags.length) {
            removeTag(tags[tags.length - 1]);
        }
    }

    const editor = useEditor({
        immediatelyRender: false, // Next.js SSR — avoid hydration mismatch
        extensions: [
            StarterKit.configure({heading: {levels: [2, 3]}}),
            Placeholder.configure({placeholder: "여기에 본문을 작성하세요…"}),
            LinkExt.configure({openOnClick: false, HTMLAttributes: {rel: "noopener"}}),
            ImageExt.configure({inline: false}),
            // 공식 확장: 붙여넣기/드래그한 이미지 파일 → Supabase 업로드 후 src와 함께 삽입
            FileHandler.configure({
                allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"],
                onPaste: (currentEditor, files) => {
                    files.forEach(async (file) => {
                        const url = await uploadImage(file);
                        console.log(url)
                        if (url) currentEditor.chain().focus().setImage({src: url, alt: file.name}).run();
                    });
                },
                onDrop: (currentEditor, files, pos) => {
                    files.forEach(async (file) => {
                        const url = await uploadImage(file);
                        if (url) {
                            currentEditor.chain().insertContentAt(pos, {
                                type: "image",
                                attrs: {src: url, alt: file.name},
                            }).focus().run();
                        }
                    });
                },
            }),
        ],
        editorProps: {
            attributes: {class: "rich min-h-[420px]"},
        },
        content: "",
    });

    // Live table of contents — derive H2 headings from the editor, like the detail page
    const headings: { text: string; pos: number }[] = [];
    if (editor) {
        editor.state.doc.descendants((node, pos) => {
            if (node.type.name === "heading" && node.attrs.level === 2) {
                headings.push({text: node.textContent, pos});
            }
        });
    }

    function jumpTo(pos: number) {
        if (!editor) return;
        editor.chain().focus().setTextSelection(pos + 1).run();
        const found = editor.view.domAtPos(pos + 1).node;
        const el = found.nodeType === 1 ? (found as HTMLElement) : found.parentElement;
        el?.scrollIntoView({behavior: "smooth", block: "center"});
    }

    // --- Edit mode: load the existing post and hydrate the form ---
    const {data: existing, isPending: loadingPost} = useQuery({
        queryKey: ["post", editId],
        queryFn: () => getPost(editId!),
        enabled: isEdit,
    });

    const [hydrated, setHydrated] = useState(false);
    useEffect(() => {
        if (!existing || !editor || hydrated) return;
        setTitle(existing.title);
        setExcerpt(existing.excerpt ?? "");
        setCat(existing.category);
        setTags(existing.tags ?? []);
        setThumbnail(existing.thumbnail ?? null);
        setStatus(existing.status);
        editor.commands.setContent((existing.content as object) ?? {});
        setHydrated(true);
    }, [existing, editor, hydrated]);

    const qc = useQueryClient();
    const [pendingKind, setPendingKind] = useState<"DRAFT" | "PUBLISHED" | null>(null);
    const [lit, setLit] = useState(false); // brief glow on the status pill after a save

    const save = useMutation({
        mutationFn: (next: "DRAFT" | "PUBLISHED") => {
            const payload = {
                title,
                excerpt,
                category: cat,
                tags,
                thumbnail,
                status: next,
                // Tiptap JSON — round-trip to a plain object so it survives the Server Action
                // boundary (getJSON()'s attrs otherwise deserialize as functions on the server).
                content: JSON.parse(JSON.stringify(editor?.getJSON() ?? {})),
            };
            return isEdit ? updatePost(editId!, payload) : createPost(payload);
        },
        onMutate: (next) => {
            setPendingKind(next);
            setStatus(next);
        },
        onSuccess: (data, next) => {
            setSaved(
                isEdit ? "수정되었습니다." : next === "PUBLISHED" ? "발행되었습니다." : "임시저장되었습니다.",
            );
            setLit(true);
            setTimeout(() => setLit(false), 1400); // pill glows briefly to confirm the save
            qc.invalidateQueries({queryKey: ["posts"]});
            if (isEdit) qc.invalidateQueries({queryKey: ["post", editId]});

            if (next === "PUBLISHED") {
                // 발행하면 공개 글로 이동. replace로 편집 화면을 히스토리에서 치워 뒤로가기 방지.
                router.replace(data?.slug ? `/blog/${data.slug}` : "/blog");
            } else {
                setTimeout(() => setSaved(null), 2200);
            }
        },
        onError: (err) => {
            setSaved(`저장 실패: ${(err as Error).message}`);
            setTimeout(() => setSaved(null), 3200);
        },
        onSettled: () => setPendingKind(null),
    });
    const saving = save.isPending;

    return (
        <div className="pt-28 sm:pt-32">
            {/* ---- Action bar --------------------------------------- */}
            <Section>
                <div className="mx-auto flex max-w-[980px] flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Eyebrow>{isEdit ? "글 수정" : "글 작성"}</Eyebrow>
                        <StatusPill status={status} lit={lit}/>
                        {isEdit && loadingPost && <Spinner size={20}/>}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPreview((v) => !v)}
                            className="rounded-[20px] border-[1.5px] border-ink bg-white px-5 py-2 text-[15px] font-medium tracking-[-0.02em] transition-transform active:scale-95"
                        >
                            {preview ? "편집으로" : "미리보기"}
                        </button>
                        <button
                            onClick={() => save.mutate("DRAFT")}
                            disabled={saving}
                            className="inline-flex min-w-[92px] items-center justify-center rounded-[20px] border-[1.5px] border-ink bg-white px-5 py-2 text-[15px] font-medium tracking-[-0.02em] transition-transform active:scale-95 disabled:opacity-60"
                        >
                            {pendingKind === "DRAFT" ? <Spinner size={20}/> : "임시저장"}
                        </button>
                        <button
                            onClick={() => save.mutate("PUBLISHED")}
                            disabled={saving}
                            className="inline-flex min-w-[92px] items-center justify-center gap-2 rounded-[20px] border-[1.5px] border-ink bg-ink px-5 py-2 text-[15px] font-medium tracking-[-0.02em] text-cream transition-transform active:scale-95 disabled:opacity-60"
                        >
                            {pendingKind === "PUBLISHED" ? <Spinner size={20}/> : <>{isEdit ? "수정 발행" : "발행"} <Arrow className="h-4 w-4"/></>}
                        </button>
                    </div>
                </div>
            </Section>

            {/* ---- Editor / Preview --------------------------------- */}
            {preview ? (
                <PreviewArticle
                    title={title}
                    excerpt={excerpt}
                    cat={cat}
                    tags={tags}
                    html={editor?.getHTML() ?? ""}
                />
            ) : (
                <Section className="mt-8">
                    <div className="mx-auto grid max-w-[980px] grid-cols-1 gap-12 lg:grid-cols-[1fr_200px]">
                        {/* Left — the composer */}
                        <div className="min-w-0">
                            {/* Category */}
                            <div className="flex flex-wrap gap-2">
                                {CATS.map((c) => (
                                    <button key={c} onClick={() => setCat(c)}>
                    <span
                        className={`inline-flex items-center rounded-pill px-5 py-2 text-[14px] font-medium transition-colors ${
                            cat === c
                                ? "bg-ink text-cream"
                                : "bg-white text-ink border border-ink/15 hover:border-ink/40"
                        }`}
                    >
                      {c}
                    </span>
                                    </button>
                                ))}
                            </div>

                            {/* Title */}
                            <textarea
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                rows={1}
                                placeholder="제목을 입력하세요"
                                className="display mt-6 w-full resize-none bg-transparent text-[34px] leading-[1.1] text-ink outline-none placeholder:text-dust sm:text-[48px]"
                            />

                            {/* Excerpt */}
                            <input
                                value={excerpt}
                                onChange={(e) => setExcerpt(e.target.value)}
                                placeholder="요약을 입력하세요 (목록·검색·SEO용)"
                                className="mt-4 w-full border-b border-ink/15 bg-transparent pb-3 text-[18px] leading-[1.5] text-slate outline-none placeholder:text-dust focus:border-ink/40"
                            />

                            {/* Tags */}
                            <div
                                className="mt-4 flex flex-wrap items-center gap-2 border-b border-ink/15 pb-3 focus-within:border-ink/40">
                                {tags.map((t) => (
                                    <button
                                        type="button"
                                        onClick={() => removeTag(t)}
                                        aria-label={`${t} 태그 삭제`}
                                        key={t}
                                        className=" group inline-flex items-center gap-1.5 rounded-pill bg-white px-3 py-1.5 text-[13px] text-ink ring-1 ring-ink/10"
                                    >
                                        #{t}
                                        <p
                                            className="text-slate  transition-colors group-hover:text-signal"
                                        >
                                            ×
                                        </p>
                                    </button>
                                ))}
                                <input
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={onTagKeyDown}
                                    onBlur={() => addTag(tagInput)}
                                    placeholder={tags.length ? "태그 추가" : "태그를 입력하고 Enter (예: 그림책)"}
                                    className="min-w-[140px] flex-1 bg-transparent py-1 text-[15px] text-ink outline-none placeholder:text-dust"
                                />
                            </div>

                            {/* Thumbnail (cover) */}
                            <div className="mt-6">
                                <ThumbnailField value={thumbnail} onChange={setThumbnail}/>
                            </div>

                            <div className="mt-6 text-[14px] text-slate">
                                <span>{TODAY}</span>
                            </div>

                            {/* Toolbar */}
                            <Toolbar editor={editor}/>

                            {/* Editor surface */}
                            <div className="mt-4 rounded-[24px] bg-lifted p-6 shadow-card sm:p-8">
                                <EditorContent editor={editor}/>
                            </div>
                        </div>

                        {/* Right — live TOC, mirrors the detail page */}
                        <aside className="order-first lg:order-none">
                            <div className="lg:sticky lg:top-32">
                                <p className="text-[13px] font-bold uppercase tracking-[0.04em] text-slate">목차</p>
                                {headings.length > 0 ? (
                                    <ul className="mt-4 space-y-2.5 border-l border-ink/15 pl-4">
                                        {headings.map((h, i) => (
                                            <li key={i}>
                                                <button
                                                    type="button"
                                                    onClick={() => jumpTo(h.pos)}
                                                    className="text-left text-[14px] text-slate transition-colors hover:text-ink"
                                                >
                                                    {h.text || "제목 없음"}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="mt-4 border-l border-ink/15 pl-4 text-[13px] leading-[1.5] text-dust">
                                        H2 제목을 추가하면
                                        <br/>
                                        여기에 목차가 표시됩니다.
                                    </p>
                                )}
                            </div>
                        </aside>
                    </div>
                </Section>
            )}

            {/* Toast */}
            {saved && (
                <div
                    className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-pill bg-ink px-6 py-3 text-[15px] font-medium text-cream shadow-card">
                    {saved}
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Toolbar                                                           */

/* ------------------------------------------------------------------ */
function Toolbar({editor}: { editor: Editor | null }) {
    const [uploading, setUploading] = useState(false);
    if (!editor) return null;

    const groups: { label: string; onClick: () => void; active?: boolean }[][] = [
        [
            {label: "B", onClick: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold")},
            {label: "I", onClick: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic")},
            {label: "S", onClick: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike")},
        ],
        [
            {
                label: "H2",
                onClick: () => editor.chain().focus().toggleHeading({level: 2}).run(),
                active: editor.isActive("heading", {level: 2})
            },
            {
                label: "H3",
                onClick: () => editor.chain().focus().toggleHeading({level: 3}).run(),
                active: editor.isActive("heading", {level: 3})
            },
        ],
        [
            {
                label: "• 목록",
                onClick: () => editor.chain().focus().toggleBulletList().run(),
                active: editor.isActive("bulletList")
            },
            {
                label: "1. 목록",
                onClick: () => editor.chain().focus().toggleOrderedList().run(),
                active: editor.isActive("orderedList")
            },
            {
                label: "❝ 인용",
                onClick: () => editor.chain().focus().toggleBlockquote().run(),
                active: editor.isActive("blockquote")
            },
            {
                label: "‹/›",
                onClick: () => editor.chain().focus().toggleCodeBlock().run(),
                active: editor.isActive("codeBlock")
            },
        ],
        [
            {
                label: "링크",
                onClick: () => {
                    const prev = editor.getAttributes("link").href as string | undefined;
                    const url = window.prompt("링크 URL", prev ?? "https://");
                    if (url === null) return;
                    if (url === "") {
                        editor.chain().focus().extendMarkRange("link").unsetLink().run();
                        return;
                    }
                    editor.chain().focus().extendMarkRange("link").setLink({href: url}).run();
                },
                active: editor.isActive("link"),
            },
        ],
    ];

    async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = ""; // allow re-selecting the same file
        if (!file || !editor) return;
        setUploading(true);
        try {
            const url = await uploadImage(file);
            if (!url) {
                alert("이미지 URL을 받지 못했습니다. 다시 시도해 주세요.");
                return;
            }
            editor.chain().focus().setImage({src: url, alt: file.name}).run();
        } catch (err) {
            alert(`이미지 업로드 실패: ${(err as Error).message}`);
        } finally {
            setUploading(false);
        }
    }

    return (
        <div
            className="sticky top-24 z-10 mt-8 flex flex-wrap items-center gap-1.5 rounded-pill border border-ink/10 bg-white/90 px-2.5 py-2 shadow-pill backdrop-blur-md">
            {groups.map((g, gi) => (
                <div key={gi} className="flex items-center gap-1">
                    {gi > 0 && <span className="mx-1 h-4 w-px bg-ink/10"/>}
                    {g.map((b) => (
                        <button
                            key={b.label}
                            type="button"
                            onClick={b.onClick}
                            className={`rounded-pill px-3 py-1.5 text-[14px] font-medium transition-colors ${
                                b.active ? "bg-ink text-cream" : "text-ink hover:bg-cream"
                            }`}
                        >
                            {b.label}
                        </button>
                    ))}
                </div>
            ))}
            <span className="mx-1 h-4 w-px bg-ink/10"/>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-pill px-3 py-1.5 text-[14px] font-medium text-ink transition-colors hover:bg-cream">
                {uploading ? <Spinner size={16}/> : "이미지"}
                <input
                    type="file"
                    accept="image/*"
                    onChange={onPickImage}
                    disabled={uploading}
                    className="hidden"
                />
            </label>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Preview — mirrors /blog/[slug] exactly                            */

/* ------------------------------------------------------------------ */
function PreviewArticle({
                            title,
                            excerpt,
                            cat,
                            tags,
                            html,
                        }: {
    title: string;
    excerpt: string;
    cat: string;
    tags: string[];
    html: string;
}) {
    // Inject ids into H2s and build a TOC — so preview matches /blog/[slug] exactly
    const {bodyHtml, toc} = useMemo(() => {
        if (typeof window === "undefined" || !html) {
            return {bodyHtml: html || "<p>본문 미리보기가 여기에 표시됩니다.</p>", toc: [] as { id: string; text: string }[]};
        }
        const doc = new DOMParser().parseFromString(html, "text/html");
        const items: { id: string; text: string }[] = [];
        doc.querySelectorAll("h2").forEach((h, i) => {
            const id = `sec-${i}`;
            h.id = id;
            items.push({id, text: h.textContent || "제목 없음"});
        });
        return {bodyHtml: doc.body.innerHTML, toc: items};
    }, [html]);

    return (
        <article className="mt-8">
            <Section>
                <div className="mx-auto max-w-[980px]">
                    <Chip>{cat}</Chip>
                    <h1 className="display mt-5 text-[34px] leading-[1.1] text-ink sm:text-[48px]">
                        {title || "제목을 입력하세요"}
                    </h1>
                    {excerpt && (
                        <p className="mt-5 text-[19px] leading-[1.6] text-slate">{excerpt}</p>
                    )}
                    <div className="mt-6 text-[14px] text-slate">
                        <span>{TODAY}</span>
                    </div>
                </div>
            </Section>

            <Section className="mt-10">
                <div
                    className="mx-auto aspect-[16/8] w-full max-w-[980px] rounded-stadium shadow-card"
                    style={{background: `radial-gradient(circle at 35% 30%, ${TONE.a}, ${TONE.b})`}}
                />
            </Section>

            <Section className="mt-14">
                <div className="mx-auto grid max-w-[980px] grid-cols-1 gap-12 lg:grid-cols-[1fr_200px]">
                    <div className="min-w-0">
                        <div className="rich" dangerouslySetInnerHTML={{__html: bodyHtml}}/>
                        {tags.length > 0 && (
                            <div className="mt-10 flex flex-wrap gap-2">
                                {tags.map((t) => (
                                    <span
                                        key={t}
                                        className="rounded-pill bg-white px-4 py-1.5 text-[13px] text-slate ring-1 ring-ink/10"
                                    >
                    #{t}
                  </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <aside className="order-first lg:order-none">
                        <div className="lg:sticky lg:top-32">
                            <p className="text-[13px] font-bold uppercase tracking-[0.04em] text-slate">목차</p>
                            {toc.length > 0 ? (
                                <ul className="mt-4 space-y-2.5 border-l border-ink/15 pl-4">
                                    {toc.map((t) => (
                                        <li key={t.id}>
                                            <a href={`#${t.id}`} className="text-[14px] text-slate hover:text-ink">
                                                {t.text}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-4 border-l border-ink/15 pl-4 text-[13px] leading-[1.5] text-dust">
                                    H2 제목을 추가하면
                                    <br/>
                                    여기에 목차가 표시됩니다.
                                </p>
                            )}
                        </div>
                    </aside>
                </div>
            </Section>
        </article>
    );
}

function StatusPill({status, lit = false}: { status: "DRAFT" | "PUBLISHED"; lit?: boolean }) {
    const draft = status === "DRAFT";
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-[12px] font-bold uppercase tracking-[0.04em] transition-all duration-300 ${
                lit
                    ? "bg-signal text-white shadow-[0_0_0_4px_rgba(207,69,0,0.18)]"
                    : draft
                        ? "bg-bone text-slate"
                        : "bg-signal/10 text-signal"
            }`}
        >
      <span
          className={`h-1.5 w-1.5 rounded-full transition-colors ${
              lit ? "animate-pulse bg-white" : draft ? "bg-slate" : "bg-signal"
          }`}
      />
            {draft ? "임시저장" : "발행됨"}
    </span>
    );
}
