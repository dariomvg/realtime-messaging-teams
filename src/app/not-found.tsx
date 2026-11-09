import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-16 text-foreground sm:px-8">
      {/* Background details */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:56px_56px] opacity-35 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_75%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--muted)_0%,transparent_68%)] opacity-80"
      />

      <section className="relative flex w-full max-w-5xl flex-col items-center text-center">
        <div className="mb-8 inline-flex items-center gap-2 border border-border bg-background/80 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground shadow-sm backdrop-blur sm:mb-10 sm:text-xs">
          <span className="h-1.5 w-1.5 bg-primary" aria-hidden="true" />
          Error 404 <span className="text-border">/</span> Page not found
        </div>

        <div className="relative w-full select-none" aria-hidden="true">
          <span className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border sm:h-48 sm:w-48" />
          <span className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/70 sm:h-72 sm:w-72" />
          <h1 className="bg-gradient-to-b from-foreground via-foreground/80 to-muted-foreground/25 bg-clip-text py-2 font-mono text-[clamp(7.5rem,27vw,22rem)] font-black leading-[0.78] tracking-[-0.12em] text-transparent">
            404<span className="text-primary">.</span>
          </h1>
          <span className="absolute -right-1 top-[10%] hidden border border-border bg-background px-3 py-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground md:block">
            LOST IN SPACE
          </span>
          <span className="absolute -left-1 bottom-[5%] hidden font-mono text-[10px] tracking-[0.18em] text-muted-foreground md:block">
            COORD: NOT FOUND
          </span>
        </div>

        <div className="mt-8 max-w-xl sm:mt-10">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground sm:text-sm">
            Looks like you've gone off course
          </p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            This page doesn't exist.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground sm:text-base">
            The link may be broken or the page may have been moved. Let's get you back somewhere familiar.
          </p>
        </div>

        <Link
          href="/"
          className="group mt-8 inline-flex min-h-12 items-center justify-center gap-3 bg-primary px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:mt-10 sm:px-7 sm:text-sm"
        >
          Back to home
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
          >
            <path
              d="M3.5 10h12m-5-5 5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          </svg>
        </Link>

        <div className="mt-14 flex w-full max-w-xs items-center gap-3 sm:mt-16" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            End of route
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
      </section>
    </main>
  );
}