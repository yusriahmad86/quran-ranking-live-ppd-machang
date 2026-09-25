"use client";



import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";



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

/* MEDAL RANKING */

/* ========================================= */



function getMedal(position: number) {
  return `${position}`;
}





/* ========================================= */

/* LEVEL */

/* ========================================= */



function getLevel(page: number) {

  if (page >= 604) return "GRANDMASTER";

  if (page >= 401) return "HEROIC";

  if (page >= 301) return "DIAMOND";

  if (page >= 201) return "PLATINUM";

  if (page >= 101) return "GOLD";

  if (page >= 51) return "SILVER";



  return "BRONZE";

}





/* ========================================= */

/* LEVEL BADGE */

/* ========================================= */



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

/* FORMAT TARIKH KHATAM */

/* ========================================= */



function formatKhatamDate(date: string | null) {

  if (!date) {

    return "Masa rekod tidak tersedia";

  }



  return new Date(date).toLocaleString("ms-MY", {

    timeZone: "Asia/Kuala_Lumpur",

    day: "numeric",

    month: "long",

    year: "numeric",

    hour: "2-digit",

    minute: "2-digit",

  });

}





/* ========================================= */

/* GAMBAR PESERTA */

/* ========================================= */



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
        <span className="text-4xl">
          👤
        </span>
      )}
    </div>
  );
}





/* ========================================= */

/* MAIN PAGE */

/* ========================================= */



export default function RankingPage() {

  const [rankings, setRankings] =

    useState<LiveRankings | null>(null);



  const [loading, setLoading] =

    useState(true);



  const [error, setError] =

    useState("");





  /* ========================================= */

  /* LOAD RANKING */

  /* ========================================= */



  async function loadRankings() {
    const rankingDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kuala_Lumpur",
    }).format(new Date());

    const [
      { data: individualData, error: individualError },
      { data: schoolData, error: schoolError },
      { data: overallData, error: overallError },
      { data: grandmasterData, error: grandmasterError },
    ] = await Promise.all([
      supabase.rpc("get_top_readers", {
        p_date: rankingDate,
        p_limit: 10,
      }),
      supabase.rpc("get_school_rankings", {
        p_date: rankingDate,
        p_limit: 5,
      }),
      supabase.rpc("get_overall_progress", {
        p_limit: 10,
      }),
      supabase.rpc("get_grandmasters"),
    ]);

    const firstError =
      individualError ||
      schoolError ||
      overallError ||
      grandmasterError;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

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





  /* ========================================= */

  /* AUTO REFRESH 15 SAAT */

  /* ========================================= */



  useEffect(() => {

    void loadRankings();



    const interval =

      window.setInterval(() => {

        void loadRankings();

      }, 15000);



    return () =>

      window.clearInterval(interval);

  }, []);





  /* ========================================= */

  /* LOADING */

/* ========================================= */



  if (loading) {

    return (

      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">

        Memuatkan ranking live…

      </main>

    );

  }





  /* ========================================= */

  /* ERROR */

/* ========================================= */



  if (error) {

    return (

      <main className="min-h-screen bg-slate-950 p-10 text-white">



        <h1 className="text-3xl font-bold text-red-400">

          Ralat mendapatkan ranking

        </h1>



        <p className="mt-4 text-slate-300">

          {error}

        </p>



      </main>

    );

  }





  /* ========================================= */

  /* DATA */

/* ========================================= */



  const individual =

    rankings?.individual ?? [];



  const schools =

    rankings?.schools ?? [];



  const overall =

    rankings?.overall ?? [];



  const grandmasters =

    rankings?.grandmasters ?? [];





  /* ========================================= */

  /* PAGE */

