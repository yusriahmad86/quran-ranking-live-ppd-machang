"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type OverallProgress = {
  position: number;
  participant_name: string;
  photo_url: string | null;
  school_name: string;
  current_page: number;
};

function getLevel(page: number) {
  if (page >= 604) return "GRANDMASTER";
  if (page >= 401) return "HEROIC";
  if (page >= 301) return "DIAMOND";
  if (page >= 201) return "PLATINUM";
  if (page >= 101) return "GOLD";
  if (page >= 51) return "SILVER";

  return "BRONZE";
}

function getLevelBadge(page: number) {
  if (page >= 604) {
    return "/grandmaster-logo.png";
  }

  if (page >= 401) {
    return "/heroic-logo.png";
  }

  if (page >= 301) {
    return "/diamond-logo.png";
  }

  if (page >= 201) {
    return "/platinum-logo.png";
  }

  if (page >= 101) {
    return "/gold-logo.png";
  }

  if (page >= 51) {
    return "/silver-logo.png";
  }

  return "/bronze-logo.png";
}

function ParticipantPhoto({
  photoUrl,
  name,
}: {
  photoUrl: string | null;
  name: string;
}) {
  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-emerald-400/20 bg-slate-800">
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

function RankingCard({
  item,
}: {
  item: OverallProgress;
}) {
  const level = getLevel(item.current_page);
  const badge = getLevelBadge(item.current_page);

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 transition hover:border-emerald-400/30">
      <div className="flex items-center gap-4">
        {/* RANKING */}

        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 text-2xl font-black text-emerald-400">
          {item.position}
        </span>

        {/* PHOTO */}

        <ParticipantPhoto
          photoUrl={item.photo_url}
          name={item.participant_name}
        />

        {/* NAME + SCHOOL */}

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-black">
            {item.participant_name}
          </h2>

          <p className="mt-1 truncate text-sm text-slate-500">
            {item.school_name}
          </p>
        </div>

        {/* LEVEL */}

        <div className="hidden shrink-0 flex-col items-center sm:flex">
          <img
            src={badge}
            alt={`${level} Badge`}
            className="h-12 w-12 object-contain drop-shadow-xl"
            loading="lazy"
            decoding="async"
          />

          <span className="mt-1 text-[9px] font-bold tracking-wide text-yellow-400">
            {level}
          </span>
        </div>

        {/* PAGE */}

        <div className="shrink-0 text-right">
          <p className="text-2xl font-black text-emerald-400">
            {item.current_page}
          </p>

          <p className="text-xs text-slate-500">/604</p>
        </div>
      </div>

      {/* PROGRESS BAR */}

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{
            width: `${Math.min(
              100,
              (item.current_page / 604) * 100
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

export default function OverallProgressPage() {
  const [participants, setParticipants] = useState<
    OverallProgress[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRanking() {
    const { data, error: rpcError } = await supabase.rpc(
      "get_overall_progress",
      {
        p_limit: null,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    setParticipants(
      (data ?? []) as OverallProgress[]
    );

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
        Memuatkan kemajuan keseluruhan…
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/ranking"
            className="text-sm font-bold text-yellow-400 hover:text-yellow-300"
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
            className="inline-flex items-center text-sm font-bold text-yellow-400 transition hover:text-yellow-300"
          >
            ← Kembali ke Ranking
          </Link>

          <div className="mt-8 text-center">
            <div className="text-5xl">📖</div>

            <h1 className="mt-3 text-4xl font-black">
              KEMAJUAN{" "}
              <span className="text-yellow-400">
                KESELURUHAN
              </span>
            </h1>

            <p className="mt-3 text-slate-400">
              Ranking penuh peserta berdasarkan jumlah muka
              surat yang telah dibaca.
            </p>

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
        {participants.length > 0 ? (
          <div className="space-y-4">
            {participants.map((item) => (
              <RankingCard
                key={`${item.position}-${item.participant_name}`}
                item={item}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
            Semua peserta aktif telah mencapai 604/604 atau
            belum ada peserta.
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