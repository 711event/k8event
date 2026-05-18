import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="max-w-xl w-full space-y-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">k8event</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          World Cup token-guessing platform with built-in live chat.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-background font-medium transition-colors hover:opacity-90"
          >
            Player login
          </Link>
          <Link
            href="/chat"
            className="inline-flex h-11 items-center justify-center rounded-full border border-foreground/15 px-6 font-medium transition-colors hover:bg-foreground/5"
          >
            Need help? Chat with us
          </Link>
        </div>
      </div>
    </main>
  );
}
