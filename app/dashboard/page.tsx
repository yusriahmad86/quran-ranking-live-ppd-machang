import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
  });

  const [schoolsResult, participantsResult, todayRecordsResult] =
    await Promise.all([
      supabase.from("schools").select("*", {
        count: "exact",
        head: true,
      }),

      supabase
        .from("participants")
        .select("id, name, current_page, grandmaster_at")
        .order("current_page", {
          ascending: false,
          nullsFirst: false,
        }),

      supabase
        .from("reading_records")
        .select("pages_read")
        .eq("reading_date", today)
        .is("voided_at", null)
        .eq("is_baseline", false),
    ]);

  const { count: totalSchools, error: schoolsError } = schoolsResult;
  const { data: participants, error: participantsError } =
    participantsResult;
  const { data: todayRecords, error: todayRecordsError } =
    todayRecordsResult;

  if (schoolsError || participantsError || todayRecordsError) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        <h1 className="text-3xl font-bold text-red-400">
          Ralat mendapatkan data dashboard
        </h1>

        {schoolsError && (
          <p className="mt-4 text-slate-300">
            Ralat sekolah: {schoolsError.message}
          </p>
        )}

        {participantsError && (
          <p className="mt-2 text-slate-300">
            Ralat peserta: {participantsError.message}
          </p>
        )}

        {todayRecordsError && (
          <p className="mt-2 text-slate-300">
            Ralat bacaan hari ini: {todayRecordsError.message}
          </p>
        )}
      </main>
    );
  }

  const totalParticipants = participants?.length ?? 0;

  const totalOverallPages =
    participants?.reduce(
      (total, participant) =>
        total + (participant.current_page ?? 0),
      0
    ) ?? 0;

  const totalTodayPages =
    todayRecords?.reduce(
      (total, record) =>
        total + (record.pages_read ?? 0),
      0
    ) ?? 0;

  const topParticipant = participants?.[0] ?? null;

  const totalGrandmasters =
    participants?.filter(
      (participant) => participant.grandmaster_at
    ).length ?? 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}

      <header className="border-b border-white/10 bg-slate-900">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">

          <div>
            <h1 className="text-xl font-black">
              📖 QURAN RANKING{" "}
              <span className="text-emerald-400">
                LIVE
              </span>
            </h1>

            <p className="mt-1 text-xs text-slate-400">
              PROGRAM KHATAM MURID · PPD MACHANG
            </p>
          </div>

          <Link
            href="/ranking"
            className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-sm font-bold text-yellow-400 transition hover:bg-yellow-400/20"
          >
            🏆 Ranking Live
          </Link>

        </div>

      </header>


      {/* CONTENT */}

      <section className="mx-auto max-w-6xl px-6 py-10">

        <div className="mb-10">

          <p className="font-semibold text-emerald-400">
            ASSALAMUALAIKUM 👋
          </p>

          <h2 className="mt-2 text-4xl font-black">
            Dashboard PPD Machang
          </h2>

          <p className="mt-2 text-slate-400">
            Ringkasan program bacaan Al-Quran semua sekolah.
          </p>

        </div>


        {/* STATISTIK */}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">

            <div className="mb-4 text-4xl">
              🏫
            </div>

            <p className="text-sm text-slate-400">
              Jumlah Sekolah
            </p>

            <p className="mt-1 text-4xl font-black">
              {totalSchools ?? 0}
            </p>

          </div>


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

          </div>


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


          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">

            <div className="mb-4 text-4xl">
              👑
            </div>

            <p className="text-sm text-slate-400">
              Grandmaster
            </p>

            <p className="mt-1 text-4xl font-black">
              {totalGrandmasters}
            </p>

          </div>

        </div>


        {/* KEMAJUAN */}

        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">

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
                  {topParticipant.name}
                </p>

                <p className="mt-1 text-emerald-400">
                  {topParticipant.current_page ?? 0} / 604 muka surat
                </p>
              </>
            ) : (
              <p className="mt-2 text-slate-500">
                Belum ada peserta.
              </p>
            )}

          </div>


          <div className="rounded-3xl border border-white/10 bg-slate-900 p-7">

            <div className="text-5xl">
              📖
            </div>

            <p className="mt-5 text-sm text-slate-400">
              Jumlah Kemajuan Semua Peserta
            </p>

            <p className="mt-2 text-2xl font-black">
              {totalOverallPages.toLocaleString()} muka surat
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Daripada sasaran 604 muka surat setiap peserta.
            </p>

          </div>

        </div>


        {/* MENU */}

        <div className="mt-12">

          <h3 className="mb-5 text-xl font-bold">
            Menu Utama
          </h3>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

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
                Pilih sekolah, pilih peserta, kemudian masukkan muka surat
                semasa.
              </p>

              <div className="mt-6 font-semibold text-emerald-400">
                Buka Pengisian →
              </div>

            </Link>


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
                Lihat ranking bacaan harian, kemajuan keseluruhan dan
                Grandmaster.
              </p>

              <div className="mt-6 font-semibold text-yellow-400">
                Lihat Ranking →
              </div>

            </Link>

          </div>

        </div>

      </section>

    </main>
  );
}