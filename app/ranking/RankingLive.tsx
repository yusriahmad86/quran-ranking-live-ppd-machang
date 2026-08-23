"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Student = {
  id: string;
  name: string;
  photo_url: string | null;
  current_page: number | null;
  second_round_page: number | null;
};

// ==========================================
// LEVEL MURID
// ==========================================

function getLevel(page: number) {
  if (page >= 401) return "HEROIC";
  if (page >= 301) return "DIAMOND";
  if (page >= 201) return "PLATINUM";
  if (page >= 101) return "GOLD";
  if (page >= 51) return "SILVER";

  return "BRONZE";
}

// ==========================================
// ICON LEVEL
// ==========================================

function getIcon(level: string) {
  switch (level) {
    case "HEROIC":
      return "⚔️";

    case "DIAMOND":
      return "💎";

    case "PLATINUM":
      return "💠";

    case "GOLD":
      return "🥇";

    case "SILVER":
      return "🥈";

    default:
      return "🥉";
  }
}

// ==========================================
// COMPONENT
// ==========================================

export default function RankingLive({
  initialStudents,
}: {
  initialStudents: Student[];
}) {
  const [students, setStudents] =
    useState<Student[]>(initialStudents);

  const [isLive, setIsLive] =
    useState(false);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  // ==========================================
  // AMBIL DATA TERKINI
  // ==========================================

  async function refreshRanking() {
    const { data, error } = await supabase
      .from("students")
      .select(`
        id,
        name,
        photo_url,
        current_page,
        second_round_page
      `);

    if (error) {
      console.error(
        "Ralat mendapatkan ranking:",
        error.message
      );

      return;
    }

    setStudents(data ?? []);
    setLastUpdated(new Date());
  }

  // ==========================================
  // SUPABASE REALTIME
  // ==========================================

  useEffect(() => {
    refreshRanking();

    const channel = supabase
      .channel("quran-ranking-live")

      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "students",
        },
        () => {
          refreshRanking();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "students",
        },
        () => {
          refreshRanking();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "students",
        },
        () => {
          refreshRanking();
        }
      )

      .subscribe((status) => {
        console.log(
          "Quran Ranking Realtime:",
          status
        );

        setIsLive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ==========================================
  // MURID BELUM KHATAM
  // ==========================================

  const activeStudents = students
    .filter(
      (student) =>
        (student.current_page ?? 0) < 604
    )
    .sort(
      (a, b) =>
        (b.current_page ?? 0) -
        (a.current_page ?? 0)
    );

  // ==========================================
  // GRANDMASTER ROUND 2
  // ==========================================

  const completedStudents = students
    .filter(
      (student) =>
        (student.current_page ?? 0) === 604
    )
    .sort(
      (a, b) =>
        (b.second_round_page ?? 0) -
        (a.second_round_page ?? 0)
    );

  return (
    <div className="space-y-10">

      {/* STATUS LIVE */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

        <div className="flex items-center gap-2">

          <span
            className={`w-3 h-3 rounded-full ${
              isLive
                ? "bg-emerald-400 animate-pulse"
                : "bg-red-400"
            }`}
          />

          <span
            className={`text-sm font-bold ${
              isLive
                ? "text-emerald-400"
                : "text-red-400"
            }`}
          >
            {isLive ? "LIVE" : "OFFLINE"}
          </span>

        </div>

        {lastUpdated && (
          <span className="text-xs text-slate-500">
            Dikemas kini{" "}
            {lastUpdated.toLocaleTimeString("ms-MY")}
          </span>
        )}

      </div>

      {/* ====================================== */}
      {/* RANKING MURID BELUM KHATAM */}
      {/* ====================================== */}

      <section>

        <div className="mb-6">

          <div className="flex items-center gap-3">

            <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-3xl">
              🏆
            </div>

            <div>

              <h2 className="text-2xl md:text-3xl font-black">
                QURAN RANKING LIVE
              </h2>

              <p className="text-sm text-slate-400 mt-1">
                Kedudukan bacaan murid secara langsung
              </p>

            </div>

          </div>

        </div>

        <div className="space-y-4">

          {activeStudents.map(
            (student, index) => {

              const page =
                student.current_page ?? 0;

              const level =
                getLevel(page);

              const icon =
                getIcon(level);

              const progress = Math.min(
                100,
                Math.round(
                  (page / 604) * 100
                )
              );

              return (

                <div
                  key={student.id}
                  className={`
                    rounded-3xl
                    border
                    p-5
                    transition-all
                    duration-500
                    ${
                      index === 0
                        ? "border-yellow-400/30 bg-gradient-to-r from-yellow-500/10 to-slate-900"
                        : "border-white/10 bg-slate-900"
                    }
                  `}
                >

                  <div className="flex flex-col md:flex-row md:items-center gap-5">

                    {/* RANK */}

                    <div className="w-12 text-center flex-shrink-0">

                      <div
                        className={`
                          text-2xl
                          font-black
                          ${
                            index === 0
                              ? "text-yellow-400"
                              : index === 1
                              ? "text-slate-300"
                              : index === 2
                              ? "text-orange-400"
                              : "text-white"
                          }
                        `}
                      >
                        #{index + 1}
                      </div>

                      {index === 0 && (
                        <div className="text-xs text-yellow-400 mt-1">
                          TERATAS
                        </div>
                      )}

                    </div>

                    {/* FOTO */}

                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 flex-shrink-0">

                      {student.photo_url ? (
                        <img
                          src={student.photo_url}
                          alt={student.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          👤
                        </div>
                      )}

                    </div>

                    {/* NAMA + PROGRESS */}

                    <div className="flex-1 min-w-0">

                      <h2 className="font-bold text-lg leading-tight break-words">
                        {student.name}
                      </h2>

                      <p className="text-sm text-slate-400 mt-1">
                        Bacaan Al-Quran
                      </p>

                      <div className="mt-3">

                        <div className="flex justify-between text-xs text-slate-400 mb-1">

                          <span>
                            Kemajuan bacaan
                          </span>

                          <span className="font-semibold text-emerald-400">
                            {progress}%
                          </span>

                        </div>

                        <div className="h-3 rounded-full bg-slate-800 overflow-hidden">

                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                            style={{
                              width: `${progress}%`,
                            }}
                          />

                        </div>

                      </div>

                    </div>

                    {/* MUKA SURAT */}

                    <div className="text-right flex-shrink-0">

                      <div className="text-3xl font-black">
                        {page}
                      </div>

                      <div className="text-xs text-slate-500">
                        / 604
                      </div>

                    </div>

                    {/* LEVEL */}

                    <div className="w-36 text-center flex-shrink-0">

                      <div className="text-2xl">
                        {icon}
                      </div>

                      <div className="font-bold text-sm mt-1">
                        {level}
                      </div>

                    </div>

                  </div>

                </div>

              );
            }
          )}

        </div>

        {activeStudents.length === 0 && (

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-12 text-center">

            <div className="text-5xl mb-4">
              🎉
            </div>

            <h3 className="text-xl font-bold">
              Semua murid telah tamat!
            </h3>

            <p className="text-slate-400 mt-2">
              Tahniah kepada semua murid.
            </p>

          </div>

        )}

      </section>

      {/* ====================================== */}
      {/* GRANDMASTER ROUND 2 */}
      {/* ====================================== */}

      {completedStudents.length > 0 && (

        <section>

          {/* HEADER GRANDMASTER */}

          <div className="relative overflow-hidden rounded-3xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 via-slate-900 to-yellow-500/10 p-6 md:p-8">

            <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-yellow-500/10 blur-3xl" />

            <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-yellow-500/5 blur-3xl" />

            <div className="relative flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">

              <div className="w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-slate-950 border border-yellow-500/30 p-2 flex-shrink-0 shadow-xl">

                <img
                  src="/grandmaster-logo.png"
                  alt="Grandmaster"
                  className="w-full h-full object-contain"
                />

              </div>

              <div>

                <p className="text-sm font-black text-yellow-400 tracking-wider">
                  👑 GRANDMASTER
                </p>

                <h2 className="text-2xl md:text-3xl font-black mt-1">
                  GRANDMASTER RANKING ROUND 2
                </h2>

                <p className="text-sm text-slate-400 mt-2">
                  Kedudukan murid yang telah tamat
                  Al-Quran dan meneruskan bacaan
                  pusingan kedua.
                </p>

                <div className="inline-flex items-center gap-2 mt-4 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-4 py-2">

                  <span className="text-yellow-400 font-bold">
                    🏆 ROUND 2
                  </span>

                  <span className="text-slate-500">
                    •
                  </span>

                  <span className="text-slate-300">
                    {completedStudents.length} murid
                  </span>

                </div>

              </div>

            </div>

          </div>

          {/* SENARAI GRANDMASTER */}

          <div className="space-y-5 mt-5">

            {completedStudents.map(
              (student, index) => {

                const secondRoundPage =
                  student.second_round_page ?? 0;

                const secondRoundProgress =
                  Math.min(
                    100,
                    Math.round(
                      (secondRoundPage / 604) * 100
                    )
                  );

                return (

                  <div
                    key={student.id}
                    className={`
                      relative
                      overflow-hidden
                      rounded-3xl
                      border
                      p-6
                      transition-all
                      duration-500
                      ${
                        index === 0
                          ? "border-yellow-400/50 bg-gradient-to-r from-yellow-500/20 via-slate-900 to-slate-900"
                          : "border-yellow-500/20 bg-slate-900"
                      }
                    `}
                  >

                    <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-yellow-500/10 blur-3xl" />

                    <div className="relative flex flex-col md:flex-row md:items-center gap-6">

                      {/* RANK */}

                      <div className="w-14 text-center flex-shrink-0">

                        <div
                          className={`
                            text-3xl
                            font-black
                            ${
                              index === 0
                                ? "text-yellow-400"
                                : index === 1
                                ? "text-slate-300"
                                : index === 2
                                ? "text-orange-400"
                                : "text-white"
                            }
                          `}
                        >
                          #{index + 1}
                        </div>

                        {index === 0 && (

                          <div className="text-xs text-yellow-400 mt-1 font-bold">
                            TERATAS
                          </div>

                        )}

                      </div>

                      {/* FOTO + LOGO GRANDMASTER ASAL */}

                      <div className="relative w-24 h-24 flex-shrink-0">

                        {/* FOTO MURID */}

                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-800 border border-yellow-500/30">

                          {student.photo_url ? (

                            <img
                              src={student.photo_url}
                              alt={student.name}
                              className="w-full h-full object-cover"
                            />

                          ) : (

                            <div className="w-full h-full flex items-center justify-center text-3xl">
                              👤
                            </div>

                          )}

                        </div>

                        {/* LOGO GRANDMASTER ASAL */}

                        <div className="absolute -right-1 -bottom-1 w-12 h-12 rounded-xl bg-slate-950 border border-yellow-500/50 p-1 shadow-xl">

                          <img
                            src="/grandmaster-logo.png"
                            alt="Grandmaster"
                            className="w-full h-full object-contain"
                          />

                        </div>

                      </div>

                      {/* MAKLUMAT MURID */}

                      <div className="flex-1 min-w-0">

                        <h2 className="text-xl md:text-2xl font-black leading-tight break-words">

                          <span className="text-yellow-400 mr-2">
                            👑
                          </span>

                          {student.name}

                        </h2>

                        <p className="text-sm text-yellow-400 font-bold mt-1">
                          GRANDMASTER · ROUND 2
                        </p>

                        {/* PROGRESS */}

                        <div className="mt-5">

                          <div className="flex justify-between items-center text-sm text-slate-400 mb-2">

                            <span>
                              Kemajuan Pusingan Kedua
                            </span>

                            <span className="font-bold text-yellow-400">
                              {secondRoundProgress}%
                            </span>

                          </div>

                          <div className="h-3 rounded-full bg-slate-800 overflow-hidden">

                            <div
                              className="h-full rounded-full bg-yellow-400 transition-all duration-700"
                              style={{
                                width: `${secondRoundProgress}%`,
                              }}
                            />

                          </div>

                        </div>

                      </div>

                      {/* MUKA SURAT ROUND 2 */}

                      <div className="text-right flex-shrink-0">

                        <div className="text-4xl font-black text-yellow-400">
                          {secondRoundPage}
                        </div>

                        <div className="text-xs text-slate-500">
                          / 604
                        </div>

                        <div className="text-xs text-slate-400 mt-2 uppercase tracking-wider">
                          ROUND 2
                        </div>

                      </div>

                    </div>

                  </div>

                );

              }
            )}

          </div>

        </section>

      )}

    </div>
  );
}