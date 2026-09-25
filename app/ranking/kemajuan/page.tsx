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
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-emerald-400/20 bg-slate-800 sm:h-14 sm:w-14">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="text-2xl sm:text-3xl">👤</span>
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
    <div className="min-w-0 rounded-2xl border border-white/10 bg-slate-900 p-3 transition hover:border-emerald-400/30 sm:p-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* RANKING */}

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 text-lg font-black text-emerald-400 sm:h-11 sm:w-11 sm:text-2xl">
          {item.position}
        </span>

        {/* PHOTO */}

        <ParticipantPhoto
          photoUrl={item.photo_url}
          name={item.participant_name}
        />

        {/* NAME + SCHOOL */}

        <div className="min-w-0 flex-1">
          <h2 className="break-words text-sm font-bold sm:text-base">
            {item.participant_name}
          </h2>

          <p className="break-words text-xs text-slate-500 sm:text-sm">
            {item.school_name}
          </p>
        </div>

        {/* LEVEL BADGE */}

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <div className="flex flex-col items-center">
            <img
              src={badge}
              alt={`${level} Badge`}
              className="h-8 w-8 object-contain drop-shadow-xl sm:h-11 sm:w-11"
              loading="lazy"
              decoding="async"
            />

            <span className="mt-0.5 text-[7px] font-bold tracking-wide text-yellow-400 sm:mt-1 sm:text-[9px]">
              {level}
            </span>
          </div>

          {/* PAGE */}

          <p className="whitespace-nowrap text-xs font-black text-emerald-400 sm:text-sm">
            {item.current_page}
            <span className="text-[8px] font-normal text-slate-500 sm:text-[10px]">
              /604
            </span>
          </p>
        </div>
      </div>

      {/* PROGRESS BAR */}

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800 sm:mt-3">
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
      <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-6 md:p-10">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/ranking"
            className="text-sm font-bold text-yellow-400 hover:text-yellow-300"
          >
            ← Kembali ke Ranking
          </Link>

          <h1 className="mt-8 text-2xl font-black text-red-400 sm:text-3xl">
            Ralat mendapatkan ranking
          </h1>

          <p className="mt-4 break-words text-sm text-slate-300 sm:text-base">
            {error}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* HEADER */}

      <header className="border-b border-white/10 bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <Link
            href="/ranking"
            className="inline-flex items-center text-sm font-bold text-yellow-400 transition hover:text-yellow-300"
          >
            ← Kembali ke Ranking
          </Link>

          <div className="mt-6 text-center sm:mt-8">
            <div className="text-4xl sm:text-5xl">📖</div>

            <h1 className="mt-3 text-2xl font-black sm:text-4xl">
              KEMAJUAN{" "}
              <span className="text-yellow-400">
                KESELURUHAN
              </span>
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
              Ranking penuh peserta berdasarkan jumlah muka
              surat yang telah dibaca.
            </p>

            <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-2 sm:px-4">
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500 sm:h-2.5 sm:w-2.5" />

              <span className="text-xs font-semibold text-red-400 sm:text-sm">
                LIVE · Dikemas kini setiap 15 saat
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {participants.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {participants.map((item) => (
              <RankingCard
                key={`${item.position}-${item.participant_name}`}
                item={item}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 text-center text-sm text-slate-400 sm:rounded-3xl sm:p-10 sm:text-base">
            Semua peserta aktif telah mencapai 604/604 atau
            belum ada peserta.
          </div>
        )}
      </section>

      {/* FOOTER */}

      <footer className="border-t border-white/10 bg-slate-900">
        <p className="px-4 py-6 text-center text-xs text-slate-600">
          © 2026 QURAN RANKING LIVE · PROGRAM KHATAM MURID PPD MACHANG
        </p>
      </footer>
    </main>
  );
}