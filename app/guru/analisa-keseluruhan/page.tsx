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
  created_at: string;
  voided_at?: string | null;
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

/* ========================================= */
/* TARIKH MALAYSIA */
/* ========================================= */

function getMalaysiaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MALAYSIA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/* ========================================= */
/* LEVEL */
/* ========================================= */

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

/* ========================================= */
/* FORMAT TARIKH */
/* ========================================= */

function formatDateMalay(dateString: string) {
  if (!dateString) return "-";

  const date = new Date(`${dateString}T00:00:00+08:00`);

  return new Intl.DateTimeFormat("ms-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/* ========================================= */
/* FORMAT TARIKH / MASA */
/* ========================================= */

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

/* ========================================= */
/* MAIN PAGE */
/* ========================================= */

export default function AnalisaKeseluruhanPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<StudentAnalysis[]>([]);

  const [selectedDate, setSelectedDate] =
    useState(getMalaysiaDate());

  const [selectedSchool, setSelectedSchool] =
    useState("ALL");

  const [selectedLevel, setSelectedLevel] =
    useState("ALL");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* ========================================= */
  /* LOAD DATA */
  /* ========================================= */

  useEffect(() => {
    loadAnalysis();
  }, [selectedDate]);

  async function loadAnalysis() {
    try {
      setLoading(true);
      setError("");

      /* =============================== */
      /* SEKOLAH */
      /* =============================== */

      const {
        data: schoolData,
        error: schoolError,
      } = await supabase.rpc(
        "get_active_schools"
      );

      if (schoolError) {
        throw new Error(
          schoolError.message
        );
      }

      const activeSchools: School[] =
        (schoolData || []).map(
          (school: any) => ({
            id: school.id,
            name: school.name,
            code: school.code || "",
          })
        );

      setSchools(activeSchools);

      /* =============================== */
      /* PESERTA */
      /* =============================== */

      const {
        data: participantData,
        error: participantError,
      } = await supabase
        .from("participants")
        .select(
          "id,name,school_id,group_number,current_page,grandmaster_at,is_active"
        )
        .eq("is_active", true)
        .order("name", {
          ascending: true,
        });

      if (participantError) {
        throw new Error(
          participantError.message
        );
      }

      const participants: Participant[] =
        participantData || [];

      if (participants.length === 0) {
        setStudents([]);
        return;
      }

      const participantIds =
        participants.map(
          (student) => student.id
        );

      /* =============================== */
      /* REKOD BACAAN HARI DIPILIH */
      /* =============================== */

      const {
        data: readingData,
        error: readingError,
      } = await supabase
        .from("reading_records")
        .select(
          "id,participant_id,page_from,page_to,created_at,voided_at"
        )
        .in(
          "participant_id",
          participantIds
        )
        .eq(
          "reading_date",
          selectedDate
        )
        .is("voided_at", null)
        .order("created_at", {
          ascending: false,
        });

      if (readingError) {
        throw new Error(
          readingError.message
        );
      }

      const readings: ReadingRecord[] =
        readingData || [];

      /* =============================== */
      /* SCHOOL MAP */
      /* =============================== */

      const schoolMap =
        new Map<string, School>();

      activeSchools.forEach((school) => {
        schoolMap.set(
          school.id,
          school
        );
      });

      /* =============================== */
      /* READING MAP */
      /* =============================== */

      const readingMap =
        new Map<string, ReadingRecord>();

      readings.forEach((reading) => {
        if (
          !readingMap.has(
            reading.participant_id
          )
        ) {
          readingMap.set(
            reading.participant_id,
            reading
          );
        }
      });

      /* =============================== */
      /* BENTUK DATA PESERTA */
      /* =============================== */

      const studentResults: StudentAnalysis[] =
        participants.map((student) => {
          const school =
            schoolMap.get(
              student.school_id
            );

          const latestReading =
            readingMap.get(
              student.id
            ) || null;

          const studentReadings =
            readings.filter(
              (reading) =>
                reading.participant_id ===
                student.id
            );

          /*
           * BACAAN HARI INI
           * Hanya berdasarkan reading_records
           * untuk tarikh yang dipilih.
           */
          const pagesToday =
            studentReadings.reduce(
              (
                total,
                reading
              ) => {
                const from = Number(
                  reading.page_from || 0
                );

                const to = Number(
                  reading.page_to || 0
                );

                const pages =
                  Math.max(
                    0,
                    to - from
                  );

                return (
                  total + pages
                );
              },
              0
            );

          const level = getLevel(
            Number(
              student.current_page || 0
            )
          );

          return {
            ...student,

            school_name:
              school?.name ||
              "Tidak diketahui",

            school_code:
              school?.code || "",

            pages_today:
              pagesToday,

            has_read_today:
              studentReadings.length > 0,

            level:
              level.name,

            level_icon:
              level.icon,

            latest_reading:
              latestReading,
          };
        });

      setStudents(
        studentResults
      );
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

  /* ========================================= */
  /* FILTER PESERTA */
  /* ========================================= */

  const filteredStudents =
    useMemo(() => {
      return students.filter(
        (student) => {
          const schoolMatch =
            selectedSchool === "ALL" ||
            student.school_id ===
              selectedSchool;

          const levelMatch =
            selectedLevel === "ALL" ||
            student.level ===
              selectedLevel;

          return (
            schoolMatch &&
            levelMatch
          );
        }
      );
    }, [
      students,
      selectedSchool,
      selectedLevel,
    ]);

  /* ========================================= */
  /* STATISTIK */
  /* ========================================= */

  const statistics =
    useMemo(() => {
      const total =
        students.length;

      const filled =
        students.filter(
          (student) =>
            student.has_read_today
        ).length;

      const notFilled =
        total - filled;

      /*
       * JUMLAH BACAAN HARI INI
       * Hanya jumlah muka surat yang
       * direkodkan pada tarikh dipilih.
       */
      const pagesToday =
        students.reduce(
          (
            totalPages,
            student
          ) =>
            totalPages +
            student.pages_today,
          0
        );

      /*
       * KEKALKAN DATA KEMAJUAN SEMASA
       * Untuk kegunaan bahagian lain.
       */
      const totalCurrentPages =
        students.reduce(
          (
            totalPages,
            student
          ) =>
            totalPages +
            Number(
              student.current_page ||
                0
            ),
          0
        );

      /*
       * PURATA BACAAN
       * Jumlah bacaan pada tarikh dipilih
       * dibahagi SEMUA murid aktif.
       */
      const averagePages =
        total > 0
          ? pagesToday / total
          : 0;

      const grandmaster =
        students.filter(
          (student) =>
            student.level ===
            "GRANDMASTER"
        ).length;

      const heroic =
        students.filter(
          (student) =>
            student.level ===
            "HEROIC"
        ).length;

      const diamond =
        students.filter(
          (student) =>
            student.level ===
            "DIAMOND"
        ).length;

      const platinum =
        students.filter(
          (student) =>
            student.level ===
            "PLATINUM"
        ).length;

      const gold =
        students.filter(
          (student) =>
            student.level ===
            "GOLD"
        ).length;

      const silver =
        students.filter(
          (student) =>
            student.level ===
            "SILVER"
        ).length;

      const bronze =
        students.filter(
          (student) =>
            student.level ===
            "BRONZE"
        ).length;

      const completion =
        total > 0
          ? Math.round(
              (filled / total) *
                100
            )
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

  /* ========================================= */
  /* ANALISA SEKOLAH */
  /* ========================================= */

  const schoolAnalysis =
    useMemo<SchoolAnalysis[]>(
      () => {
        return schools
          .map((school) => {
            const schoolStudents =
              students.filter(
                (student) =>
                  student.school_id ===
                  school.id
              );

            const filled =
              schoolStudents.filter(
                (student) =>
                  student.has_read_today
              ).length;

            const pages =
              schoolStudents.reduce(
                (
                  total,
                  student
                ) =>
                  total +
                  student.pages_today,
                0
              );

            return {
              id: school.id,
              name: school.name,
              code: school.code || "",
              total:
                schoolStudents.length,
              filled,
              notFilled:
                schoolStudents.length -
                filled,
              pages,
            };
          })
          .filter(
            (school) =>
              school.total > 0
          )
          .sort((a, b) => {
            if (
              b.pages !== a.pages
            ) {
              return (
                b.pages - a.pages
              );
            }

            return (
              b.filled -
              a.filled
            );
          });
      },
      [schools, students]
    );

  /* ========================================= */
  /* ANALISA LEVEL */
  /* ========================================= */

  const levelAnalysis = [
    {
      name: "GRANDMASTER",
      icon: "👑",
      count:
        statistics.grandmaster,
    },
    {
      name: "HEROIC",
      icon: "⚔️",
      count:
        statistics.heroic,
    },
    {
      name: "DIAMOND",
      icon: "💎",
      count:
        statistics.diamond,
    },
    {
      name: "PLATINUM",
      icon: "💠",
      count:
        statistics.platinum,
    },
    {
      name: "GOLD",
      icon: "🥇",
      count:
        statistics.gold,
    },
    {
      name: "SILVER",
      icon: "🥈",
      count:
        statistics.silver,
    },
    {
      name: "BRONZE",
      icon: "🥉",
      count:
        statistics.bronze,
    },
  ];

  /* ========================================= */
  /* PRINT */
  /* ========================================= */

  function handlePrint() {
    window.print();
  }

  /* ========================================= */
  /* LOADING */
  /* ========================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="text-4xl">
              ⏳
            </div>

            <p className="mt-3 font-bold">
              Sedang menyediakan analisa...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* ========================================= */
  /* PAGE */
  /* ========================================= */

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

        {/* ===================================== */}
        {/* MAIN */}
        {/* ===================================== */}

        <main className="mx-auto max-w-7xl px-4 py-6">

          {/* ================================= */}
          {/* PRINT HEADER */}
          {/* ================================= */}

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
                {formatDateMalay(
                  selectedDate
                )}
              </p>

            </div>

          </div>

          {/* ================================= */}
          {/* FILTER */}
          {/* ================================= */}

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

                  {schools.map(
                    (school) => (
                      <option
                        key={school.id}
                        value={school.id}
                      >
                        {school.code
                          ? `${school.code} - ${school.name}`
                          : school.name}
                      </option>
                    )
                  )}

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

          {/* ================================= */}
          {/* PRINT FILTER INFO */}
          {/* ================================= */}

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

          {/* ================================= */}
          {/* ERROR */}
          {/* ================================= */}

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

          {/* ================================= */}
          {/* CONTENT */}
          {/* ================================= */}

          <>

            {/* ================================= */}
            {/* STATISTICS */}
            {/* ================================= */}

            <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">

              {/* JUMLAH MURID */}

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 print:border-black print:bg-white print:p-2.5">

                <div className="text-sm font-bold text-slate-400 print:text-black print:text-[8pt]">
                  👥 Jumlah Murid
                </div>

                <div className="mt-2 text-4xl font-black print:mt-1 print:text-2xl">
                  {statistics.total}
                </div>

                <div className="mt-1 text-xs text-slate-500 print:text-[7pt] print:text-black">
                  Murid aktif
                </div>

              </div>

              {/* SUDAH ISI */}

              <div className="rounded-2xl border border-emerald-800 bg-emerald-950/30 p-5 print:border-black print:bg-white print:p-2.5">

                <div className="text-sm font-bold text-emerald-300 print:text-black print:text-[8pt]">
                  ✅ Sudah Isi
                </div>

                <div className="mt-2 text-4xl font-black text-emerald-400 print:mt-1 print:text-2xl print:text-black">
                  {statistics.filled}
                </div>

                <div className="mt-1 text-xs print:text-[7pt] print:text-black">
                  {statistics.completion}% daripada keseluruhan
                </div>

              </div>

              {/* BACAAN HARI INI */}

              <div className="rounded-2xl border border-amber-800 bg-amber-950/30 p-5 print:border-black print:bg-white print:p-2.5">

                <div className="text-sm font-bold text-amber-300 print:text-black print:text-[8pt]">
                  📖 Bacaan Hari Ini
                </div>

                <div className="mt-2 text-4xl font-black text-amber-400 print:mt-1 print:text-2xl print:text-black">
                  {statistics.pagesToday}
                </div>

                <div className="mt-1 text-xs print:text-[7pt] print:text-black">
                  jumlah muka surat
                </div>

              </div>

              {/* PURATA */}

              <div className="rounded-2xl border border-blue-800 bg-blue-950/30 p-5 print:border-black print:bg-white print:p-2.5">

                <div className="text-sm font-bold text-blue-300 print:text-black print:text-[8pt]">
                  📈 Purata Bacaan
                </div>

                <div className="mt-2 text-4xl font-black text-blue-400 print:mt-1 print:text-2xl print:text-black">
                  {statistics.averagePages.toFixed(
                    1
                  )}
                </div>

                <div className="mt-1 text-xs print:text-[7pt] print:text-black">
                  muka surat / murid
                </div>

              </div>

            </section>

            {/* ================================= */}
            {/* PROGRESS */}
            {/* ================================= */}

            <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 print:mb-3 print:border-black print:bg-white print:p-2">

              <div className="flex items-center justify-between gap-4">

                <div>

                  <h2 className="font-black print:text-[9pt]">
                    📊 Kadar Pengisian Bacaan
                  </h2>

                  <p className="mt-1 text-xs text-slate-400 print:mt-0.5 print:text-[7pt] print:text-black">
                    {statistics.filled} daripada{" "}
                    {statistics.total} murid
                    telah mengisi bacaan.
                  </p>

                </div>

                <div className="text-2xl font-black print:text-lg">
                  {statistics.completion}%
                </div>

              </div>

              <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-800 print:mt-1.5 print:h-1.5 print:border print:border-black">

                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{
                    width: `${statistics.completion}%`,
                  }}
                />

              </div>

            </section>

            {/* ================================= */}
            {/* LEVEL ANALYSIS */}
            {/* ================================= */}

            <section className="mb-8 print:mb-3">

              <div className="mb-4 print:mb-1.5">

                <h2 className="text-xl font-black print:text-[10pt]">
                  🏆 Analisa Mengikut Level
                </h2>

              </div>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 print:grid-cols-7 print:gap-1">

                {levelAnalysis.map(
                  (level) => (

                    <div
                      key={level.name}
                      className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center print:border-black print:bg-white print:p-1"
                    >

                      <div className="text-3xl print:text-base">
                        {level.icon}
                      </div>

                      <div className="mt-2 text-xs font-black print:mt-0 print:text-[6.5pt]">
                        {level.name}
                      </div>

                      <div className="mt-1 text-2xl font-black print:mt-0 print:text-sm">
                        {level.count}
                      </div>

                      <div className="text-[10px] text-slate-500 print:text-[5.5pt] print:text-black">
                        murid
                      </div>

                    </div>

                  )
                )}

              </div>

            </section>

            {/* ================================= */}
            {/* SCHOOL ANALYSIS */}
            {/* ================================= */}

            <section className="mb-8 print:mb-3">

              <div className="mb-4 print:mb-1.5">

                <h2 className="text-xl font-black print:text-[10pt]">
                  🏫 Analisa Mengikut Sekolah
                </h2>

              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 print:border-black print:bg-white">

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[700px] text-sm print:min-w-0 print:w-full print:table-fixed print:text-[7pt]">

                    <thead>

                      <tr className="border-b border-slate-800 bg-slate-800 print:border-black print:bg-white">

                        <th className="px-4 py-3 text-left print:px-1 print:py-0.5">
                          Bil.
                        </th>

                        <th className="px-4 py-3 text-left print:px-1 print:py-0.5">
                          Sekolah
                        </th>

                        <th className="px-4 py-3 text-center print:px-1 print:py-0.5">
                          Jumlah Murid
                        </th>

                        <th className="px-4 py-3 text-center print:px-1 print:py-0.5">
                          Sudah Isi
                        </th>

                        <th className="px-4 py-3 text-center print:px-1 print:py-0.5">
                          Belum Isi
                        </th>

                        <th className="px-4 py-3 text-center print:px-1 print:py-0.5">
                          Muka Surat
                        </th>

                        <th className="px-4 py-3 text-center print:px-1 print:py-0.5">
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
                              className="border-b border-slate-800 last:border-0 print:border-black print:break-inside-avoid"
                            >

                              <td className="px-4 py-3 text-center print:px-1 print:py-0.5">
                                {index + 1}
                              </td>

                              <td className="px-4 py-3 font-bold print:px-1 print:py-0.5 print:leading-tight">
                                {school.code && (
                                  <span className="mr-2 text-xs text-slate-500 print:mr-1 print:text-[6.5pt] print:text-black">
                                    {
                                      school.code
                                    }
                                  </span>
                                )}

                                {
                                  school.name
                                }
                              </td>

                              <td className="px-4 py-3 text-center font-bold print:px-1 print:py-0.5">
                                {
                                  school.total
                                }
                              </td>

                              <td className="px-4 py-3 text-center font-bold text-emerald-400 print:px-1 print:py-0.5 print:text-black">
                                {
                                  school.filled
                                }
                              </td>

                              <td className="px-4 py-3 text-center font-bold text-red-400 print:px-1 print:py-0.5 print:text-black">
                                {
                                  school.notFilled
                                }
                              </td>

                              <td className="px-4 py-3 text-center font-bold print:px-1 print:py-0.5">
                                {
                                  school.pages
                                }
                              </td>

                              <td className="px-4 py-3 text-center font-black print:px-1 print:py-0.5">
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

            {/* ================================= */}
            {/* STUDENT TABLE */}
            {/* ================================= */}

            <section>

              <div className="mb-4 flex items-end justify-between gap-4 print:mb-1.5">

                <div>

                  <h2 className="text-xl font-black print:text-[10pt]">
                    📋 Senarai Keseluruhan Murid
                  </h2>

                  <p className="mt-1 text-xs text-slate-400 print:mt-0 print:text-[6.5pt] print:text-black">
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

                  <table className="w-full min-w-[1000px] text-sm print:min-w-0 print:w-full print:table-fixed print:text-[7pt]">

                    <thead>

                      <tr className="border-b border-slate-800 bg-slate-800 print:border-black print:bg-white">

                        <th className="px-3 py-3 text-center print:px-0.5 print:py-0.5">
                          Bil.
                        </th>

                        <th className="px-4 py-3 text-left print:px-1 print:py-0.5">
                          Nama Murid
                        </th>

                        <th className="px-4 py-3 text-left print:px-1 print:py-0.5">
                          Sekolah
                        </th>

                        <th className="px-3 py-3 text-center print:px-0.5 print:py-0.5">
                          Kumpulan
                        </th>

                        <th className="px-3 py-3 text-center print:px-0.5 print:py-0.5">
                          Muka Surat
                        </th>

                        <th className="px-3 py-3 text-center print:px-0.5 print:py-0.5">
                          Bacaan Hari Ini
                        </th>

                        <th className="px-3 py-3 text-center print:px-0.5 print:py-0.5">
                          Level
                        </th>

                        <th className="px-3 py-3 text-center print:px-0.5 print:py-0.5">
                          Status
                        </th>

                        <th className="px-4 py-3 text-center print:px-1 print:py-0.5">
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
                            className="border-b border-slate-800 last:border-0 print:border-black print:break-inside-avoid"
                          >

                            <td className="px-3 py-3 text-center print:px-0.5 print:py-0.5">
                              {
                                index +
                                1
                              }
                            </td>

                            <td className="px-4 py-3 font-bold print:px-1 print:py-0.5 print:leading-tight">
                              {
                                student.name
                              }
                            </td>

                            <td className="px-4 py-3 print:px-1 print:py-0.5 print:leading-tight">
                              {
                                student.school_name
                              }
                            </td>

                            <td className="px-3 py-3 text-center print:px-0.5 print:py-0.5 print:leading-tight">
                              Kumpulan{" "}
                              {
                                student.group_number
                              }
                            </td>

                            <td className="px-3 py-3 text-center font-black print:px-0.5 print:py-0.5">
                              {
                                student.current_page
                              }
                            </td>

                            <td className="px-3 py-3 text-center font-bold print:px-0.5 print:py-0.5">
                              {student.pages_today >
                              0
                                ? `+${student.pages_today}`
                                : "-"}
                            </td>

                            <td className="px-3 py-3 text-center print:px-0.5 print:py-0.5">

                              <span className="inline-flex items-center gap-1 font-bold print:gap-0">
                                {
                                  student.level_icon
                                }{" "}
                                {
                                  student.level
                                }
                              </span>

                            </td>

                            <td className="px-3 py-3 text-center print:px-0.5 print:py-0.5">

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

                            <td className="px-4 py-3 text-center text-xs text-slate-400 print:px-1 print:py-0.5 print:text-[6.5pt] print:text-black">
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
                            colSpan={
                              9
                            }
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

            {/* ================================= */}
            {/* PRINT FOOTER */}
            {/* ================================= */}

            <div className="mt-12 hidden print:mt-4 print:block">

              <div className="grid grid-cols-2 gap-20">

                <div className="text-center">

                  <div className="mb-12 border-b border-black print:mb-5" />

                  <div className="font-bold text-sm print:text-[8pt]">
                    Guru / Penyelaras
                  </div>

                </div>

                <div className="text-center">

                  <div className="mb-12 border-b border-black print:mb-5" />

                  <div className="font-bold text-sm print:text-[8pt]">
                    Pegawai / Penyelaras PPD
                  </div>

                </div>

              </div>

              <div className="mt-8 text-center text-xs print:mt-3 print:text-[6.5pt]">
                Dijana oleh Sistem QURAN RANKING LIVE – PPD MACHANG
              </div>

            </div>

          </>

        </main>

      </div>

      {/* ===================================== */}
      {/* PRINT CSS */}
      {/* ===================================== */}

      <style jsx global>{`
        @media print {

          @page {
            size: A4 landscape;
            margin: 6mm;
          }

          html,
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* ================================ */
          /* SEMBUNYIKAN ELEMEN SCREEN */
          /* ================================ */

          .print\\\\:hidden {
            display: none !important;
          }

          .print\\\\:block {
            display: block !important;
          }

          /* ================================ */
          /* JADUAL PDF */
          /* ================================ */

          table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }

          thead {
            display: table-header-group !important;
          }

          tfoot {
            display: table-footer-group !important;
          }

          /*
           * BARIS LEBIH RAPAT
           * Supaya lebih banyak murid
           * masuk dalam satu halaman A4.
           */
          th,
          td {
            padding-top: 1.5px !important;
            padding-bottom: 1.5px !important;
            line-height: 1.05 !important;
            vertical-align: middle !important;
          }

          /*
           * Header jadual sedikit lebih padat.
           */
          th {
            line-height: 1 !important;
            font-weight: 800 !important;
          }

          /*
           * Elakkan satu baris murid
           * terpotong antara dua halaman.
           */
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: auto !important;
          }

          /*
           * Jadual boleh bersambung ke
           * halaman berikutnya.
           */
          tbody {
            page-break-inside: auto !important;
          }

          /* ================================ */
          /* KURANGKAN JARAK SEKSYEN */
          /* ================================ */

          section {
            page-break-inside: auto;
          }

          /* ================================ */
          /* FONT JADUAL */
          /* ================================ */

          table {
            font-size: 7pt !important;
          }

          /* ================================ */
          /* NAMA PANJANG */
          /* ================================ */

          td,
          th {
            overflow-wrap: break-word;
            word-wrap: break-word;
          }

          /* ================================ */
          /* ELEMEN YANG TIDAK PERLU BESAR */
          /* ================================ */

          h1,
          h2,
          h3,
          p {
            page-break-after: avoid;
          }

        }
      `}</style>

    </>
  );
}