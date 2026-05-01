import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Shift swap</h1>
      <p className="text-zinc-600">
        Corporate shift tickets: agents post hours to give, others claim, leaders or operations approve. Central Canada
        time · 15-minute slots.
      </p>
      <div className="flex gap-3 text-sm">
        <Link className="rounded bg-zinc-900 px-4 py-2 text-white" href="/login">
          Sign in
        </Link>
        <Link className="rounded border border-zinc-300 px-4 py-2" href="/register">
          Register
        </Link>
        <Link className="rounded border border-zinc-300 px-4 py-2" href="/dashboard">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
