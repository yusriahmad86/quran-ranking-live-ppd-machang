"use client";



import Link from "next/link";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";



type DailyIndividual = {

  rank: number;

  id: string;

  name: string;

  photo_url: string | null;

  pages_read: number;

  current_page: number;

  school_id: string | null;

  school_name?: string;

  group_number: number | null;

};



type ActiveSchool = { id: string; name: string };



type DailySchool = {

  position: number;

  school_name: string;

  participant_count: number;

  average_pages: number;

};



type OverallProgress = {

  position: number;

  participant_name: string;

  photo_url: string | null;

  school_name: string;

  current_page: number;

};



type Grandmaster = {

  participant_name: string;

  photo_url: string | null;

  school_name: string;

  group_number: number | null;

  grandmaster_at: string | null;

};



type LiveRankings = {

  date: string;

  individual: DailyIndividual[];

  schools: DailySchool[];

  overall: OverallProgress[];

  grandmasters: Grandmaster[];

};



function getMedal(position: number) {

  return `${position}`;

}



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

  if (page >= 604) return "/grandmaster-logo.png";

  if (page >= 401) return "/heroic-logo.png";

  if (page >= 301) return "/diamond-logo.png";

  if (page >= 201) return "/platinum-logo.png";

  if (page >= 101) return "/gold-logo.png";

  if (page >= 51) return "/silver-logo.png";

  return "/bronze-logo.png";

}



function formatDate(date: string) {

  return new Date(`${date}T00:00:00+08:00`).toLocaleDateString("ms-MY", {

    day: "numeric",

    month: "long",

    year: "numeric",

  });

}



function formatKhatamDate(date: string | null) {

  if (!date) return "Masa rekod tidak tersedia";

  return new Date(date).toLocaleString("ms-MY", {

    timeZone: "Asia/Kuala_Lumpur",

    day: "numeric",

    month: "long",

    year: "numeric",

    hour: "2-digit",

    minute: "2-digit",

  });

}