/* ========================================= */



  return (

    <main className="min-h-screen bg-slate-950 text-white">





      {/* ===================================== */}

      {/* HEADER */}

      {/* ===================================== */}



      <header className="border-b border-white/10 bg-slate-900">



        <div className="mx-auto max-w-6xl px-6 py-10 text-center">



          <div className="text-5xl">

            📖

          </div>





          <h1 className="mt-3 text-4xl font-black">



            QURAN RANKING{" "}



            <span className="text-emerald-400">

              LIVE

            </span>



          </h1>





          <p className="mt-4 font-bold tracking-wide text-yellow-400">

            PROGRAM KHATAM MURID

          </p>





          <p className="mt-1 text-xl font-black">

            PPD MACHANG

          </p>





          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2">



            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />



            <span className="text-sm font-semibold text-red-400">

              LIVE · Dikemas kini setiap 15 saat

            </span>



          </div>





          {rankings?.date && (

            <p className="mt-4 text-sm text-slate-400">

              📅 {formatDate(rankings.date)}

            </p>

          )}



        </div>



      </header>





      {/* ===================================== */}

      {/* MAIN CONTENT */}

      {/* ===================================== */}



      <section className="mx-auto max-w-6xl space-y-10 px-6 py-10">





        {/* =================================== */}

        {/* TOP READER HARI INI */}

        {/* =================================== */}



        <section>



          <div className="mb-5">



            <p className="font-bold text-emerald-400">

              🔥 HARI INI

            </p>



            <h2 className="mt-1 text-3xl font-black">

              Top Reader Hari Ini

            </h2>



            <p className="mt-2 text-slate-400">

              Peserta dengan jumlah muka surat tertinggi hari ini.

            </p>



          </div>


          <div className="mt-4 text-right">

            <Link

              href="/ranking/top-reader"

              className="text-sm font-bold text-emerald-400 hover:text-emerald-300"

            >

              Lihat Semua →

            </Link>

          </div>





          {individual.length > 0 ? (



            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">



              {individual.slice(0, 10).map((item) => (



                <div

                  key={`${item.position}-${item.participant_name}`}

                  className="rounded-3xl border border-white/10 bg-slate-900 p-6"

                >



                  <div className="flex items-start justify-between gap-4">





                    <ParticipantPhoto

                      photoUrl={item.photo_url}

                      name={item.participant_name}

                      sizeClass="h-24 w-24"

                    />





                    <div className="text-right">



                      <span className="text-3xl">

                        {getMedal(item.position)}

                      </span>





                      <p className="mt-3 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">

                        {item.pages_today} muka surat

                      </p>



                    </div>



                  </div>





                  <h3 className="mt-6 text-xl font-black">

                    {item.participant_name}

                  </h3>





                  <p className="mt-1 text-sm text-slate-400">

                    {item.school_name}

                  </p>



                </div>



              ))}



            </div>



          ) : (



            <div className="rounded-3xl border border-white/10 bg-slate-900 p-8 text-slate-400">

              Belum ada bacaan direkodkan hari ini.

            </div>



          )}



        </section>





        {/* =================================== */}

        {/* RANKING SEKOLAH */}

        {/* =================================== */}



        <section>



          <div className="mb-5">



            <p className="font-bold text-blue-400">

              🏫 SEKOLAH

            </p>



            <h2 className="mt-1 text-3xl font-black">

              Ranking Purata Sekolah Hari Ini

            </h2>



            <p className="mt-2 text-slate-400">

              Purata bacaan harian bagi setiap peserta aktif sekolah.

            </p>



          </div>


          <div className="mt-4 text-right">

            <Link

              href="/ranking/sekolah"

              className="text-sm font-bold text-blue-400 hover:text-blue-300"

            >

              Lihat Semua →

            </Link>

          </div>





          {schools.length > 0 ? (



            <div className="space-y-3">



              {schools.map((school) => (



                <div

                  key={`${school.position}-${school.school_name}`}

                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900 px-5 py-4"

                >



                  <div className="flex items-center gap-4">



                    <span className="min-w-10 text-2xl">

                      {getMedal(school.position)}

                    </span>





                    <div>



                      <p className="font-bold">

                        {school.school_name}

                      </p>



                      <p className="text-sm text-slate-500">

                        {school.participant_count} peserta aktif

                      </p>



                    </div>



                  </div>





                  <p className="text-right font-black text-blue-400">



                    {school.average_pages.toFixed(1)}



                    <span className="block text-xs font-normal text-slate-500">

                      muka surat / peserta

                    </span>



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





        {/* =================================== */}

        {/* KEMAJUAN KESELURUHAN */}

        {/* =================================== */}



        <section>



          <div className="mb-5">



            <p className="font-bold text-yellow-400">

              📖 KESELURUHAN

            </p>



            <h2 className="mt-1 text-3xl font-black">

              Kemajuan Keseluruhan

            </h2>



            <p className="mt-2 text-slate-400">

              Kemajuan bacaan peserta berdasarkan jumlah muka surat yang telah dibaca.

            </p>



          </div>


          <div className="mt-4 text-right">

            <Link

              href="/ranking/kemajuan"

              className="text-sm font-bold text-yellow-400 hover:text-yellow-300"

            >

              Lihat Semua →

            </Link>

          </div>





          {overall.length > 0 ? (

            <div className="grid gap-4 md:grid-cols-2">

              {/* KEDUDUKAN 1 - 5 */}

              <div className="space-y-3">

                {overall.slice(0, 5).map((item) => {

                  const level = getLevel(item.current_page);
                  const badge = getLevelBadge(item.current_page);

                  return (

                    <div
                      key={item.participant_name}
                      className="rounded-2xl border border-white/10 bg-slate-900 p-4"
                    >

                      <div className="flex items-center gap-3">

                        {/* NOMBOR RANKING */}

                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 text-2xl font-black text-emerald-400">
                          {getMedal(item.position)}
                        </span>

                        {/* GAMBAR */}

                        <ParticipantPhoto
                          photoUrl={item.photo_url}
                          name={item.participant_name}
                          sizeClass="h-14 w-14"
                        />

                        {/* NAMA + SEKOLAH */}

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">
                            {item.participant_name}
                          </p>

                          <p className="truncate text-sm text-slate-500">
                            {item.school_name}
                          </p>
                        </div>

                        {/* LEVEL + PAGE */}

                        <div className="flex shrink-0 items-center gap-2">

                          <div className="hidden flex-col items-center sm:flex">
                            <img
                              src={badge}
                              alt={`${level} Badge`}
                              className="h-11 w-11 object-contain drop-shadow-xl"
                            />

                            <span className="mt-1 text-[9px] font-bold tracking-wide text-yellow-400">
                              {level}
                            </span>
                          </div>

                          <p className="whitespace-nowrap text-sm font-black text-emerald-400">
                            {item.current_page}
                            <span className="text-[10px] font-normal text-slate-500">
                              /604
                            </span>
                          </p>

                        </div>

                      </div>

                      {/* PROGRESS BAR */}

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">

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

                })}

              </div>

              {/* KEDUDUKAN 6 - 10 */}

              <div className="space-y-3">

                {overall.slice(5, 10).map((item) => {

                  const level = getLevel(item.current_page);
                  const badge = getLevelBadge(item.current_page);

                  return (

                    <div
                      key={item.participant_name}
                      className="rounded-2xl border border-white/10 bg-slate-900 p-4"
                    >

                      <div className="flex items-center gap-3">

                        {/* NOMBOR RANKING */}

                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10 text-sm font-black text-emerald-400">
                          {getMedal(item.position)}
                        </span>

                        {/* GAMBAR */}

                        <ParticipantPhoto
                          photoUrl={item.photo_url}
                          name={item.participant_name}
                          sizeClass="h-14 w-14"
                        />

                        {/* NAMA + SEKOLAH */}

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">
                            {item.participant_name}
                          </p>

                          <p className="truncate text-sm text-slate-500">
                            {item.school_name}
                          </p>
                        </div>

                        {/* LEVEL + PAGE */}

                        <div className="flex shrink-0 items-center gap-2">

                          <div className="hidden flex-col items-center sm:flex">
                            <img
                              src={badge}
                              alt={`${level} Badge`}
                              className="h-11 w-11 object-contain drop-shadow-xl"
                            />

                            <span className="mt-1 text-[9px] font-bold tracking-wide text-yellow-400">
                              {level}
                            </span>
                          </div>

                          <p className="whitespace-nowrap text-sm font-black text-emerald-400">
                            {item.current_page}
                            <span className="text-[10px] font-normal text-slate-500">
                              /604
                            </span>
                          </p>

                        </div>

                      </div>

                      {/* PROGRESS BAR */}

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">

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

                })}

              </div>

            </div>

          ) : (

            <div className="rounded-3xl border border-white/10 bg-slate-900 p-8 text-slate-400">
              Semua peserta aktif telah mencapai 604/604 atau belum ada peserta.
            </div>

          )}
        </section>





        {/* =================================== */}

        {/* GRANDMASTER */}

        {/* =================================== */}



        <section>



          <div className="mb-5">



            <p className="font-bold text-yellow-400">

              👑 PENCAPAIAN

            </p>



            <h2 className="mt-1 text-3xl font-black">

              Grandmaster

            </h2>



          </div>





          {grandmasters.length > 0 ? (



            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">



              {grandmasters.map((item) => (



                <div

                  key={item.participant_name}

                  className="rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-slate-900 p-6 text-center"

                >





                  {/* GAMBAR PESERTA + BADGE */}



                  <div className="relative mx-auto w-fit">





                    <ParticipantPhoto

                      photoUrl={item.photo_url}

                      name={item.participant_name}

                      sizeClass="h-28 w-28"

                    />





                    {/* BADGE GRANDMASTER */}



                    <img

                      src="/grandmaster-logo.png"

                      alt="Grandmaster Badge"

                      className="

                        absolute

                        -right-4

                        -bottom-4

                        h-14

                        w-14

                        object-contain

                        drop-shadow-2xl

                      "

                    />



                  </div>





                  {/* NAMA */}



                  <h3 className="mt-5 text-xl font-black">

                    {item.participant_name}

                  </h3>





                  {/* SEKOLAH */}



                  <p className="mt-1 text-sm text-slate-400">

                    {item.school_name}

                  </p>





                  {/* TARIKH KHATAM */}



                  <p className="mt-4 text-xs font-bold uppercase tracking-wide text-yellow-400">

                    Khatam pada:

                  </p>





                  <p className="mt-1 text-sm text-slate-300">

                    {formatKhatamDate(item.grandmaster_at)}

                  </p>



                </div>



              ))}



            </div>



          ) : (



            <div className="rounded-3xl border border-white/10 bg-slate-900 p-8 text-slate-400">

              Belum ada peserta mencapai 604 muka surat.

            </div>



          )}



        </section>



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