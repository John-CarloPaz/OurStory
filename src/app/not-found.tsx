import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <p className="os-eyebrow">Not found</p>
        <h1 className="os-display mt-3 text-4xl text-ink">This page isn&apos;t part of your story.</h1>
        <p className="mt-3 text-muted">It may have been deleted, or it belongs to a space you&apos;re not in.</p>
        <Link href="/home" className={buttonClass("primary", "md", "mt-8")}>
          Back home
        </Link>
      </div>
    </main>
  );
}
