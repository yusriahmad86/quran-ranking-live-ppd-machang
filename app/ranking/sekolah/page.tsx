"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type SchoolRanking = {
  position: number;
  school_name: string;
  participant_count: number;
  average_pages: number;
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

export default function SchoolRankingPage() {
  const [schools, setSchools] = useState<SchoolRanking[]>([]);
  const [rankingDate, setRankingDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRanking() {
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kuala_Lumpur",
    }).format(new Date());

    const { data, error: rpcError } = await supabase.rpc(
      "get_school_rankings",
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

    setSchools((data ?? []) as SchoolRanking[]);
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
        Memuatkan ranking sekolah…
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/ranking"
            className="text-sm font-bold text-blue-400 hover:text-blue-300"
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
            className="inline-flex items-center text-sm font-bold text-blue-400 transition hover:text-blue-300"
          >
            ← Kembali ke Ranking
          </Link>

          <div className="mt-8 text-center">
            <div className="text-5xl">🏫</div>

            <h1 className="mt-3 text-4xl font-black">
              RANKING PURATA{" "}
              <span className="text-blue-400">SEKOLAH</span>
            </h1>

            <p className="mt-3 text-slate-400">
              Ranking penuh sekolah berdasarkan purata bacaan harian
              setiap peserta aktif.
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
        {schools.length > 0 ? (
          <div className="space-y-4">
            {schools.map((school) => (
              <div
                key={`${school.position}-${school.school_name}`}
                className="rounded-3xl border border-white/10 bg-slate-900 p-5 transition hover:border-blue-400/30 md:p-6"
              >
                <div className="flex items-center gap-4">
                  {/* RANKING */}

                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 text-2xl font-black text-blue-400">
                    {school.position}
                  </span>

                  {/* SCHOOL */}

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-black md:text-xl">
                      {school.school_name}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {school.participant_count} peserta aktif
                    </p>
                  </div>

                  {/* AVERAGE */}

                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-black text-blue-400 md:text-3xl">
                      {school.average_pages.toFixed(1)}
                    </p>

                    <p className="text-[10px] text-slate-500 md:text-xs">
                      muka surat / peserta
                    </p>
                  </div>
                </div>

                {/* PROGRESS */}

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (school.average_pages / 604) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
            Belum ada peserta aktif berdaftar.
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