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
  /* DAPATKAN DATA YANG SAMA DENGAN RANKING */
  /* ========================================= */

  const { data, error } =
    await supabase.rpc("get_live_rankings");

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
              href="/ranking"
              className="inline-flex rounded-xl bg-yellow-400 px-5 py-3 font-bold text-slate-950"
            >
              🏆 Buka Ranking Live
            </Link>

          </div>

        </div>

      </main>
    );
  }


  /* ========================================= */
  /* DATA */
  /* ========================================= */

  const rankings =
    data as LiveRankings;

  const individual =
    rankings?.individual ?? [];

  const schools =
    rankings?.schools ?? [];

  const overall =
    rankings?.overall ?? [];

  const grandmasters =
    rankings?.grandmasters ?? [];


  /* ========================================= */
  /* KIRAAN STATISTIK */
  /* ========================================= */

  const totalSchools =
    schools.length;

  const totalParticipants =
    overall.length + grandmasters.length;

  const totalTodayPages =
    individual.reduce(
      (total, participant) =>
        total + (participant.pages_today ?? 0),
      0
    );

  const totalOverallPages =
    overall.reduce(
      (total, participant) =>
        total + (participant.current_page ?? 0),
      0
    ) +
    grandmasters.length * 604;

  const totalGrandmasters =
    grandmasters.length;

  const topParticipant =
    overall.length > 0
      ? overall[0]
      : null;


  /* ========================================= */
  /* PAGE */
  /* ========================================= */

  return (
    <main className="min-h-screen bg-slate-950 text-white">


      {/* ===================================== */}
      {/* HEADER */}
      {/* ===================================== */}

      <header className="border-b border-white/10 bg-slate-900">

        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">

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

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">


        {/* TAJUK */}

        <div className="mb-10">

          <p className="font-semibold text-emerald-400">
            ASSALAMUALAIKUM 👋
          </p>

          <h2 className="mt-2 text-3xl font-black sm:text-4xl">
            Dashboard Generasi MADANI Khatam Al-Quran PPD Machang
          </h2>

          <p className="mt-2 text-sm text-slate-400 sm:text-base">
            Ringkasan program bacaan Al-Quran semua sekolah.
          </p>

          {rankings?.date && (
            <p className="mt-3 text-sm text-slate-500">
              📅 Data setakat {formatDate(rankings.date)}
            </p>
          )}

        </div>


        {/* =================================== */}
        {/* STATISTIK UTAMA */}
        {/* =================================== */}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">


          {/* SEKOLAH */}

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">

            <div className="mb-4 text-4xl">
              🏫
            </div>

            <p className="text-sm text-slate-400">
              Jumlah Sekolah
            </p>

            <p className="mt-1 text-4xl font-black">
              {totalSchools}
            </p>

            <p className="mt-1 text-sm text-blue-400">
              sekolah aktif
            </p>

          </div>


          {/* PESERTA */}

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">

            <div className="mb-4 text-4xl">
              👨‍🎓
            </div>

            <p className="text-sm text-slate-400">
              Jumlah Peserta
            </p>

            <p className="mt-1 text-4xl font-black">
              {totalParticipants}
            </p>

            <p className="mt-1 text-sm text-emerald-400">
              peserta aktif
            </p>

          </div>


          {/* BACAAN HARI INI */}

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">

            <div className="mb-4 text-4xl">
              🔥
            </div>

            <p className="text-sm text-slate-400">
              Bacaan Hari Ini
            </p>

            <p className="mt-1 text-4xl font-black">
              {totalTodayPages.toLocaleString()}
            </p>

            <p className="mt-1 text-sm text-emerald-400">
              muka surat
            </p>

          </div>


          {/* GRANDMASTER */}

          <div className="rounded-3xl border border-yellow-500/20 bg-slate-900 p-6">

            <div className="mb-4 text-4xl">
              👑
            </div>

            <p className="text-sm text-slate-400">
              Grandmaster
            </p>

            <p className="mt-1 text-4xl font-black text-yellow-400">
              {totalGrandmasters}
            </p>

            <p className="mt-1 text-sm text-yellow-500">
              telah khatam
            </p>

          </div>

        </div>


        {/* =================================== */}
        {/* KEMAJUAN */}
        {/* =================================== */}

        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">


          {/* PESERTA TERATAS */}

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-7">

            <div className="text-5xl">
              🏆
            </div>

            <p className="mt-5 text-sm text-slate-400">
              Kemajuan Keseluruhan
            </p>


            {topParticipant ? (

              <>

                <p className="mt-2 text-2xl font-black">
                  {topParticipant.participant_name}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  {topParticipant.school_name}
                </p>

                <p className="mt-3 text-xl font-black text-emerald-400">
                  {topParticipant.current_page} / 604 muka surat
                </p>


                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">

                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (topParticipant.current_page / 604) * 100
                      )}%`,
                    }}
                  />

                </div>

              </>

            ) : (

              <p className="mt-2 text-slate-500">
                Belum ada peserta.
              </p>

            )}

          </div>


          {/* JUMLAH KEMAJUAN */}

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-7">

            <div className="text-5xl">
              📖
            </div>

            <p className="mt-5 text-sm text-slate-400">
              Jumlah Kemajuan Semua Peserta
            </p>

            <p className="mt-2 text-3xl font-black text-emerald-400">
              {totalOverallPages.toLocaleString()}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              muka surat keseluruhan
            </p>


            <div className="mt-6 grid grid-cols-2 gap-3">


              <div className="rounded-2xl bg-slate-800 p-4">

                <p className="text-xs text-slate-500">
                  Belum Khatam
                </p>

                <p className="mt-1 text-xl font-black">
                  {overall.length}
                </p>

                <p className="text-xs text-slate-500">
                  peserta
                </p>

              </div>


              <div className="rounded-2xl bg-yellow-500/10 p-4">

                <p className="text-xs text-yellow-500">
                  Grandmaster
                </p>

                <p className="mt-1 text-xl font-black text-yellow-400">
                  {grandmasters.length}
                </p>

                <p className="text-xs text-yellow-500">
                  peserta
                </p>

              </div>


            </div>

          </div>

        </div>


        {/* =================================== */}
        {/* RANKING SEKOLAH RINGKAS */}
        {/* =================================== */}

        <div className="mt-10 rounded-3xl border border-white/10 bg-slate-900 p-7">

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

            <div className="mt-6 space-y-3">

              {schools.slice(0, 5).map((school) => (

                <div
                  key={`${school.position}-${school.school_name}`}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-800 px-5 py-4"
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
        {/* GRANDMASTER TERKINI */}
        {/* =================================== */}

        {grandmasters.length > 0 && (

          <div className="mt-10 rounded-3xl border border-yellow-500/20 bg-yellow-500/5 p-7">

            <div className="flex items-center justify-between gap-4">

              <div>

                <p className="font-bold text-yellow-400">
                  👑 PENCAPAIAN
                </p>

                <h3 className="mt-1 text-2xl font-black">
                  Grandmaster
                </h3>

              </div>


              <Link
                href="/ranking"
                className="text-sm font-bold text-yellow-400 hover:text-yellow-300"
              >
                Lihat semua →
              </Link>

            </div>


            <div className="mt-6 grid gap-3 md:grid-cols-2">

              {grandmasters.slice(0, 4).map((student) => (

                <div
                  key={`${student.participant_name}-${student.school_name}`}
                  className="flex items-center gap-4 rounded-2xl border border-yellow-500/10 bg-slate-900 p-4"
                >

                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-800">

                    {student.photo_url ? (

                      <img
                        src={student.photo_url}
                        alt={student.participant_name}
                        className="h-full w-full object-cover"
                      />

                    ) : (

                      <div className="flex h-full w-full items-center justify-center text-2xl">
                        👤
                      </div>

                    )}

                  </div>


                  <div className="min-w-0">

                    <p className="truncate font-bold">
                      {student.participant_name}
                    </p>

                    <p className="truncate text-sm text-slate-500">
                      {student.school_name}
                    </p>

                  </div>


                  <div className="ml-auto text-2xl">
                    👑
                  </div>

                </div>

              ))}

            </div>

          </div>

        )}


        {/* =================================== */}
        {/* MENU UTAMA */}
        {/* =================================== */}

        <div className="mt-12">

          <h3 className="mb-5 text-xl font-bold">
            Menu Utama
          </h3>


          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">


            {/* PENGISIAN */}

            <Link
              href="/guru"
              className="group rounded-3xl border border-white/10 bg-slate-900 p-7 transition hover:border-emerald-400/50 hover:bg-slate-800"
            >

              <div className="mb-5 text-5xl">
                📖
              </div>

              <h3 className="text-2xl font-bold">
                Pengisian Bacaan
              </h3>

              <p className="mt-2 text-slate-400">
                Pilih kumpulan dan masukkan bacaan semua
                peserta secara pukal.
              </p>

              <div className="mt-6 font-semibold text-emerald-400">
                Buka Pengisian →
              </div>

            </Link>


            {/* DAFTAR MURID */}

            <Link
              href="/guru/daftar-murid"
              className="group rounded-3xl border border-white/10 bg-slate-900 p-7 transition hover:border-blue-400/50 hover:bg-slate-800"
            >

              <div className="mb-5 text-5xl">
                ➕
              </div>

              <h3 className="text-2xl font-bold">
                Daftar Murid
              </h3>

              <p className="mt-2 text-slate-400">
                Daftarkan murid baharu, pilih sekolah,
                kumpulan, muka surat permulaan dan gambar.
              </p>

              <div className="mt-6 font-semibold text-blue-400">
                Buka Pendaftaran →
              </div>

            </Link>


            {/* RANKING */}

            <Link
              href="/ranking"
              className="group rounded-3xl border border-white/10 bg-slate-900 p-7 transition hover:border-yellow-400/50 hover:bg-slate-800"
            >

              <div className="mb-5 text-5xl">
                🏆
              </div>

              <h3 className="text-2xl font-bold">
                Ranking Live
              </h3>

              <p className="mt-2 text-slate-400">
                Lihat ranking bacaan harian, kemajuan
                keseluruhan dan Grandmaster.
              </p>

              <div className="mt-6 font-semibold text-yellow-400">
                Lihat Ranking →
              </div>

            </Link>

          </div>

        </div>


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