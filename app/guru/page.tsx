import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

function getLevel(page: number) {
  if (page === 604) return "GRANDMASTER";
  if (page >= 401) return "HEROIC";
  if (page >= 301) return "DIAMOND";
  if (page >= 201) return "PLATINUM";
  if (page >= 101) return "GOLD";
  if (page >= 51) return "SILVER";
  return "BRONZE";
}

function getLevelIcon(level: string) {
  switch (level) {
    case "GRANDMASTER":
      return "👑";
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

export default async function GuruDashboard() {
  await requireAuth();

  // =========================
  // DATA KELAS
  // =========================

  const { data: classes, error: classesError } =
    await supabase
      .from("classes")
      .select("id, name")
      .order("name");

  // =========================
  // DATA MURID
  // =========================

  const { data: students, error: studentsError } =
    await supabase
      .from("students")
      .select(
        "id, name, photo_url, current_page, class_id"
      )
      .order("current_page", {
        ascending: false,
      });

  // =========================
  // RALAT KELAS
  // =========================

  if (classesError) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-10">
        <h1 className="text-2xl font-bold text-red-400">
          Ralat mendapatkan kelas
        </h1>

        <p className="mt-4 text-slate-400">
          {classesError.message}
        </p>
      </main>
    );
  }

  // =========================
  // RALAT MURID
  // =========================

  if (studentsError) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-10">
        <h1 className="text-2xl font-bold text-red-400">
          Ralat mendapatkan murid
        </h1>

        <p className="mt-4 text-slate-400">
          {studentsError.message}
        </p>
      </main>
    );
  }

  // =========================
  // STATISTIK
  // =========================

  const totalStudents = students?.length ?? 0;

  const totalClasses = classes?.length ?? 0;

  const activeStudents =
    students?.filter(
      (student) =>
        (student.current_page ?? 0) > 0
    ).length ?? 0;

  const completedStudents =
    students?.filter(
      (student) =>
        (student.current_page ?? 0) === 604
    ).length ?? 0;

  const totalPages =
    students?.reduce(
      (total, student) =>
        total + (student.current_page ?? 0),
      0
    ) ?? 0;

  const averagePage =
    totalStudents > 0
      ? Math.round(
          totalPages / totalStudents
        )
      : 0;

  const averagePercentage = Math.min(
    100,
    Math.round(
      (averagePage / 604) * 100
    )
  );

  // =========================
  // MURID TERATAS
  // =========================

  const topStudent =
    students?.[0] ?? null;

  // =========================
  // JUMLAH MURID DALAM KELAS
  // =========================

  function getClassStudentCount(
    classId: string
  ) {
    return (
      students?.filter(
        (student) =>
          student.class_id === classId
      ).length ?? 0
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* ================================================= */}
      {/* HEADER / NAVIGATION */}
      {/* ================================================= */}

      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">

        <div className="max-w-7xl mx-auto px-6">

          <div className="h-20 flex items-center justify-between">

            {/* LOGO */}

            <Link
              href="/guru"
              className="flex items-center gap-3"
            >

              <div className="w-11 h-11 rounded-2xl bg-emerald-500 flex items-center justify-center text-2xl">
                📖
              </div>

              <div className="hidden sm:block">

                <div className="font-black tracking-tight">
                  QURAN RANKING{" "}
                  <span className="text-emerald-400">
                    LIVE
                  </span>
                </div>

                <div className="text-xs text-slate-500">
                  SK AYER MERAH
                </div>

              </div>

            </Link>

            {/* NAVIGATION */}

            <nav className="flex items-center gap-2">

              {/* DASHBOARD */}

              <Link
                href="/guru"
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white"
              >
                🏠 Dashboard
              </Link>

              {/* RANKING - TAB BARU */}

              <Link
                href="/ranking"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-400 hover:bg-white/5 hover:text-white transition"
              >
                🏆 Ranking
              </Link>

              {/* TAMBAH MURID */}

              <Link
                href="/guru/tambah-murid"
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition"
              >
                <span className="hidden sm:inline">
                  ➕ Tambah Murid
                </span>

                <span className="sm:hidden">
                  ➕
                </span>
              </Link>

            </nav>

          </div>

        </div>

      </header>

      {/* ================================================= */}
      {/* HERO */}
      {/* ================================================= */}

      <section className="max-w-7xl mx-auto px-6 pt-12">

        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-8 md:p-10">

          <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative">

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-400">

              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />

              SISTEM AKTIF

            </div>

            <p className="text-emerald-400 font-semibold mt-6">
              ASSALAMUALAIKUM 👋
            </p>

            <h1 className="text-4xl md:text-5xl font-black tracking-tight mt-2">
              Dashboard Guru
            </h1>

            <p className="max-w-2xl text-slate-400 mt-4 text-base md:text-lg">
              Pantau perkembangan bacaan Al-Quran
              murid SK Ayer Merah secara langsung
              dan tersusun.
            </p>

            <div className="flex flex-wrap gap-3 mt-7">

              {/* RANKING - TAB BARU */}

              <Link
                href="/ranking"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-yellow-500 hover:bg-yellow-400 px-5 py-3 font-bold text-slate-950 transition"
              >
                🏆 Lihat Ranking Live
              </Link>

              {/* TAMBAH MURID */}

              <Link
                href="/guru/tambah-murid"
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-5 py-3 font-semibold transition"
              >
                ➕ Tambah Murid
              </Link>

            </div>

          </div>

        </div>

      </section>

      {/* ================================================= */}
      {/* STATISTIK */}
      {/* ================================================= */}

      <section className="max-w-7xl mx-auto px-6 mt-8">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* JUMLAH MURID */}

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-5">

            <div className="flex justify-between items-start">

              <div className="w-11 h-11 rounded-2xl bg-blue-500/10 flex items-center justify-center text-2xl">
                👨‍🎓
              </div>

              <span className="text-xs text-slate-500">
                MURID
              </span>

            </div>

            <div className="text-3xl md:text-4xl font-black mt-5">
              {totalStudents}
            </div>

            <p className="text-sm text-slate-500 mt-1">
              Jumlah murid
            </p>

          </div>

          {/* AKTIF */}

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-5">

            <div className="flex justify-between items-start">

              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-2xl">
                📖
              </div>

              <span className="text-xs text-slate-500">
                AKTIF
              </span>

            </div>

            <div className="text-3xl md:text-4xl font-black text-emerald-400 mt-5">
              {activeStudents}
            </div>

            <p className="text-sm text-slate-500 mt-1">
              Sudah membaca
            </p>

          </div>

          {/* TAMAT */}

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-5">

            <div className="flex justify-between items-start">

              <div className="w-11 h-11 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-2xl">
                🏆
              </div>

              <span className="text-xs text-slate-500">
                TAMAT
              </span>

            </div>

            <div className="text-3xl md:text-4xl font-black text-yellow-400 mt-5">
              {completedStudents}
            </div>

            <p className="text-sm text-slate-500 mt-1">
              Mencapai 604
            </p>

          </div>

          {/* KELAS */}

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-5">

            <div className="flex justify-between items-start">

              <div className="w-11 h-11 rounded-2xl bg-purple-500/10 flex items-center justify-center text-2xl">
                🏫
              </div>

              <span className="text-xs text-slate-500">
                KELAS
              </span>

            </div>

            <div className="text-3xl md:text-4xl font-black text-purple-400 mt-5">
              {totalClasses}
            </div>

            <p className="text-sm text-slate-500 mt-1">
              Kelas berdaftar
            </p>

          </div>

        </div>

      </section>

      {/* ================================================= */}
      {/* ANALISIS PRESTASI */}
      {/* ================================================= */}

      <section className="max-w-7xl mx-auto px-6 mt-8">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* MURID TERATAS */}

          <div className="rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-slate-900 p-6">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-bold text-yellow-400">
                  🥇 PRESTASI TERATAS
                </p>

                <h2 className="text-2xl font-black mt-2">
                  Murid Teratas
                </h2>

              </div>

              {/* RANKING - TAB BARU */}

              <Link
                href="/ranking"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-yellow-400 hover:text-yellow-300"
              >
                Ranking →
              </Link>

            </div>

            {topStudent ? (

              <div className="flex items-center gap-5 mt-7">

                <div className="w-20 h-20 rounded-3xl overflow-hidden bg-slate-800 border border-yellow-400/20 flex-shrink-0">

                  {topStudent.photo_url ? (
                    <img
                      src={topStudent.photo_url}
                      alt={topStudent.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      👤
                    </div>
                  )}

                </div>

                <div className="flex-1 min-w-0">

                  <p className="text-xs text-yellow-400 font-bold">
                    RANK #1
                  </p>

                  <h3 className="text-xl font-black truncate mt-1">
                    {topStudent.name}
                  </h3>

                  <p className="text-sm text-slate-400 mt-1">

                    {getLevelIcon(
                      getLevel(
                        topStudent.current_page ?? 0
                      )
                    )}

                    {" "}

                    {getLevel(
                      topStudent.current_page ?? 0
                    )}

                  </p>

                </div>

                <div className="text-right">

                  <div className="text-3xl font-black">
                    {topStudent.current_page ?? 0}
                  </div>

                  <div className="text-xs text-slate-500">
                    / 604
                  </div>

                </div>

              </div>

            ) : (

              <p className="text-slate-500 mt-6">
                Belum ada data murid.
              </p>

            )}

          </div>

          {/* PURATA */}

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-bold text-emerald-400">
                  📊 PRESTASI KESELURUHAN
                </p>

                <h2 className="text-2xl font-black mt-2">
                  Purata Bacaan
                </h2>

              </div>

              <div className="text-3xl">
                📖
              </div>

            </div>

            <div className="flex items-end gap-2 mt-8">

              <span className="text-5xl font-black">
                {averagePage}
              </span>

              <span className="text-slate-500 mb-2">
                / 604
              </span>

            </div>

            <div className="flex justify-between text-xs mt-4">

              <span className="text-slate-500">
                Kemajuan keseluruhan
              </span>

              <span className="text-emerald-400 font-bold">
                {averagePercentage}%
              </span>

            </div>

            <div className="h-3 rounded-full bg-slate-800 overflow-hidden mt-2">

              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{
                  width: `${averagePercentage}%`,
                }}
              />

            </div>

            <p className="text-xs text-slate-600 mt-4">
              Jumlah keseluruhan:{" "}
              {totalPages.toLocaleString()} muka surat
            </p>

          </div>

        </div>

      </section>

      {/* ================================================= */}
      {/* SENARAI KELAS */}
      {/* ================================================= */}

      <section className="max-w-7xl mx-auto px-6 mt-10 pb-12">

        <div className="flex items-end justify-between mb-5">

          <div>

            <p className="text-xs font-bold text-emerald-400">
              PENGURUSAN
            </p>

            <h2 className="text-2xl md:text-3xl font-black mt-1">
              🏫 Kelas Anda
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Pilih kelas untuk pengisian bacaan murid.
            </p>

          </div>

          {/* RANKING - TAB BARU */}

          <Link
            href="/ranking"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:block text-sm text-emerald-400 hover:text-emerald-300"
          >
            🏆 Ranking Live →
          </Link>

        </div>

        {classes && classes.length > 0 ? (

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

            {classes.map((item) => {

              const count =
                getClassStudentCount(item.id);

              return (
                <div
                  key={item.id}
                  className="group rounded-3xl border border-white/10 bg-slate-900 p-6 hover:border-emerald-400/40 hover:bg-slate-800/70 transition"
                >

                  <div className="flex items-center justify-between">

                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-2xl">
                      🏫
                    </div>

                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
                      {count} murid
                    </span>

                  </div>

                  <h3 className="text-xl font-black mt-6">
                    {item.name}
                  </h3>

                  <p className="text-sm text-slate-500 mt-1">
                    Senarai murid dan pengisian bacaan
                  </p>

                  <Link
                    href={`/guru/kelas/${item.id}`}
                    className="mt-6 flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 py-3 font-bold text-slate-950 transition"
                  >
                    📖 Buka Pengisian

                    <span className="group-hover:translate-x-1 transition">
                      →
                    </span>

                  </Link>

                </div>
              );
            })}

          </div>

        ) : (

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-10 text-center">

            <div className="text-5xl">
              🏫
            </div>

            <h3 className="text-xl font-bold mt-4">
              Tiada kelas
            </h3>

            <p className="text-slate-500 mt-2">
              Belum ada kelas berdaftar.
            </p>

          </div>

        )}

      </section>

      {/* ================================================= */}
      {/* FOOTER */}
      {/* ================================================= */}

      <footer className="border-t border-white/10 bg-slate-900">

        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">

          <p className="text-xs text-slate-600">
            © 2026 QURAN RANKING LIVE · SK AYER MERAH
          </p>

          <p className="text-xs text-slate-600">
            Sistem Pemantauan Bacaan Al-Quran
          </p>

        </div>

      </footer>

    </main>
  );
}