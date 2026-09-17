import { AuthBackdrop, BrandMark } from "@/components/decor/scene";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-x-clip px-4 py-10 sm:py-16">
      <div className="w-full max-w-md">
        <BrandMark href="/" className="mx-auto mb-9 text-2xl" />
        <div className="relative">
          <AuthBackdrop />
          <div className="relative z-10">{children}</div>
        </div>
        <p aria-hidden className="os-hand mt-8 text-center text-xl text-muted">
          a private place for two ♡
        </p>
      </div>
    </main>
  );
}
