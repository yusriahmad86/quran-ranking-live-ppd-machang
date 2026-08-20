import Link from "next/link";
import { supabase } from "@/lib/supabase";
import LogoutButton from "./LogoutButton";

export default async function DashboardPage() {
  // Dapatkan jumlah kelas
  const { count: totalClasses, error: classError } =
    await supabase
      .from("classes")
      .select("*", {
        count: "exact",
        head: true,
      });

  // Dapatkan semua murid
  const { data: students, error: studentsError } =
    await supabase
      .from("students")
      .select("id, name, current_page")
      .order("current_page", {
        ascending: false,
        nullsFirst: false,
      });

  // Jika ada ralat
  if (classError || studentsError) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-10">

        <h1 className="text-3xl font-bold text-red-400">
          Ralat mendapatkan data dashboard
        </h1>

        {classError && (
          <p className="mt-4 text-slate-300">
            Ralat kelas: {classError.message}
          </p>
        )}

        {studentsError && (
          <p className="mt-2 text-slate-300">
            Ralat murid: {studentsError.message}
          </p>
        )}

      </main>
    );
  }

  const totalStudents = students?.length ?? 0;

  const totalPages =
    students?.reduce(
      (total, student) =>
        total + (student.current_page ?? 0),
      0
    ) ?? 0;

  const topStudent = students?.[0] ?? null;

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}
      <header className="border-b border-white/10 bg-slate-900">

        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">

          <div>
            <h1 className="text-xl font-black">
              📖 QURAN RANKING{" "}
              <span className="text-emerald-400">
                LIVE
              </span>
            </h1>

            <p className="text-xs text-slate-400 mt-1">
              SK AYER MERAH
            </p>
          </div>

          <LogoutButton />

        </div>

      </header>

      {/* CONTENT */}
      <section className="max-w-6xl mx-auto px-6 py-10">

        {/* WELCOME */}
        <div className="mb-10">

          <p className="text-emerald-400 font-semibold">
            ASSALAMUALAIKUM 👋
          </p>

          <h2 className="text-4xl font-black mt-2">
            Dashboard Guru
          </h2>

          <p className="text-slate-400 mt-2">
            Ringkasan Quran Ranking Live
          </p>

        </div>

        {/* STATISTIK */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

          {/* MURID */}
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">

            <div className="text-4xl mb-4">
              👨‍🎓
            </div>

            <p className="text-sm text-slate-400">
              Jumlah Murid
            </p>

            <p className="text-4xl font-black mt-1">
              {totalStudents}
            </p>

          </div>

          {/* KELAS */}
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">

            <div className="text-4xl mb-4">
              🏫
            </div>

            <p className="text-sm text-slate-400">
              Jumlah Kelas
            </p>

            <p className="text-4xl font-black mt-1">
              {totalClasses ?? 0}
            </p>

          </div>

          {/* MUKA SURAT */}
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">

            <div className="text-4xl mb-4">
              📖
            </div>

            <p className="text-sm text-slate-400">
              Jumlah Muka Surat
            </p>

            <p className="text-4xl font-black mt-1">
              {totalPages.toLocaleString()}
            </p>

          </div>

          {/* RANKING TERATAS */}
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">

            <div className="text-4xl mb-4">
              🏆
            </div>

            <p className="text-sm text-slate-400">
              Ranking Teratas
            </p>

            {topStudent ? (

              <>
                <p className="text-lg font-black mt-2 truncate">
                  {topStudent.name}
                </p>

                <p className="text-sm text-emerald-400 mt-1">
                  {topStudent.current_page ?? 0} / 604 muka surat
                </p>
              </>

            ) : (

              <p className="text-slate-500 mt-2">
                Tiada data
              </p>

            )}

          </div>

        </div>

        {/* MENU */}
        <div className="mt-12">

          <h3 className="text-xl font-bold mb-5">
            Menu Utama
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* PENGISIAN */}
            <Link
              href="/guru"
              className="group rounded-3xl border border-white/10 bg-slate-900 p-7 hover:bg-slate-800 hover:border-emerald-400/50 transition"
            >

              <div className="text-5xl mb-5">
                📖
              </div>

              <h3 className="text-2xl font-bold">
                Pengisian Bacaan
              </h3>

              <p className="text-slate-400 mt-2">
                Pilih kelas dan kemas kini bacaan
                Al-Quran murid.
              </p>

              <div className="mt-6 text-emerald-400 font-semibold">
                Buka Pengisian →
              </div>

            </Link>

            {/* RANKING */}
            <Link
              href="/ranking"
              className="group rounded-3xl border border-white/10 bg-slate-900 p-7 hover:bg-slate-800 hover:border-yellow-400/50 transition"
            >

              <div className="text-5xl mb-5">
                🏆
              </div>

              <h3 className="text-2xl font-bold">
                Ranking Live
              </h3>

              <p className="text-slate-400 mt-2">
                Lihat kedudukan bacaan Al-Quran
                murid secara langsung.
              </p>

              <div className="mt-6 text-yellow-400 font-semibold">
                Lihat Ranking →
              </div>

            </Link>

          </div>

        </div>

        {/* INFO */}
        <div className="mt-8 rounded-3xl border border-emerald-500/10 bg-emerald-500/5 p-6">

          <div className="flex gap-4">

            <div className="text-3xl">
              💡
            </div>

            <div>

              <h3 className="font-bold">
                Quran Ranking Live
              </h3>

              <p className="text-sm text-slate-400 mt-1">
                Setiap kemas kini bacaan murid akan
                mempengaruhi ranking secara langsung.
              </p>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}