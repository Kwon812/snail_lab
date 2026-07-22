import { Spinner } from "../../_components/spinner";

/** Shown while a blog post is being generated/loaded — the snail shell spins. */
export default function Loading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
      <Spinner size={64} />
      <p className="text-[14px] text-slate">불러오는 중…</p>
    </div>
  );
}
