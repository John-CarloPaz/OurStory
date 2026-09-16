import Link from "next/link";
import { APP_NAME } from "@/lib/env";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="os-display mb-8 block text-center text-2xl text-ink">
          {APP_NAME} <span className="text-accent">♡</span>
        </Link>
        {children}
      </div>
    </main>
  );
}