function ParticipantPhoto({

  photoUrl,

  name,

  sizeClass,

}: {

  photoUrl: string | null;

  name: string;

  sizeClass: string;

}) {

  return (

    <div

      className={`${sizeClass} flex shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-emerald-400/20 bg-slate-800`}

    >

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



export default function RankingPage() {

  const [rankings, setRankings] = useState<LiveRankings | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [activeSchools, setActiveSchools] = useState<ActiveSchool[]>([]);

  const [selectedGrandmaster, setSelectedGrandmaster] = useState<Grandmaster | null>(null);

  const [selectedTopReader, setSelectedTopReader] = useState<DailyIndividual | null>(null);



  async function loadRankings() {

    const rankingDate = new Intl.DateTimeFormat("en-CA", {

      timeZone: "Asia/Kuala_Lumpur",

    }).format(new Date());



    const [

      { data: individualData, error: individualError },

      { data: schoolData, error: schoolError },

      { data: overallData, error: overallError },

      { data: grandmasterData, error: grandmasterError },

      { data: activeSchoolData, error: activeSchoolError },

    ] = await Promise.all([

      supabase.rpc("get_top_readers", { p_date: rankingDate, p_limit: 10 }),

      supabase.rpc("get_school_rankings", { p_date: rankingDate, p_limit: 5 }),

      supabase.rpc("get_overall_progress", { p_limit: 10 }),

      supabase.rpc("get_grandmasters"),

      supabase.rpc("get_active_schools"),

    ]);



    const firstError =

      individualError || schoolError || overallError || grandmasterError || activeSchoolError;



    if (firstError) {

      setError(firstError.message);

      setLoading(false);

      return;

    }



    setActiveSchools((activeSchoolData ?? []) as ActiveSchool[]);

    setRankings({

      date: rankingDate,

      individual: (individualData ?? []) as DailyIndividual[],

      schools: (schoolData ?? []) as DailySchool[],

      overall: (overallData ?? []) as OverallProgress[],

      grandmasters: (grandmasterData ?? []) as Grandmaster[],

    });

    setError("");

    setLoading(false);

  }



  useEffect(() => {

    void loadRankings();

    const interval = window.setInterval(() => void loadRankings(), 15000);

    return () => window.clearInterval(interval);

  }, []);



  useEffect(() => {

    if (!selectedGrandmaster && !selectedTopReader) return;

    const handleKeyDown = (event: KeyboardEvent) => {

      if (event.key === "Escape") {
        setSelectedGrandmaster(null);
        setSelectedTopReader(null);
      }

    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);

  }, [selectedGrandmaster, selectedTopReader]);



  if (loading) {

    return (

      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">

        Memuatkan ranking live…

      </main>

    );

  }



  if (error) {

    return (

      <main className="min-h-screen bg-slate-950 p-10 text-white">

        <h1 className="text-3xl font-bold text-red-400">Ralat mendapatkan ranking</h1>

        <p className="mt-4 text-slate-300">{error}</p>

      </main>

    );

  }



  const individual = rankings?.individual ?? [];

  const schools = rankings?.schools ?? [];

  const overall = rankings?.overall ?? [];

  const grandmasters = rankings?.grandmasters ?? [];



  const renderOverallCard = (item: OverallProgress) => {

    const level = getLevel(item.current_page);

    const badge = getLevelBadge(item.current_page);



    return (

      <div

        key={item.participant_name}

        className="min-w-0 rounded-2xl border border-white/10 bg-slate-900 p-3 sm:p-4"

      >

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">

          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 text-lg font-black text-emerald-400 sm:h-11 sm:w-11 sm:text-2xl">

            {getMedal(item.position)}

          </span>

          <ParticipantPhoto

            photoUrl={item.photo_url}

            name={item.participant_name}

            sizeClass="h-16 w-16 sm:h-20 sm:w-20"

          />

          <div className="min-w-0 flex-1">

            <p className="break-words text-sm font-bold sm:text-base">{item.participant_name}</p>

            <p className="break-words text-xs text-slate-500 sm:text-sm">{item.school_name}</p>

          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">

            <div className="flex flex-col items-center">

              <img

                src={badge}

                alt={`${level} Badge`}

                className="h-8 w-8 object-contain drop-shadow-xl sm:h-11 sm:w-11"

              />

              <span className="mt-0.5 text-[7px] font-bold tracking-wide text-yellow-400 sm:mt-1 sm:text-[9px]">

                {level}

              </span>

            </div>

            <p className="whitespace-nowrap text-xs font-black text-emerald-400 sm:text-sm">

              {item.current_page}

              <span className="text-[8px] font-normal text-slate-500 sm:text-[10px]">/604</span>

            </p>

          </div>

        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800 sm:mt-3">

          <div

            className="h-full rounded-full bg-emerald-500"

            style={{ width: `${Math.min(100, (item.current_page / 604) * 100)}%` }}

          />

        </div>

      </div>

    );

  };



  return (

    <main className="min-h-screen bg-slate-950 text-white">

      <header className="border-b border-white/10 bg-slate-900">
  <div className="mx-auto max-w-6xl px-3 py-4 text-center sm:px-6 sm:py-6">

    {/* GRAFIK UTAMA */}
    <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
      <img
        src="/og-image.png"
        alt="Quran Ranking Live PPD Machang"
        className="block h-auto w-full object-cover"
      />
    </div>

    {/* STATUS LIVE */}
    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2">
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />

      <span className="text-sm font-semibold text-red-400">
        LIVE · Dikemas kini setiap 15 saat
      </span>
    </div>

    {/* TARIKH */}
    {rankings?.date && (
      <p className="mt-3 text-sm text-slate-400">
        📅 {formatDate(rankings.date)}
      </p>
    )}

  </div>
</header>



      <section className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">

        <section>

          <div className="mb-5">

            <p className="font-bold text-emerald-400">🔥 HARI INI</p>

            <div className="flex flex-wrap items-end justify-between gap-3">

              <div>

                <h2 className="mt-1 text-2xl font-black sm:text-3xl">Top Reader Hari Ini</h2>

                <p className="mt-2 text-sm text-slate-400 sm:text-base">

                  Peserta dengan jumlah muka surat tertinggi hari ini.

                </p>

              </div>

              <Link href="/ranking/top-reader" className="text-sm font-bold text-emerald-400 hover:text-emerald-300">

                Lihat Semua →

              </Link>

            </div>

          </div>



          {individual.length > 0 ? (

            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">

              {individual.slice(0, 10).map((item) => (

                <button

                  key={`${item.rank}-${item.name}`}

                  type="button"

                  onClick={() => setSelectedTopReader(item)}

                  className="group min-w-0 rounded-2xl border border-white/10 bg-slate-900 p-3 text-left transition duration-300 hover:-translate-y-1 hover:border-emerald-300/50 hover:shadow-[0_0_35px_rgba(16,185,129,0.16)] focus:outline-none focus:ring-2 focus:ring-emerald-400/70 sm:rounded-3xl sm:p-6"

                  aria-label={`Lihat pencapaian Top Reader ${item.name}`}

                >

                  <div className="flex min-w-0 items-start gap-3 sm:gap-4">

                    <ParticipantPhoto

                      photoUrl={item.photo_url}

                      name={item.name}

                      sizeClass="h-18 w-18 sm:h-26 sm:w-26"

                    />

                    <div className="flex min-w-0 flex-1 flex-col items-end">

                      <span className="text-2xl font-black text-emerald-400 sm:text-3xl">{getMedal(item.rank)}</span>

                      <p className="mt-2 whitespace-nowrap rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 sm:px-3 sm:text-xs">

                        {item.pages_read} muka surat

                      </p>

                    </div>

                  </div>

                  <h3 className="mt-4 break-words text-base font-black leading-snug sm:mt-6 sm:text-xl">{item.name}</h3>

                  <p className="mt-1 break-words text-xs leading-relaxed text-slate-400 sm:text-sm">

                    {activeSchools.find((school) => school.id === item.school_id)?.name ?? "Sekolah tidak tersedia"}

                  </p>

                  <p className="mt-1 text-xs font-bold text-emerald-400 sm:text-sm">
                    Kumpulan {item.group_number ?? "—"}
                  </p>

                  <p className="mt-4 text-xs font-bold text-emerald-500/70 transition group-hover:text-emerald-300">
                    ✨ Klik untuk lihat pencapaian
                  </p>

                </button>

              ))}

            </div>

          ) : (

            <div className="rounded-3xl border border-white/10 bg-slate-900 p-8 text-slate-400">

              Belum ada bacaan direkodkan hari ini.

            </div>

          )}

        </section>



        <section>

          <div className="mb-5">

            <p className="font-bold text-yellow-400">📖 KESELURUHAN</p>

            <div className="flex flex-wrap items-end justify-between gap-3">

              <div>

                <h2 className="mt-1 text-2xl font-black sm:text-3xl">Kemajuan Keseluruhan</h2>

                <p className="mt-2 text-sm text-slate-400 sm:text-base">

                  Kemajuan bacaan 10 peserta teratas berdasarkan jumlah muka surat yang telah dibaca.

                </p>

              </div>

              <Link href="/ranking/kemajuan" className="text-sm font-bold text-yellow-400 hover:text-yellow-300">

                Lihat Semua →

              </Link>

            </div>

          </div>

          {overall.length > 0 ? (

            <div className="grid min-w-0 gap-4 md:grid-cols-2">

              <div className="min-w-0 space-y-3">{overall.slice(0, 5).map(renderOverallCard)}</div>

              <div className="min-w-0 space-y-3">{overall.slice(5, 10).map(renderOverallCard)}</div>

            </div>

          ) : (

            <div className="rounded-3xl border border-white/10 bg-slate-900 p-8 text-slate-400">

              Semua peserta aktif telah mencapai 604/604 atau belum ada peserta.

            </div>

          )}

        </section>



        <section>

          <div className="mb-5">

            <p className="font-bold text-blue-400">🏫 SEKOLAH</p>

            <div className="flex flex-wrap items-end justify-between gap-3">

              <div>

                <h2 className="mt-1 text-2xl font-black sm:text-3xl">Ranking Purata Sekolah Hari Ini</h2>

                <p className="mt-2 text-sm text-slate-400 sm:text-base">

                  Purata bacaan harian bagi setiap peserta aktif 5 sekolah teratas.

                </p>

              </div>

              <Link href="/ranking/sekolah" className="text-sm font-bold text-blue-400 hover:text-blue-300">

                Lihat Semua →

              </Link>

            </div>

          </div>

          {schools.length > 0 ? (

            <div className="space-y-3">

              {schools.slice(0, 5).map((school) => (

                <div

                  key={`${school.position}-${school.school_name}`}

                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900 px-5 py-4"

                >

                  <div className="flex items-center gap-4">

                    <span className="min-w-10 text-2xl">{getMedal(school.position)}</span>

                    <div>

                      <p className="font-bold">{school.school_name}</p>

                      <p className="text-sm text-slate-500">{school.participant_count} peserta aktif</p>

                    </div>

                  </div>

                  <p className="text-right font-black text-blue-400">

                    {school.average_pages.toFixed(1)}

                    <span className="block text-xs font-normal text-slate-500">muka surat / peserta</span>

                  </p>

                </div>

              ))}

            </div>

          ) : (

            <div className="rounded-3xl border border-white/10 bg-slate-900 p-8 text-slate-400">

              Belum ada peserta aktif berdaftar.

            </div>

          )}

        </section>



        <section>

          <div className="mb-5">

            <p className="font-bold text-yellow-400">👑 PENCAPAIAN</p>

            <h2 className="mt-1 text-2xl font-black sm:text-3xl">Grandmaster (Khatam Al-Quran) — {grandmasters.length} Orang</h2>

          </div>



          {grandmasters.length > 0 ? (

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

              {grandmasters.map((item) => (

                <button

                  key={item.participant_name}

                  type="button"

                  onClick={() => setSelectedGrandmaster(item)}

                  className="group w-full rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-slate-900 p-6 text-center transition duration-300 hover:-translate-y-1 hover:border-yellow-300/50 hover:shadow-[0_0_35px_rgba(250,204,21,0.18)] focus:outline-none focus:ring-2 focus:ring-yellow-400/70"

                  aria-label={`Lihat pencapaian Grandmaster ${item.participant_name}`}

                >

                  <div className="relative mx-auto w-fit">

                    <div className="transition duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_25px_rgba(250,204,21,0.45)]">

                      <ParticipantPhoto photoUrl={item.photo_url} name={item.participant_name} sizeClass="h-36 w-36" />

                    </div>

                    <img

                      src="/grandmaster-logo.png"

                      alt="Grandmaster Badge"

                      className="absolute -right-4 -bottom-4 h-14 w-14 object-contain drop-shadow-2xl transition duration-300 group-hover:scale-110"

                    />

                  </div>

                  <h3 className="mt-5 break-words text-xl font-black">{item.participant_name}</h3>

                  <p className="mt-1 break-words text-sm text-slate-400">{item.school_name}</p>

                  <p className="mt-1 text-sm font-bold text-yellow-400">
                    Kumpulan {item.group_number ?? "—"}
                  </p>

                  <p className="mt-4 text-xs font-bold uppercase tracking-wide text-yellow-400">Khatam pada:</p>

                  <p className="mt-1 text-sm text-slate-300">{formatKhatamDate(item.grandmaster_at)}</p>

                  <p className="mt-4 text-xs font-bold text-yellow-500/70 transition group-hover:text-yellow-300">

                    ✨ Klik untuk lihat pencapaian

                  </p>

                </button>

              ))}

            </div>

          ) : (

            <div className="rounded-3xl border border-white/10 bg-slate-900 p-8 text-slate-400">

              Belum ada peserta mencapai 604 muka surat.

            </div>

          )}

        </section>

      </section>



      {selectedTopReader && (

        <div

          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-md"

          role="dialog"

          aria-modal="true"

          aria-label="Pencapaian Top Reader"

          onMouseDown={(event) => {

            if (event.target === event.currentTarget) setSelectedTopReader(null);

          }}

        >

          <div className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-emerald-300/30 bg-gradient-to-b from-emerald-500/15 via-slate-950 to-slate-950 p-6 shadow-[0_0_80px_rgba(16,185,129,0.18)] animate-[gm-pop-in_0.45s_ease-out] sm:p-10">

            <div className="pointer-events-none absolute inset-0 overflow-hidden">

              {[

                { left: "18%", top: "20%", delay: "0s" },

                { left: "82%", top: "24%", delay: "0.35s" },

                { left: "25%", top: "72%", delay: "0.7s" },

                { left: "78%", top: "70%", delay: "1s" },

              ].map((burst, burstIndex) => (

                <div key={burstIndex} className="absolute h-1 w-1" style={{ left: burst.left, top: burst.top }}>

                  {Array.from({ length: 12 }).map((_, index) => (

                    <span

                      key={index}

                      className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-emerald-300 opacity-0 shadow-[0_0_8px_rgba(110,231,183,0.9)] animate-[gm-firework_1.8s_ease-out_forwards]"

                      style={{

                        ["--angle" as string]: `${index * 30}deg`,

                        ["--distance" as string]: `${45 + (index % 3) * 18}px`,

                        animationDelay: burst.delay,

                      }}

                    />

                  ))}

                </div>

              ))}

            </div>

            <button

              type="button"

              onClick={() => setSelectedTopReader(null)}

              className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"

              aria-label="Tutup"

            >

              ×

            </button>

            <div className="relative z-10 text-center">

              <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-400 sm:text-base">

                🏆 TOP READER HARI INI

              </p>

              <div className="relative mx-auto mt-7 w-fit">

                <div className="absolute -inset-6 rounded-full bg-emerald-400/15 blur-2xl animate-[gm-glow_2s_ease-in-out_infinite]" />

                <div className="relative overflow-hidden rounded-[2rem] border-4 border-emerald-300/60 bg-slate-900 shadow-[0_0_45px_rgba(16,185,129,0.3)]">

                  <ParticipantPhoto

                    photoUrl={selectedTopReader.photo_url}

                    name={selectedTopReader.name}

                    sizeClass="h-48 w-48 sm:h-64 sm:w-64"

                  />

                </div>

                <div className="absolute -bottom-5 -right-5 flex h-20 w-20 items-center justify-center rounded-full border-4 border-emerald-300/60 bg-slate-900 text-3xl font-black text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.35)] sm:h-24 sm:w-24 sm:text-4xl">

                  {selectedTopReader.rank}

                </div>

              </div>

              <p className="mt-10 text-4xl font-black tracking-wide text-emerald-300 drop-shadow-[0_0_18px_rgba(52,211,153,0.45)] sm:text-6xl">

                TAHNIAH!

              </p>

              <h2 className="mt-4 break-words text-2xl font-black sm:text-4xl">

                {selectedTopReader.name}

              </h2>

              <p className="mt-2 break-words text-base font-semibold text-slate-400 sm:text-lg">

                {activeSchools.find((school) => school.id === selectedTopReader.school_id)?.name ?? "Sekolah tidak tersedia"}

              </p>

              <p className="mt-2 text-base font-black text-emerald-400 sm:text-lg">

                Kumpulan {selectedTopReader.group_number ?? "—"}

              </p>

              <div className="mx-auto mt-7 grid w-full max-w-xl gap-3 sm:grid-cols-2">

                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-6 py-4 shadow-[0_0_30px_rgba(16,185,129,0.08)]">

                  <p className="text-3xl font-black text-emerald-300 sm:text-5xl">

                    {selectedTopReader.pages_read}

                  </p>

                  <p className="mt-1 text-xs font-black tracking-[0.2em] text-emerald-500 sm:text-sm">

                    MUKA SURAT HARI INI

                  </p>

                </div>

                <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-6 py-4 shadow-[0_0_30px_rgba(250,204,21,0.08)]">

                  <p className="text-3xl font-black text-yellow-300 sm:text-5xl">

                    {selectedTopReader.current_page} / 604

                  </p>

                  <p className="mt-1 text-xs font-black tracking-[0.2em] text-yellow-500 sm:text-sm">

                    KEMAJUAN SEMASA

                  </p>

                </div>

              </div>

              <p className="mt-8 text-sm font-medium text-slate-500">

                Alhamdulillah, tahniah atas pencapaian bacaan hari ini! 📖✨

              </p>

            </div>

          </div>

        </div>

      )}



      {selectedGrandmaster && (

        <div

          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-md"

          role="dialog"

          aria-modal="true"

          aria-label="Pencapaian Grandmaster"

          onMouseDown={(event) => {

            if (event.target === event.currentTarget) setSelectedGrandmaster(null);

          }}

        >

          <div className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-yellow-300/30 bg-gradient-to-b from-yellow-500/15 via-slate-950 to-slate-950 p-6 shadow-[0_0_80px_rgba(250,204,21,0.18)] sm:p-10 animate-[gm-pop-in_0.45s_ease-out]">

            <div className="pointer-events-none absolute inset-0 overflow-hidden">

              {[

                { left: "18%", top: "20%", delay: "0s" },

                { left: "82%", top: "24%", delay: "0.35s" },

                { left: "25%", top: "72%", delay: "0.7s" },

                { left: "78%", top: "70%", delay: "1s" },

              ].map((burst, burstIndex) => (

                <div key={burstIndex} className="absolute h-1 w-1" style={{ left: burst.left, top: burst.top }}>

                  {Array.from({ length: 12 }).map((_, index) => (

                    <span

                      key={index}

                      className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-yellow-300 opacity-0 shadow-[0_0_8px_rgba(253,224,71,0.9)] animate-[gm-firework_1.8s_ease-out_forwards]"

                      style={{

                        ["--angle" as string]: `${index * 30}deg`,

                        ["--distance" as string]: `${45 + (index % 3) * 18}px`,

                        animationDelay: burst.delay,

                      }}

                    />

                  ))}

                </div>

              ))}

            </div>



            <button

              type="button"

              onClick={() => setSelectedGrandmaster(null)}

              className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"

              aria-label="Tutup"

            >

              ×

            </button>



            <div className="relative z-10 text-center">

              <p className="text-sm font-black uppercase tracking-[0.3em] text-yellow-400 sm:text-base">

                👑 PENCAPAIAN GRANDMASTER

              </p>



              <div className="relative mx-auto mt-7 w-fit">

                <div className="absolute -inset-6 rounded-full bg-yellow-400/15 blur-2xl animate-[gm-glow_2s_ease-in-out_infinite]" />

                <div className="relative overflow-hidden rounded-[2rem] border-4 border-yellow-300/60 bg-slate-900 shadow-[0_0_45px_rgba(250,204,21,0.3)]">

                  <ParticipantPhoto

                    photoUrl={selectedGrandmaster.photo_url}

                    name={selectedGrandmaster.participant_name}

                    sizeClass="h-48 w-48 sm:h-64 sm:w-64"

                  />

                </div>

                <img

                  src="/grandmaster-logo.png"

                  alt="Grandmaster Badge"

                  className="absolute -bottom-7 -right-7 h-28 w-28 object-contain drop-shadow-[0_0_20px_rgba(250,204,21,0.65)] sm:-bottom-8 sm:-right-8 sm:h-36 sm:w-36"

                />

              </div>



              <p className="mt-10 text-4xl font-black tracking-wide text-yellow-300 drop-shadow-[0_0_18px_rgba(250,204,21,0.45)] sm:text-6xl">

                TAHNIAH!

              </p>

              <h2 className="mt-4 break-words text-2xl font-black sm:text-4xl">{selectedGrandmaster.participant_name}</h2>

              <p className="mt-2 break-words text-base font-semibold text-slate-400 sm:text-lg">{selectedGrandmaster.school_name}</p>
              <p className="mt-2 text-base font-black text-yellow-400 sm:text-lg">
                Kumpulan {selectedGrandmaster.group_number ?? "—"}
              </p>



              <div className="mx-auto mt-7 w-fit rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-6 py-4 shadow-[0_0_30px_rgba(250,204,21,0.08)] sm:px-10 sm:py-5">

                <p className="text-3xl font-black text-yellow-300 sm:text-5xl">604 / 604</p>

                <p className="mt-1 text-xs font-black tracking-[0.25em] text-yellow-500 sm:text-sm">MUKA SURAT</p>

              </div>



              <div className="mt-7">

                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Khatam pada</p>

                <p className="mt-2 text-base font-bold text-slate-200 sm:text-lg">

                  {formatKhatamDate(selectedGrandmaster.grandmaster_at)}

                </p>

              </div>



              <p className="mt-8 text-sm font-medium text-slate-500">

                Alhamdulillah, tahniah atas pencapaian khatam Al-Quran! 🌙✨

              </p>

            </div>

          </div>



          <style jsx global>{`

            @keyframes gm-pop-in {

              0% { opacity: 0; transform: scale(0.88) translateY(18px); }

              100% { opacity: 1; transform: scale(1) translateY(0); }

            }

            @keyframes gm-glow {

              0%, 100% { opacity: 0.45; transform: scale(0.92); }

              50% { opacity: 0.9; transform: scale(1.08); }

            }

            @keyframes gm-firework {

              0% { opacity: 1; transform: rotate(var(--angle)) translateX(0) scale(1); }

              100% { opacity: 0; transform: rotate(var(--angle)) translateX(var(--distance)) scale(0); }

            }

          `}</style>

        </div>

      )}



      <footer className="border-t border-white/10 bg-slate-900">

        <p className="py-6 text-center text-xs text-slate-600">

          © 2026 QURAN RANKING LIVE · PROGRAM KHATAM MURID PPD MACHANG

        </p>

      </footer>

    </main>

  );

}
