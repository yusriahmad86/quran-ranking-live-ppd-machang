import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export default async function GuruDashboard() {
  await requireAuth();

  // ==============================
  // DAPATKAN SENARAI KELAS
  // ==============================

  const { data: classes, error: classesError } =
    await supabase
      .from("classes")
      .select("id, name")
      .order("name");

  // ==============================
  // DAPATKAN SEMUA MURID
  // ==============================

  const { data: students, error: studentsError } =
    await supabase
      .from("students")
      .select(
        "id, name, photo_url, current_page, class_id"
      )
      .order("current_page", {
        ascending: false,
      });

  // ==============================
  // RALAT
  // ==============================

  if (classesError) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-10">

        <h1 className="text-3xl font-bold text-red-400">
          Ralat mendapatkan kelas
        </h1>

        <p className="mt-4 text-slate-300">
          {classesError.message}
        </p>

      </main>
    );
  }

  if (studentsError) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-10">

        <h1 className="text-3xl font-bold text-red-400">
          Ralat mendapatkan murid
        </h1>

        <p className="mt-4 text-slate-300">
          {studentsError.message}
        </p>

      </main>
    );
  }

  // ==============================
  // STATISTIK
  // ==============================

  const totalClasses = classes?.length ?? 0;

  const totalStudents = students?.length ?? 0;

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
      ? Math.round(totalPages / totalStudents)
      : 0;

  // ==============================
  // MURID TERATAS
  // ==============================

  const topStudent = students?.[0] ?? null;

  // ==============================
  // JUMLAH MURID SETIAP KELAS
  // ==============================

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

      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <header className="border-b border-white/10 bg-slate-900">

        <div className="max-w-7xl mx-auto px-6 py-5">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div>

              <h1 className="text-2xl font-black">
                QURAN RANKING{" "}
                <span className="text-emerald-400">
                  LIVE
                </span>
              </h1>

              <p className="text-sm text-slate-400 mt-1">
                Dashboard Guru · SK AYER MERAH
              </p>

            </div>

            {/* NAVIGATION */}

            <div className="flex flex-wrap gap-3">

              <Link
                href="/ranking"
                className="rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-4 py-2 transition"
              >
                🏆 Ranking Live
              </Link>

              <Link
                href="/guru/tambah-murid"
                className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 transition"
              >
                ➕ Tambah Murid
              </Link>

            </div>

          </div>

        </div>

      </header>

      {/* ================================= */}
      {/* CONTENT */}
      {/* ================================= */}

      <section className="max-w-7xl mx-auto px-6 py-10">

        {/* UCAPAN */}

        <div>

          <p className="text-emerald-400 font-semibold">
            ASSALAMUALAIKUM 👋
          </p>

          <h2 className="text-4xl font-black mt-2">
            Dashboard Guru
          </h2>

          <p className="text-slate-400 mt-3">
            Pantau perkembangan bacaan Al-Quran
            murid secara langsung.
          </p>

        </div>

        {/* ================================= */}
        {/* STATISTIK */}
        {/* ================================= */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">

          {/* JUMLAH MURID */}

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-400">
                  Jumlah Murid
                </p>

                <div className="text-4xl font-black mt-2">
                  {totalStudents}
                </div>

              </div>

              <div className="text-4xl">
                👨‍🎓
              </div>

            </div>

            <p className="text-xs text-slate-500 mt-4">
              Semua murid berdaftar
            </p>

          </div>

          {/* MURID AKTIF */}

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-400">
                  Murid Aktif Membaca
                </p>

                <div className="text-4xl font-black text-emerald-400 mt-2">
                  {activeStudents}
                </div>

              </div>

              <div className="text-4xl">
                📖
              </div>

            </div>

            <p className="text-xs text-slate-500 mt-4">
              Muka surat melebihi 0
            </p>

          </div>

          {/* TAMAT 604 */}

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-400">
                  Tamat Al-Quran
                </p>

                <div className="text-4xl font-black text-yellow-400 mt-2">
                  {completedStudents}
                </div>

              </div>

              <div className="text-4xl">
                🏆
              </div>

            </div>

            <p className="text-xs text-slate-500 mt-4">
              Mencapai muka surat 604
            </p>

          </div>

          {/* KELAS */}

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-400">
                  Jumlah Kelas
                </p>

                <div className="text-4xl font-black text-blue-400 mt-2">
                  {totalClasses}
                </div>

              </div>

              <div className="text-4xl">
                🏫
              </div>

            </div>

            <p className="text-xs text-slate-500 mt-4">
              Kelas yang didaftarkan
            </p>

          </div>

        </div>

        {/* ================================= */}
        {/* STATISTIK TAMBAHAN */}
        {/* ================================= */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">

          {/* PURATA */}

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">
              📊 Purata Bacaan Murid
            </p>

            <div className="flex items-end gap-2 mt-2">

              <span className="text-4xl font-black">
                {averagePage}
              </span>

              <span className="text-slate-500 mb-1">
                / 604 muka surat
              </span>

            </div>

            <div className="mt-4 h-3 rounded-full bg-slate-800 overflow-hidden">

              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      (averagePage / 604) * 100
                    )
                  )}%`,
                }}
              />

            </div>

          </div>

          {/* JUMLAH MUKA SURAT */}

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">

            <p className="text-sm text-slate-400">
              📚 Jumlah Muka Surat Dibaca
            </p>

            <div className="text-4xl font-black mt-2">
              {totalPages.toLocaleString()}
            </div>

            <p className="text-xs text-slate-500 mt-3">
              Jumlah keseluruhan bacaan semua murid
            </p>

          </div>

        </div>

        {/* ================================= */}
        {/* MURID TERATAS */}
        {/* ================================= */}

        {topStudent && (
          <div className="mt-10">

            <div className="flex items-center justify-between mb-4">

              <div>

                <h2 className="text-2xl font-bold">
                  🥇 Murid Teratas
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Bacaan tertinggi ketika ini
                </p>

              </div>

              <Link
                href="/ranking"
                className="text-sm text-emerald-400 hover:text-emerald-300"
              >
                Lihat Ranking →
              </Link>

            </div>

            <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/5 p-6">

              <div className="flex items-center gap-5">

                {/* FOTO */}

                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-800 flex-shrink-0 flex items-center justify-center">

                  {topStudent.photo_url ? (
                    <img
                      src={topStudent.photo_url}
                      alt={topStudent.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl">
                      👤
                    </span>
                  )}

                </div>

                {/* INFO */}

                <div className="flex-1 min-w-0">

                  <p className="text-xs text-yellow-400 font-bold">
                    🥇 RANKING #1
                  </p>

                  <h3 className="text-xl font-black truncate mt-1">
                    {topStudent.name}
                  </h3>

                  <p className="text-sm text-slate-400 mt-1">
                    Bacaan Al-Quran
                  </p>

                </div>

                {/* PAGE */}

                <div className="text-right">

                  <div className="text-3xl font-black">
                    {topStudent.current_page ?? 0}
                  </div>

                  <div className="text-xs text-slate-500">
                    / 604
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

        {/* ================================= */}
        {/* SENARAI KELAS */}
        {/* ================================= */}

        <div className="mt-10">

          <div className="flex items-center justify-between mb-5">

            <div>

              <h2 className="text-2xl font-bold">
                🏫 Senarai Kelas
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Pilih kelas untuk pengisian bacaan.
              </p>

            </div>

          </div>

          {classes && classes.length > 0 ? (

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

              {classes.map((item) => {

                const studentCount =
                  getClassStudentCount(item.id);

                return (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-white/10 bg-slate-900 p-6 hover:border-emerald-400/40 transition"
                  >

                    <div className="flex items-start justify-between">

                      <div className="text-4xl">
                        🏫
                      </div>

                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
                        {studentCount} murid
                      </span>

                    </div>

                    <h3 className="text-xl font-bold mt-5">
                      {item.name}
                    </h3>

                    <p className="text-sm text-slate-500 mt-1">
                      Kelas
                    </p>

                    <Link
                      href={`/guru/kelas/${item.id}`}
                      className="mt-6 block w-full text-center rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 transition"
                    >
                      📖 Buka Pengisian
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

              <p className="text-slate-400 mt-2">
                Belum ada kelas didaftarkan.
              </p>

            </div>

          )}

        </div>

        {/* ================================= */}
        {/* QUICK ACTION */}
        {/* ================================= */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">

          <Link
            href="/guru/tambah-murid"
            className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 hover:bg-emerald-500/10 transition"
          >

            <div className="text-4xl">
              ➕
            </div>

            <h3 className="text-xl font-bold mt-4">
              Tambah Murid
            </h3>

            <p className="text-sm text-slate-400 mt-2">
              Daftarkan murid baharu ke dalam sistem.
            </p>

          </Link>

          <Link
            href="/ranking"
            className="rounded-3xl border border-yellow-500/20 bg-yellow-500/5 p-6 hover:bg-yellow-500/10 transition"
          >

            <div className="text-4xl">
              🏆
            </div>

            <h3 className="text-xl font-bold mt-4">
              QURAN RANKING LIVE
            </h3>

            <p className="text-sm text-slate-400 mt-2">
              Lihat ranking bacaan Al-Quran secara langsung.
            </p>

          </Link>

        </div>

      </section>

      {/* FOOTER */}

      <footer className="border-t border-white/10 bg-slate-900 mt-10">

        <div className="max-w-7xl mx-auto px-6 py-6 text-center">

          <p className="text-xs text-slate-600">
            © 2026 QURAN RANKING LIVE · SK AYER MERAH
          </p>

        </div>

      </footer>

    </main>
  );
}