"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type School = {
  id: string;
  name: string;
  code?: string | null;
};

type Participant = {
  id: string;
  name: string;
  school_id: string;
  group_number: number;
  current_page: number;
  grandmaster_at?: string | null;
  is_active?: boolean;
};

type ReadingRecord = {
  id: string;
  participant_id: string;
  page_from: number;
  page_to: number;
  pages_read: number;
  created_at: string;
  voided_at?: string | null;
  is_baseline: boolean;
};

type StudentAnalysis = Participant & {
  school_name: string;
  school_code: string;
  pages_today: number;
  has_read_today: boolean;
  level: string;
  level_icon: string;
  latest_reading?: ReadingRecord | null;
};

type SchoolAnalysis = {
  id: string;
  name: string;
  code: string;
  total: number;
  filled: number;
  notFilled: number;
  pages: number;
};

const MALAYSIA_TZ = "Asia/Kuala_Lumpur";

function getMalaysiaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MALAYSIA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getLevel(page: number) {
  if (page >= 604) {
    return {
      name: "GRANDMASTER",
      icon: "👑",
    };
  }

  if (page >= 401) {
    return {
      name: "HEROIC",
      icon: "⚔️",
    };
  }

  if (page >= 301) {
    return {
      name: "DIAMOND",
      icon: "💎",
    };
  }

  if (page >= 201) {
    return {
      name: "PLATINUM",
      icon: "💠",
    };
  }

  if (page >= 101) {
    return {
      name: "GOLD",
      icon: "🥇",
    };
  }

  if (page >= 51) {
    return {
      name: "SILVER",
      icon: "🥈",
    };
  }

  return {
    name: "BRONZE",
    icon: "🥉",
  };
}

function formatDateMalay(dateString: string) {
  if (!dateString) return "-";

  const date = new Date(`${dateString}T00:00:00+08:00`);

  return new Intl.DateTimeFormat("ms-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateTime(dateString: string) {
  if (!dateString) return "-";

  return new Intl.DateTimeFormat("ms-MY", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: MALAYSIA_TZ,
  }).format(new Date(dateString));
}

export default function AnalisaKeseluruhanPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<StudentAnalysis[]>([]);

  const [selectedDate, setSelectedDate] = useState(getMalaysiaDate());
  const [selectedSchool, setSelectedSchool] = useState("ALL");
  const [selectedLevel, setSelectedLevel] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadAnalysis();
  }, [selectedDate]);

  async function loadAnalysis() {
    try {
      setLoading(true);
      setError("");

      // =====================================================
      // LOAD SEKOLAH AKTIF
      // =====================================================

      const { data: schoolData, error: schoolError } =
        await supabase.rpc("get_active_schools");

      if (schoolError) {
        throw new Error(schoolError.message);
      }

      const activeSchools: School[] = (schoolData || []).map(
        (school: any) => ({
          id: school.id,
          name: school.name,
          code: school.code || "",
        })
      );

      setSchools(activeSchools);

      // =====================================================
      // LOAD SEMUA MURID AKTIF
      // =====================================================

      const { data: participantData, error: participantError } =
        await supabase
          .from("participants")
          .select(
            "id,name,school_id,group_number,current_page,grandmaster_at,is_active"
          )
          .eq("is_active", true)
          .order("name", { ascending: true });

      if (participantError) {
        throw new Error(participantError.message);
      }

      const participants: Participant[] = participantData || [];

      if (participants.length === 0) {
        setStudents([]);
        return;
      }

      const participantIds = participants.map(
        (student) => student.id
      );

      // =====================================================
      // LOAD REKOD BACAAN PADA TARIKH DIPILIH
      //
      // PENTING:
      // - Hanya tarikh yang dipilih
      // - Hanya rekod yang belum void
      // - Hanya rekod bacaan sebenar
      // - Baseline tidak dikira
      // - pages_read digunakan sebagai jumlah bacaan
      // =====================================================

      const {
        data: readingData,
        error: readingError,
      } = await supabase
        .from("reading_records")
        .select(
          "id,participant_id,page_from,page_to,pages_read,created_at,voided_at,is_baseline"
        )
        .in("participant_id", participantIds)
        .eq("reading_date", selectedDate)
        .is("voided_at", null)
        .eq("is_baseline", false)
        .order("created_at", {
          ascending: false,
        });

      if (readingError) {
        throw new Error(readingError.message);
      }

      const readings: ReadingRecord[] =
        readingData || [];

      // =====================================================
      // MAP SEKOLAH
      // =====================================================

      const schoolMap = new Map<string, School>();

      activeSchools.forEach((school) => {
        schoolMap.set(school.id, school);
      });

      // =====================================================
      // REKOD TERKINI SETIAP MURID
      // =====================================================

      const readingMap = new Map<
        string,
        ReadingRecord
      >();

      readings.forEach((reading) => {
        if (!readingMap.has(reading.participant_id)) {
          readingMap.set(
            reading.participant_id,
            reading
          );
        }
      });

      // =====================================================
      // ANALISA SETIAP MURID
      // =====================================================

      const studentResults: StudentAnalysis[] =
        participants.map((student) => {
          const school = schoolMap.get(
            student.school_id
          );

          const latestReading =
            readingMap.get(student.id) || null;

          const studentReadings =
            readings.filter(
              (reading) =>
                reading.participant_id === student.id
            );

          // =================================================
          // PENTING:
          // Gunakan pages_read.
          //
          // JANGAN guna:
          // page_to - page_from
          //
          // kerana page_from/page_to ialah kedudukan
          // muka surat, bukan jumlah bacaan harian.
          // =================================================

          const pagesToday =
            studentReadings.reduce(
              (total, reading) =>
                total +
                Number(reading.pages_read || 0),
              0
            );

          const level = getLevel(
            Number(student.current_page || 0)
          );

          return {
            ...student,
            school_name:
              school?.name || "Tidak diketahui",
            school_code: school?.code || "",
            pages_today: pagesToday,
            has_read_today:
              studentReadings.length > 0,
            level: level.name,
            level_icon: level.icon,
            latest_reading: latestReading,
          };
        });

      setStudents(studentResults);
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Gagal mendapatkan data analisa."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // TAPISAN
  // =====================================================

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const schoolMatch =
        selectedSchool === "ALL" ||
        student.school_id === selectedSchool;

      const levelMatch =
        selectedLevel === "ALL" ||
        student.level === selectedLevel;

      return schoolMatch && levelMatch;
    });
  }, [
    students,
    selectedSchool,
    selectedLevel,
  ]);

  // =====================================================
  // STATISTIK
  // =====================================================

  const statistics = useMemo(() => {
    // Jumlah semua murid aktif
    const total = students.length;

    // Murid yang mempunyai sekurang-kurangnya
    // satu rekod bacaan pada tarikh dipilih
    const filled = students.filter(
      (student) => student.has_read_today
    ).length;

    const notFilled = total - filled;

    // JUMLAH BACAAN HARI INI
    //
    // pages_today datang daripada pages_read
    // bagi tarikh yang dipilih sahaja.
    const pagesToday = students.reduce(
      (totalPages, student) =>
        totalPages + student.pages_today,
      0
    );

    // Jumlah kemajuan semasa semua murid.
    // Ini bukan digunakan untuk Bacaan Hari Ini.
    const totalCurrentPages = students.reduce(
      (totalPages, student) =>
        totalPages +
        Number(student.current_page || 0),
      0
    );

    // ===================================================
    // PURATA BACAAN
    //
    // WAJIB bahagi dengan SEMUA murid aktif.
    //
    // Contoh:
    // 950 muka surat / 100 murid = 9.5
    //
    // BUKAN:
    // 950 / 95 murid yang sudah isi
    // ===================================================

    const averagePages =
      total > 0 ? pagesToday / total : 0;

    const grandmaster = students.filter(
      (student) =>
        student.level === "GRANDMASTER"
    ).length;

    const heroic = students.filter(
      (student) =>
        student.level === "HEROIC"
    ).length;

    const diamond = students.filter(
      (student) =>
        student.level === "DIAMOND"
    ).length;

    const platinum = students.filter(
      (student) =>
        student.level === "PLATINUM"
    ).length;

    const gold = students.filter(
      (student) =>
        student.level === "GOLD"
    ).length;

    const silver = students.filter(
      (student) =>
        student.level === "SILVER"
    ).length;

    const bronze = students.filter(
      (student) =>
        student.level === "BRONZE"
    ).length;

    const completion =
      total > 0
        ? Math.round((filled / total) * 100)
        : 0;

    return {
      total,
      filled,
      notFilled,
      pagesToday,
      totalCurrentPages,
      averagePages,
      completion,
      grandmaster,
      heroic,
      diamond,
      platinum,
      gold,
      silver,
      bronze,
    };
  }, [students]);

  // =====================================================
  // ANALISA SEKOLAH
  // =====================================================

  const schoolAnalysis =
    useMemo<SchoolAnalysis[]>(() => {
      return schools
        .map((school) => {
          const schoolStudents =
            students.filter(
              (student) =>
                student.school_id === school.id
            );

          const filled =
            schoolStudents.filter(
              (student) =>
                student.has_read_today
            ).length;

          const pages =
            schoolStudents.reduce(
              (total, student) =>
                total + student.pages_today,
              0
            );

          return {
            id: school.id,
            name: school.name,
            code: school.code || "",
            total: schoolStudents.length,
            filled,
            notFilled:
              schoolStudents.length - filled,
            pages,
          };
        })
        .filter(
          (school) => school.total > 0
        )
        .sort((a, b) => {
          if (b.pages !== a.pages) {
            return b.pages - a.pages;
          }

          return b.filled - a.filled;
        });
    }, [schools, students]);

  // =====================================================
  // ANALISA LEVEL
  // =====================================================

  const levelAnalysis = [
    {
      name: "GRANDMASTER",
      icon: "👑",
      count: statistics.grandmaster,
    },
    {
      name: "HEROIC",
      icon: "⚔️",
      count: statistics.heroic,
    },
    {
      name: "DIAMOND",
      icon: "💎",
      count: statistics.diamond,
    },
    {
      name: "PLATINUM",
      icon: "💠",
      count: statistics.platinum,
    },
    {
      name: "GOLD",
      icon: "🥇",
      count: statistics.gold,
    },
    {
      name: "SILVER",
      icon: "🥈",
      count: statistics.silver,
    },
    {
      name: "BRONZE",
      icon: "🥉",
      count: statistics.bronze,
    },
  ];

  // =====================================================
  // PRINT
  // =====================================================

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <div className="min-h-screen bg-slate-950 text-white print:bg-white print:text-black">

        {/* ===================================== */}
        {/* HEADER */}
        {/* ===================================== */}

        <header className="border-b border-slate-800 bg-slate-900 print:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">

            <div>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                📊 ANALISA KESELURUHAN MURID
              </h1>

              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                Analisa prestasi bacaan Al-Quran semua murid
              </p>
            </div>

            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold transition hover:bg-slate-700"
            >
              ← Dashboard
            </Link>

          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6">

          {/* ===================================== */}
          {/* PRINT HEADER */}
          {/* ===================================== */}

          <div className="mb-6 hidden print:block">
            <div className="border-b-2 border-black pb-4 text-center">

              <h1 className="text-2xl font-black">
                QURAN RANKING LIVE – PPD MACHANG
              </h1>

              <h2 className="mt-2 text-xl font-bold">
                ANALISA KESELURUHAN MURID
              </h2>

              <p className="mt-1 text-sm">
                Analisa Pengisian Bacaan Al-Quran
              </p>

              <p className="mt-2 text-sm font-bold">
                Tarikh:{" "}
                {formatDateMalay(selectedDate)}
              </p>

            </div>
          </div>

          {/* ===================================== */}
          {/* FILTER */}
          {/* ===================================== */}

          <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl print:hidden">

            <div className="grid gap-4 md:grid-cols-3">

              {/* TARIKH */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-300">
                  📅 Tarikh
                </label>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) =>
                    setSelectedDate(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-emerald-500"
                />
              </div>

              {/* SEKOLAH */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-300">
                  🏫 Sekolah
                </label>

                <select
                  value={selectedSchool}
                  onChange={(e) =>
                    setSelectedSchool(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-emerald-500"
                >
                  <option value="ALL">
                    Semua Sekolah
                  </option>

                  {schools.map((school) => (
                    <option
                      key={school.id}
                      value={school.id}
                    >
                      {school.code
                        ? `${school.code} - ${school.name}`
                        : school.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* LEVEL */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-300">
                  🏆 Level
                </label>

                <select
                  value={selectedLevel}
                  onChange={(e) =>
                    setSelectedLevel(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-emerald-500"
                >
                  <option value="ALL">
                    Semua Level
                  </option>

                  <option value="GRANDMASTER">
                    👑 GRANDMASTER
                  </option>

                  <option value="HEROIC">
                    ⚔️ HEROIC
                  </option>

                  <option value="DIAMOND">
                    💎 DIAMOND
                  </option>

                  <option value="PLATINUM">
                    💠 PLATINUM
                  </option>

                  <option value="GOLD">
                    🥇 GOLD
                  </option>

                  <option value="SILVER">
                    🥈 SILVER
                  </option>

                  <option value="BRONZE">
                    🥉 BRONZE
                  </option>
                </select>
              </div>

            </div>

            <div className="mt-4 flex flex-wrap gap-3">

              <button
                onClick={handlePrint}
                className="rounded-xl bg-emerald-600 px-5 py-3 font-black transition hover:bg-emerald-500"
              >
                🖨️ CETAK / SIMPAN PDF
              </button>

              <button
                onClick={loadAnalysis}
                className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 font-bold transition hover:bg-slate-700"
              >
                🔄 Segarkan Data
              </button>

            </div>

          </section>

          {/* ===================================== */}
          {/* PRINT FILTER INFO */}
          {/* ===================================== */}

          <div className="mb-4 hidden print:block">

            <div className="flex justify-between border-b border-black pb-2 text-sm">

              <span>
                <strong>Tarikh:</strong>{" "}
                {formatDateMalay(
                  selectedDate
                )}
              </span>

              <span>
                <strong>Sekolah:</strong>{" "}
                {selectedSchool === "ALL"
                  ? "Semua Sekolah"
                  : schools.find(
                      (s) =>
                        s.id ===
                        selectedSchool
                    )?.name || "-"}
              </span>

              <span>
                <strong>Level:</strong>{" "}
                {selectedLevel === "ALL"
                  ? "Semua Level"
                  : selectedLevel}
              </span>

            </div>

          </div>

          {/* ===================================== */}
          {/* ERROR */}
          {/* ===================================== */}

          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">

              <div className="font-bold">
                ❌ Ralat
              </div>

              <div className="mt-1 text-sm">
                {error}
              </div>

            </div>
          )}

          {/* ===================================== */}
          {/* LOADING */}
          {/* ===================================== */}

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">

              <div className="text-4xl">
                ⏳
              </div>

              <p className="mt-3 font-bold">
                Sedang menyediakan analisa...
              </p>

            </div>
          ) : (
            <>

              {/* ===================================== */}
              {/* STATISTICS */}
              {/* ===================================== */}

              <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">

                {/* JUMLAH MURID */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 print:border-black print:bg-white">

                  <div className="text-sm font-bold text-slate-400 print:text-black">
                    👥 Jumlah Murid
                  </div>

                  <div className="mt-2 text-4xl font-black">
                    {statistics.total}
                  </div>

                  <div className="mt-1 text-xs text-slate-500 print:text-black">
                    Murid aktif
                  </div>

                </div>

                {/* SUDAH ISI */}
                <div className="rounded-2xl border border-emerald-800 bg-emerald-950/30 p-5 print:border-black print:bg-white">

                  <div className="text-sm font-bold text-emerald-300 print:text-black">
                    ✅ Sudah Isi
                  </div>

                  <div className="mt-2 text-4xl font-black text-emerald-400 print:text-black">
                    {statistics.filled}
                  </div>

                  <div className="mt-1 text-xs print:text-black">
                    {statistics.completion}% daripada keseluruhan
                  </div>

                </div>

                {/* BACAAN HARI INI */}
                <div className="rounded-2xl border border-amber-800 bg-amber-950/30 p-5 print:border-black print:bg-white">

                  <div className="text-sm font-bold text-amber-300 print:text-black">
                    📖 Bacaan Hari Ini
                  </div>

                  <div className="mt-2 text-4xl font-black text-amber-400 print:text-black">
                    {statistics.pagesToday}
                  </div>

                  <div className="mt-1 text-xs print:text-black">
                    jumlah muka surat direkodkan pada{" "}
                    {formatDateMalay(
                      selectedDate
                    )}
                  </div>

                </div>

                {/* PURATA */}
                <div className="rounded-2xl border border-blue-800 bg-blue-950/30 p-5 print:border-black print:bg-white">

                  <div className="text-sm font-bold text-blue-300 print:text-black">
                    📈 Purata Bacaan
                  </div>

                  <div className="mt-2 text-4xl font-black text-blue-400 print:text-black">
                    {statistics.averagePages.toFixed(
                      1
                    )}
                  </div>

                  <div className="mt-1 text-xs print:text-black">
                    muka surat / semua murid
                  </div>

                </div>

              </section>

              {/* ===================================== */}
              {/* PROGRESS */}
              {/* ===================================== */}

              <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 print:border-black print:bg-white">

                <div className="flex items-center justify-between gap-4">

                  <div>

                    <h2 className="font-black">
                      📊 Kadar Pengisian Bacaan
                    </h2>

                    <p className="mt-1 text-xs text-slate-400 print:text-black">
                      {statistics.filled} daripada{" "}
                      {statistics.total} murid
                      telah mengisi bacaan.
                    </p>

                  </div>

                  <div className="text-2xl font-black">
                    {statistics.completion}%
                  </div>

                </div>

                <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-800 print:border print:border-black">

                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{
                      width: `${statistics.completion}%`,
                    }}
                  />

                </div>

              </section>

              {/* ===================================== */}
              {/* LEVEL ANALYSIS */}
              {/* ===================================== */}

              <section className="mb-8">

                <div className="mb-4">
                  <h2 className="text-xl font-black">
                    🏆 Analisa Mengikut Level
                  </h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 print:grid-cols-7">

                  {levelAnalysis.map(
                    (level) => (
                      <div
                        key={level.name}
                        className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center print:border-black print:bg-white"
                      >

                        <div className="text-3xl">
                          {level.icon}
                        </div>

                        <div className="mt-2 text-xs font-black">
                          {level.name}
                        </div>

                        <div className="mt-1 text-2xl font-black">
                          {level.count}
                        </div>

                        <div className="text-[10px] text-slate-500 print:text-black">
                          murid
                        </div>

                      </div>
                    )
                  )}

                </div>

              </section>

              {/* ===================================== */}
              {/* SCHOOL ANALYSIS */}
              {/* ===================================== */}

              <section className="mb-8">

                <div className="mb-4">
                  <h2 className="text-xl font-black">
                    🏫 Analisa Mengikut Sekolah
                  </h2>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 print:border-black print:bg-white">

                  <div className="overflow-x-auto">

                    <table className="w-full min-w-[700px] text-sm">

                      <thead>

                        <tr className="border-b border-slate-800 bg-slate-800 print:border-black print:bg-white">

                          <th className="px-4 py-3 text-left">
                            Bil.
                          </th>

                          <th className="px-4 py-3 text-left">
                            Sekolah
                          </th>

                          <th className="px-4 py-3 text-center">
                            Jumlah Murid
                          </th>

                          <th className="px-4 py-3 text-center">
                            Sudah Isi
                          </th>

                          <th className="px-4 py-3 text-center">
                            Belum Isi
                          </th>

                          <th className="px-4 py-3 text-center">
                            Muka Surat
                          </th>

                          <th className="px-4 py-3 text-center">
                            %
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {schoolAnalysis.map(
                          (
                            school,
                            index
                          ) => {

                            const percentage =
                              school.total >
                              0
                                ? Math.round(
                                    (school.filled /
                                      school.total) *
                                      100
                                  )
                                : 0;

                            return (
                              <tr
                                key={
                                  school.id
                                }
                                className="border-b border-slate-800 last:border-0 print:border-black"
                              >

                                <td className="px-4 py-3">
                                  {index + 1}
                                </td>

                                <td className="px-4 py-3 font-bold">

                                  {school.code && (
                                    <span className="mr-2 text-xs text-slate-500 print:text-black">
                                      {
                                        school.code
                                      }
                                    </span>
                                  )}

                                  {school.name}

                                </td>

                                <td className="px-4 py-3 text-center font-bold">
                                  {school.total}
                                </td>

                                <td className="px-4 py-3 text-center font-bold text-emerald-400 print:text-black">
                                  {school.filled}
                                </td>

                                <td className="px-4 py-3 text-center font-bold text-red-400 print:text-black">
                                  {
                                    school.notFilled
                                  }
                                </td>

                                <td className="px-4 py-3 text-center font-bold">
                                  {school.pages}
                                </td>

                                <td className="px-4 py-3 text-center font-black">
                                  {percentage}%
                                </td>

                              </tr>
                            );
                          }
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>

              </section>

              {/* ===================================== */}
              {/* STUDENT TABLE */}
              {/* ===================================== */}

              <section>

                <div className="mb-4 flex items-end justify-between gap-4">

                  <div>

                    <h2 className="text-xl font-black">
                      📋 Senarai Keseluruhan Murid
                    </h2>

                    <p className="mt-1 text-xs text-slate-400 print:text-black">
                      Memaparkan{" "}
                      {
                        filteredStudents.length
                      }{" "}
                      murid
                    </p>

                  </div>

                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 print:border-black print:bg-white">

                  <div className="overflow-x-auto">

                    <table className="w-full min-w-[1000px] text-sm">

                      <thead>

                        <tr className="border-b border-slate-800 bg-slate-800 print:border-black print:bg-white">

                          <th className="px-3 py-3 text-center">
                            Bil.
                          </th>

                          <th className="px-4 py-3 text-left">
                            Nama Murid
                          </th>

                          <th className="px-4 py-3 text-left">
                            Sekolah
                          </th>

                          <th className="px-3 py-3 text-center">
                            Kumpulan
                          </th>

                          <th className="px-3 py-3 text-center">
                            Muka Surat
                          </th>

                          <th className="px-3 py-3 text-center">
                            Bacaan Hari Ini
                          </th>

                          <th className="px-3 py-3 text-center">
                            Level
                          </th>

                          <th className="px-3 py-3 text-center">
                            Status
                          </th>

                          <th className="px-4 py-3 text-center">
                            Masa Terakhir
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {filteredStudents.map(
                          (
                            student,
                            index
                          ) => (

                            <tr
                              key={
                                student.id
                              }
                              className="border-b border-slate-800 last:border-0 print:border-black"
                            >

                              <td className="px-3 py-3 text-center">
                                {index + 1}
                              </td>

                              <td className="px-4 py-3 font-bold">
                                {student.name}
                              </td>

                              <td className="px-4 py-3">
                                {
                                  student.school_name
                                }
                              </td>

                              <td className="px-3 py-3 text-center">
                                Kumpulan{" "}
                                {
                                  student.group_number
                                }
                              </td>

                              <td className="px-3 py-3 text-center font-black">
                                {
                                  student.current_page
                                }
                              </td>

                              <td className="px-3 py-3 text-center font-bold">
                                {student.pages_today >
                                0
                                  ? `+${student.pages_today}`
                                  : "-"}
                              </td>

                              <td className="px-3 py-3 text-center">

                                <span className="inline-flex items-center gap-1 font-bold">
                                  {
                                    student.level_icon
                                  }{" "}
                                  {
                                    student.level
                                  }
                                </span>

                              </td>

                              <td className="px-3 py-3 text-center">

                                {student.has_read_today ? (
                                  <span className="font-bold text-emerald-400 print:text-black">
                                    ✓ SUDAH ISI
                                  </span>
                                ) : (
                                  <span className="font-bold text-red-400 print:text-black">
                                    ✕ BELUM ISI
                                  </span>
                                )}

                              </td>

                              <td className="px-4 py-3 text-center text-xs text-slate-400 print:text-black">

                                {student.latest_reading
                                  ? formatDateTime(
                                      student
                                        .latest_reading
                                        .created_at
                                    )
                                  : "-"}

                              </td>

                            </tr>

                          )
                        )}

                        {filteredStudents.length ===
                          0 && (
                          <tr>

                            <td
                              colSpan={9}
                              className="px-4 py-12 text-center text-slate-400 print:text-black"
                            >
                              Tiada murid ditemui berdasarkan tapisan yang dipilih.
                            </td>

                          </tr>
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>

              </section>

              {/* ===================================== */}
              {/* PRINT FOOTER */}
              {/* ===================================== */}

              <div className="mt-12 hidden print:block">

                <div className="grid grid-cols-2 gap-20">

                  <div className="text-center">

                    <div className="mb-12 border-b border-black" />

                    <div className="font-bold">
                      Guru / Penyelaras
                    </div>

                  </div>

                  <div className="text-center">

                    <div className="mb-12 border-b border-black" />

                    <div className="font-bold">
                      Pegawai / Penyelaras PPD
                    </div>

                  </div>

                </div>

                <div className="mt-8 text-center text-xs">
                  Dijana oleh Sistem QURAN RANKING LIVE – PPD MACHANG
                </div>

              </div>

            </>
          )}

        </main>

      </div>

      {/* ===================================== */}
      {/* PRINT CSS */}
      {/* ===================================== */}

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          html,
          body {
            background: white !important;
            color: black !important;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print\\\\:hidden {
            display: none !important;
          }

          .print\\\\:block {
            display: block !important;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          thead {
            display: table-header-group;
          }

          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>
    </>
  );
}