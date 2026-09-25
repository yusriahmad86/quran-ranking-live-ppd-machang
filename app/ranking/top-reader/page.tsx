"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type TopReader = {
  position: number;
  participant_name: string;
  photo_url: string | null;
  school_name: string;
  pages_today: number;
};

function formatDate(date: string) {
  return new Date(`${date}T00:00:00+08:00`).toLocaleDateString(
    "ms-MY",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function ParticipantPhoto({
  photoUrl,
  name,
}: {
  photoUrl: string | null;
  name: string;
}) {
  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-emerald-400/20 bg-slate-800">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="text-4xl">👤</span>
      )}
    </div>
  );
}

export default function TopReaderPage() {
  const [readers, setReaders] = useState<TopReader[]>([]);
  const [rankingDate, setRankingDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRanking() {
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kuala_Lumpur",
    }).format(new Date());

    const { data, error: rpcError } = await supabase.rpc(
      "get_top_readers",
      {
        p_date: date,
        p_limit: null,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    setReaders((data ?? []) as TopReader[]);
    setRankingDate(date);
    setError("");
    setLoading(false);
  }

  useEffect(() => {
    void loadRanking();

    const interval = window.setInterval(() => {
      void loadRanking();
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Memuatkan ranking Top Reader…
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/ranking"
            className="text-sm font-bold text-emerald-400 hover:text-emerald-300"
          >
            ← Kembali ke Ranking
          </Link>

          <h1 className="mt-8 text-3xl font-black text-red-400">
            Ralat mendapatkan ranking
          </h1>

          <p className="mt-4 text-slate-300">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* HEADER */}

      <header className="border-b border-white/10 bg-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <Link
            href="/ranking"
            className="inline-flex items-center text-sm font-bold text-emerald-400 transition hover:text-emerald-300"
          >
            ← Kembali ke Ranking
          </Link>

          <div className="mt-8 text-center">
            <div className="text-5xl">🔥</div>

            <h1 className="mt-3 text-4xl font-black">
              TOP READER{" "}
              <span className="text-emerald-400">HARI INI</span>
            </h1>

            <p className="mt-3 text-slate-400">
              Ranking penuh peserta berdasarkan jumlah muka surat
              yang dibaca hari ini.
            </p>

            {rankingDate && (
              <p className="mt-4 text-sm text-slate-500">
                📅 {formatDate(rankingDate)}
              </p>
            )}

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />

              <span className="text-sm font-semibold text-red-400">
                LIVE · Dikemas kini setiap 15 saat
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-6xl px-6 py-10">
        {readers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {readers.map((item) => (
              <div
                key={`${item.position}-${item.participant_name}`}
                className="rounded-3xl border border-white/10 bg-slate-900 p-6 transition hover:border-emerald-400/30"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* RANKING */}

                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 text-2xl font-black text-emerald-400">
                    {item.position}
                  </span>

                  {/* PHOTO */}

                  <ParticipantPhoto
                    photoUrl={item.photo_url}
                    name={item.participant_name}
                  />

                  {/* PAGES */}

                  <div className="text-right">
                    <p className="text-3xl font-black text-emerald-400">
                      {item.pages_today}
                    </p>

                    <p className="text-xs text-slate-500">
                      muka surat
                    </p>
                  </div>
                </div>

                {/* NAME */}

                <h2 className="mt-6 text-xl font-black">
                  {item.participant_name}
                </h2>

                {/* SCHOOL */}

                <p className="mt-1 text-sm text-slate-400">
                  {item.school_name}
                </p>

                {/* PROGRESS INDICATOR */}

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (item.pages_today / 604) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
            Belum ada bacaan direkodkan hari ini.
          </div>
        )}
      </section>

      {/* FOOTER */}

      <footer className="border-t border-white/10 bg-slate-900">
        <p className="py-6 text-center text-xs text-slate-600">
          © 2026 QURAN RANKING LIVE · PROGRAM KHATAM MURID PPD MACHANG
        </p>
      </footer>
    </main>
  );
}