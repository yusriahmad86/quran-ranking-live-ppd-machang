import Link from "next/link";

import { createClient } from "@/lib/supabase/server";



type DailyIndividual = {

  position: number;

  participant_name: string;

  photo_url: string | null;

  school_name: string;

  pages_today: number;

};



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

  grandmaster_at: string | null;

};



type LiveRankings = {

  date: string;

  individual: DailyIndividual[];

  schools: DailySchool[];

  overall: OverallProgress[];

  grandmasters: Grandmaster[];

};



/* ========================================= */

/* FORMAT TARIKH */

/* ========================================= */



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



/* ========================================= */

/* MAIN DASHBOARD */

/* ========================================= */



export default async function DashboardPage() {

  const supabase = await createClient();



  /* ========================================= */

  /* DAPATKAN DATA RANKING */

  /* ========================================= */



  const { data, error } = await supabase.rpc("get_live_rankings");



  /* ========================================= */

  /* ERROR */

  /* ========================================= */



  if (error) {

    return (

      <main className="min-h-screen bg-slate-950 p-10 text-white">

        <div className="mx-auto max-w-4xl">

          <h1 className="text-3xl font-black text-red-400">

            Ralat mendapatkan data dashboard

          </h1>



          <p className="mt-4 text-slate-300">

            {error.message}

          </p>



          <div className="mt-8 flex flex-wrap gap-3">

            <Link

              href="/guru/daftar-murid"

              className="inline-flex rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950"

            >

              ➕ Daftar Murid

            </Link>



            <Link

              href="/guru/edit-murid"

              className="inline-flex rounded-xl bg-cyan-500 px-5 py-3 font-bold text-white"

            >

              ✏️ Edit Murid

            </Link>



            <Link

              href="/ranking"

              className="inline-flex rounded-xl bg-yellow-400 px-5 py-3 font-bold text-slate-950"

            >

              🏆 Buka Ranking Live

            </Link>



            <Link

              href="/guru/laporan-kumpulan"

              className="inline-flex rounded-xl bg-purple-500 px-5 py-3 font-bold text-white"

            >

              📄 Laporan Bacaan

            </Link>



            <Link

              href="/guru/analisa-keseluruhan"

              className="inline-flex rounded-xl bg-blue-500 px-5 py-3 font-bold text-white"

            >

              📊 Analisa Keseluruhan

            </Link>

          </div>

        </div>

      </main>

    );

  }



  /* ========================================= */

  /* DATA */

  /* ========================================= */



  const rankings = data as LiveRankings;



  const individual = rankings?.individual ?? [];

  const schools = rankings?.schools ?? [];

  const overall = rankings?.overall ?? [];

  const grandmasters = rankings?.grandmasters ?? [];



  /* ========================================= */

  /* KIRAAN STATISTIK */

  /* ========================================= */



  const totalSchools = schools.length;



  const totalParticipants =

    overall.length + grandmasters.length;



  const totalTodayPages = individual.reduce(

    (total, participant) =>

      total + (participant.pages_today ?? 0),

    0

  );



  const totalGrandmasters = grandmasters.length;
/* ========================================= */

  /* PAGE */

  /* ========================================= */



  return (

    <main className="min-h-screen bg-slate-950 text-white">



      {/* ===================================== */}

      {/* HEADER */}

      {/* ===================================== */}



      <header className="border-b border-white/10 bg-slate-900">

        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4">



          <div>

            <h1 className="text-lg font-black sm:text-xl">

              📖 QURAN RANKING{" "}

              <span className="text-emerald-400">

                LIVE

              </span>

            </h1>



            <p className="mt-1 text-[10px] text-slate-400 sm:text-xs">

              PROGRAM KHATAM MURID · PPD MACHANG

            </p>

          </div>



          <div className="flex gap-2">

            <Link

              href="/guru/daftar-murid"

              className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 sm:px-4 sm:text-sm"

            >

              ➕ Daftar Murid

            </Link>



            <Link

              href="/ranking"

              className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-xs font-bold text-yellow-400 transition hover:bg-yellow-400/20 sm:px-4 sm:text-sm"

            >

              🏆 Ranking

            </Link>

          </div>



        </div>

      </header>



      {/* ===================================== */}

      {/* CONTENT */}

      {/* ===================================== */}



      <section className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6">



        {/* TAJUK */}



        <div className="mb-3">

          <p className="font-semibold text-emerald-400">

            ASSALAMUALAIKUM 👋

          </p>



          <h2 className="mt-0.5 text-base font-black sm:text-xl leading-tight sm:text-4xl">

            Dashboard Generasi MADANI Khatam Al-Quran PPD Machang

          </h2>



          <p className="mt-1 text-xs text-slate-400 sm:text-base">

            Ringkasan program bacaan Al-Quran semua sekolah.

          </p>



          {rankings?.date && (

            <p className="mt-1 text-[10px] text-slate-500 sm:text-sm">

              📅 Data setakat {formatDate(rankings.date)}

            </p>

          )}

        </div>



        {/* =================================== */}
{/* =================================== */}
{/* MENU UTAMA */}
{/* =================================== */}

<div className="mb-4">

  <h3 className="mb-2 text-base font-black sm:text-lg">
    MENU UTAMA
  </h3>

  <div className="grid grid-cols-3 gap-2 sm:gap-3">

    {/* PENGISIAN BACAAN */}
    <Link
      href="/guru"
      className="group relative overflow-hidden rounded-xl border border-emerald-300/20 bg-gradient-to-br from-emerald-500/60 via-emerald-600/50 to-teal-700/60 p-2.5 text-white shadow-md shadow-emerald-900/20 transition duration-200 hover:-translate-y-0.5 hover:brightness-110 sm:rounded-2xl sm:p-4"
    >
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
      <div className="relative">
        <div className="text-xl sm:text-2xl">📖</div>
        <p className="mt-1 text-[10px] font-black leading-tight sm:text-sm">
          Pengisian Bacaan
        </p>
      </div>
    </Link>

    {/* DAFTAR MURID */}
    <Link
      href="/guru/daftar-murid"
      className="group relative overflow-hidden rounded-xl border border-blue-300/20 bg-gradient-to-br from-blue-500/60 via-blue-600/50 to-cyan-700/60 p-2.5 text-white shadow-md shadow-blue-900/20 transition duration-200 hover:-translate-y-0.5 hover:brightness-110 sm:rounded-2xl sm:p-4"
    >
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
      <div className="relative">
        <div className="text-xl sm:text-2xl">👨‍🎓</div>
        <p className="mt-1 text-[10px] font-black leading-tight sm:text-sm">
          Daftar Murid
        </p>
      </div>
    </Link>

    {/* EDIT MURID */}
    <Link
      href="/guru/edit-murid"
      className="group relative overflow-hidden rounded-xl border border-orange-300/20 bg-gradient-to-br from-orange-500/60 via-amber-500/50 to-yellow-600/60 p-2.5 text-white shadow-md shadow-orange-900/20 transition duration-200 hover:-translate-y-0.5 hover:brightness-110 sm:rounded-2xl sm:p-4"
    >
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
      <div className="relative">
        <div className="text-xl sm:text-2xl">✏️</div>
        <p className="mt-1 text-[10px] font-black leading-tight sm:text-sm">
          Edit Murid
        </p>
      </div>
    </Link>

    {/* RANKING LIVE */}
    <Link
      href="/ranking"
      className="group relative overflow-hidden rounded-xl border border-purple-300/20 bg-gradient-to-br from-purple-500/60 via-violet-600/50 to-fuchsia-700/60 p-2.5 text-white shadow-md shadow-purple-900/20 transition duration-200 hover:-translate-y-0.5 hover:brightness-110 sm:rounded-2xl sm:p-4"
    >
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
      <div className="relative">
        <div className="text-xl sm:text-2xl">🏆</div>
        <p className="mt-1 text-[10px] font-black leading-tight sm:text-sm">
          Ranking Live
        </p>
      </div>
    </Link>

    {/* LAPORAN BACAAN */}
    <Link
      href="/guru/laporan-kumpulan"
      className="group relative overflow-hidden rounded-xl border border-rose-300/20 bg-gradient-to-br from-rose-500/60 via-red-600/50 to-red-700/60 p-2.5 text-white shadow-md shadow-red-900/20 transition duration-200 hover:-translate-y-0.5 hover:brightness-110 sm:rounded-2xl sm:p-4"
    >
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
      <div className="relative">
        <div className="text-xl sm:text-2xl">📄</div>
        <p className="mt-1 text-[10px] font-black leading-tight sm:text-sm">
          Laporan Bacaan
        </p>
      </div>
    </Link>

    {/* ANALISA KESELURUHAN */}
    <Link
      href="/guru/analisa-keseluruhan"
      className="group relative overflow-hidden rounded-xl border border-yellow-300/20 bg-gradient-to-br from-yellow-400/60 via-amber-500/50 to-orange-600/60 p-2.5 text-white shadow-md shadow-orange-900/20 transition duration-200 hover:-translate-y-0.5 hover:brightness-110 sm:rounded-2xl sm:p-4"
    >
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
      <div className="relative">
        <div className="text-xl sm:text-2xl">📊</div>
        <p className="mt-1 text-[10px] font-black leading-tight sm:text-sm">
          Analisa Keseluruhan
        </p>
      </div>
    </Link>

  </div>

</div>

 <h3 className="mb-2 text-base font-black sm:text-lg">
  STATISTIK UTAMA
</h3>
        {/* =================================== */}



        <div className="grid grid-cols-4 gap-1.5 sm:gap-3 lg:gap-4">



          {/* SEKOLAH */}



          <div className="rounded-xl border border-white/10 bg-slate-900 p-2 sm:rounded-2xl sm:p-4">

            <div className="mb-1 text-xl sm:mb-2 sm:text-3xl">

              🏫

            </div>



            <p className="text-[8px] leading-tight text-slate-400 sm:text-xs">

              Jumlah Sekolah Terlibat

            </p>



            <p className="mt-0.5 text-xl font-black sm:text-3xl">

              {totalSchools}

            </p>



            <p className="mt-0.5 text-[7px] text-blue-400 sm:text-xs">

              sekolah aktif

            </p>

          </div>



          {/* PESERTA */}



          <div className="rounded-xl border border-white/10 bg-slate-900 p-2 sm:rounded-2xl sm:p-4">

            <div className="mb-1 text-xl sm:mb-2 sm:text-3xl">

              👨‍🎓

            </div>



            <p className="text-[8px] leading-tight text-slate-400 sm:text-xs">

              Jumlah Peserta

            </p>



            <p className="mt-0.5 text-xl font-black sm:text-3xl">

              {totalParticipants}

            </p>



            <p className="mt-0.5 text-[7px] text-emerald-400 sm:text-xs">

              peserta aktif

            </p>

          </div>



          {/* BACAAN HARI INI */}



          <div className="rounded-xl border border-white/10 bg-slate-900 p-2 sm:rounded-2xl sm:p-4">

            <div className="mb-1 text-xl sm:mb-2 sm:text-3xl">

              🔥

            </div>



            <p className="text-[8px] leading-tight text-slate-400 sm:text-xs">

              Jumlah Bacaan Semua Peserta Hari Ini

            </p>



            <p className="mt-0.5 text-xl font-black sm:text-3xl">
               {totalTodayPages.toLocaleString()}
            </p>



            <p className="mt-1 text-sm text-emerald-400">

              muka surat

            </p>

          </div>



          {/* GRANDMASTER */}



          <div className="rounded-xl border border-yellow-500/20 bg-slate-900 p-2 sm:rounded-2xl sm:p-4">

            <div className="mb-1 text-xl sm:mb-2 sm:text-3xl">

              👑

            </div>



            <p className="text-[8px] leading-tight text-slate-400 sm:text-xs">

              Grandmaster

            </p>



            <p className="mt-0.5 text-xl font-black text-yellow-400 sm:text-3xl">

              {totalGrandmasters}

            </p>



            <p className="mt-0.5 text-[7px] text-yellow-500 sm:text-xs">

              telah khatam

            </p>

          </div>



        </div>



        {/* =================================== */}
        {/* STATUS KHATAM */}



          <div className="mt-3 rounded-2xl border border-white/10 bg-slate-900 p-3 sm:mt-5 sm:rounded-3xl sm:p-5">



            <div className="text-2xl sm:text-3xl">

              📖

            </div>



            <p className="mt-1 text-xs text-slate-400 sm:text-sm">

              Status Khatam

            </p>



            <p className="mt-1 text-lg font-black text-emerald-400 sm:text-xl">

              Kemajuan Peserta

            </p>



            <p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs">

              Ringkasan status peserta program

            </p>



            <div className="mt-2 grid grid-cols-2 gap-2">



              <div className="rounded-xl bg-slate-800 p-2.5 sm:p-3">

                <p className="text-xs text-slate-500">

                  Belum Khatam

                </p>



                <p className="mt-0.5 text-lg font-black sm:text-xl">

                  {overall.length}

                </p>



                <p className="text-xs text-slate-500">

                  peserta

                </p>

              </div>



              <div className="rounded-xl bg-yellow-500/10 p-2.5 sm:p-3">

                <p className="text-xs text-yellow-500">

                  Grandmaster (Khatam)

                </p>



                <p className="mt-0.5 text-lg font-black text-yellow-400 sm:text-xl">

                  {grandmasters.length}

                </p>



                <p className="text-xs text-yellow-500">

                  peserta

                </p>

              </div>



            </div>

          </div>



        {/* =================================== */}
        {/* RANKING SEKOLAH RINGKAS */}

        {/* =================================== */}



        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900 p-3 sm:mt-6 sm:rounded-3xl sm:p-5">



          <div className="flex items-center justify-between gap-4">



            <div>

              <p className="font-bold text-blue-400">

                🏫 SEKOLAH

              </p>



              <h3 className="mt-1 text-2xl font-black">

                Ranking Sekolah Hari Ini

              </h3>

            </div>



            <Link

              href="/ranking"

              className="text-sm font-bold text-yellow-400 hover:text-yellow-300"

            >

              Lihat penuh →

            </Link>



          </div>



          {schools.length > 0 ? (

            <div className="mt-3 space-y-1.5">



              {schools.slice(0, 5).map((school) => (

                <div

                  key={`${school.position}-${school.school_name}`}

                  className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-800 px-3 py-2 sm:rounded-2xl sm:px-4 sm:py-3"

                >



                  <div className="flex items-center gap-4">



                    <span className="text-2xl">

                      {school.position === 1

                        ? "🥇"

                        : school.position === 2

                        ? "🥈"

                        : school.position === 3

                        ? "🥉"

                        : `#${school.position}`}

                    </span>



                    <div>

                      <p className="font-bold">

                        {school.school_name}

                      </p>



                      <p className="text-xs text-slate-500">

                        {school.participant_count} peserta aktif

                      </p>

                    </div>



                  </div>



                  <div className="text-right">

                    <p className="font-black text-blue-400">

                      {school.average_pages.toFixed(1)}

                    </p>



                    <p className="text-[10px] text-slate-500">

                      muka surat / peserta

                    </p>

                  </div>



                </div>

              ))}



            </div>

          ) : (

            <p className="mt-6 text-slate-500">

              Belum ada data sekolah.

            </p>

          )}



        </div>







        {/* =================================== */}

      </section>



      {/* ===================================== */}

      {/* FOOTER */}

      {/* ===================================== */}



      <footer className="border-t border-white/10 bg-slate-900">



        <p className="py-6 text-center text-xs text-slate-600">

          © 2026 QURAN RANKING LIVE · PROGRAM KHATAM MURID PPD MACHANG

        </p>



      </footer>



    </main>

  );

}