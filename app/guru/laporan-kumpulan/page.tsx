"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type School = {
  id: string;
  code: string;
  name: string;
};

type Participant = {
  id: string;
  name: string;
  photo_url: string | null;
  current_page: number;
  grandmaster_at: string | null;
  school_id: string;
  group_number: number;
  school_name: string;
};

type ReadingRecord = {
  id: string;
  participant_id: string;
  reading_date: string;
  page_from: number;
  page_to: number;
  pages_read: number;
  entered_by: string | null;
  note: string | null;
  is_baseline: boolean;
  created_at: string;
};

/* ========================================= */
/* LEVEL */
/* ========================================= */

function getLevel(page: number) {
  if (page >= 604) {
    return {
      name: "GRANDMASTER",
      icon: "👑",
      className: "text-yellow-400",
    };
  }

  if (page >= 401) {
    return {
      name: "HEROIC",
      icon: "⚔️",
      className: "text-red-400",
    };
  }

  if (page >= 301) {
    return {
      name: "DIAMOND",
      icon: "💎",
      className: "text-cyan-400",
    };
  }

  if (page >= 201) {
    return {
      name: "PLATINUM",
      icon: "💠",
      className: "text-slate-300",
    };
  }

  if (page >= 101) {
    return {
      name: "GOLD",
      icon: "🥇",
      className: "text-yellow-300",
    };
  }

  if (page >= 51) {
    return {
      name: "SILVER",
      icon: "🥈",
      className: "text-slate-300",
    };
  }

  return {
    name: "BRONZE",
    icon: "🥉",
    className: "text-orange-400",
  };
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
/* MAIN PAGE */
/* ========================================= */

export default function LaporanKumpulanPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [records, setRecords] = useState<ReadingRecord[]>([]);

  const [selectedGroup, setSelectedGroup] = useState("1");

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();

    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kuala_Lumpur",
    }).format(now);
  });

  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [error, setError] = useState("");

  /* ========================================= */
  /* LOAD SEKOLAH */
  /* ========================================= */

  useEffect(() => {
    async function loadSchools() {
      const { data, error } =
        await supabase.rpc("get_active_schools");

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setSchools((data ?? []) as School[]);
      setLoading(false);
    }

    loadSchools();
  }, []);

  /* ========================================= */
  /* LOAD PESERTA */
  /* ========================================= */

  useEffect(() => {
    async function loadParticipants() {
      setError("");

      const { data, error } = await supabase
        .from("participants")
        .select(
          "id,name,photo_url,current_page,grandmaster_at,school_id,group_number"
        )
        .eq("is_active", true)
        .eq("group_number", Number(selectedGroup))
        .order("name", {
          ascending: true,
        });

      if (error) {
        setError(error.message);
        return;
      }

      const schoolMap = new Map(
        schools.map((school) => [
          school.id,
          school.name,
        ])
      );

      const formatted = (data ?? []).map(
        (participant) => ({
          ...participant,
          school_name:
            schoolMap.get(participant.school_id) ??
            "Sekolah tidak diketahui",
        })
      );

      setParticipants(
        formatted as Participant[]
      );
    }

    if (!loading) {
      loadParticipants();
    }
  }, [selectedGroup, schools, loading]);

  /* ========================================= */
  /* LOAD REKOD BACAAN */
  /* ========================================= */

  useEffect(() => {
    async function loadRecords() {
      setLoadingRecords(true);

      const participantIds = participants.map(
        (participant) => participant.id
      );

      if (participantIds.length === 0) {
        setRecords([]);
        setLoadingRecords(false);
        return;
      }

      const { data, error } = await supabase
        .from("reading_records")
        .select(
          "id,participant_id,reading_date,page_from,page_to,pages_read,entered_by,note,is_baseline,created_at"
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
          ascending: true,
        });

      if (error) {
        setError(error.message);
        setRecords([]);
        setLoadingRecords(false);
        return;
      }

      setRecords(
        (data ?? []) as ReadingRecord[]
      );

      setLoadingRecords(false);
    }

    loadRecords();
  }, [participants, selectedDate]);

  /* ========================================= */
  /* BENTUK DATA LAPORAN */
  /* ========================================= */

  const reportRows = useMemo(() => {
    return participants.map(
      (participant, index) => {
        const participantRecords =
          records.filter(
            (record) =>
              record.participant_id ===
              participant.id
          );

        const normalRecords =
          participantRecords.filter(
            (record) =>
              !record.is_baseline
          );

        const latestRecord =
          normalRecords.length > 0
            ? normalRecords[
                normalRecords.length - 1
              ]
            : null;

        /*
         * Gunakan pages_read.
         *
         * page_from dan page_to ialah kedudukan
         * muka surat, bukan jumlah bacaan harian.
         */

        const pagesToday =
          normalRecords.reduce(
            (total, record) =>
              total +
              Number(record.pages_read || 0),
            0
          );

        const level = getLevel(
          participant.current_page ?? 0
        );

        return {
          number: index + 1,
          participant,
          latestRecord,
          pagesToday,
          level,
          hasReading:
            normalRecords.length > 0,
        };
      }
    );
  }, [participants, records]);

  /* ========================================= */
  /* STATISTIK */
  /* ========================================= */

  const totalParticipants =
    reportRows.length;

  const totalFilled =
    reportRows.filter(
      (row) => row.hasReading
    ).length;

  const totalNotFilled =
    totalParticipants - totalFilled;

  /*
   * Jumlah bacaan pada tarikh yang dipilih.
   */

  const totalPagesToday =
    reportRows.reduce(
      (total, row) =>
        total + row.pagesToday,
      0
    );

  /*
   * Jumlah current_page semua murid.
   *
   * Digunakan untuk kolum Muka Surat
   * dan jumlah kedudukan semasa.
   */

  const totalCurrentPages =
    reportRows.reduce(
      (total, row) =>
        total +
        Math.min(
          604,
          row.participant.current_page ?? 0
        ),
      0
    );

  /* ========================================= */
  /* LOADING */
  /* ========================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">

        <div className="flex min-h-screen items-center justify-center">

          <div className="text-center">

            <div className="text-5xl">
              📄
            </div>

            <p className="mt-4 font-bold">
              Menyediakan laporan...
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
    <main className="min-h-screen bg-slate-950 text-white">

      {/* ===================================== */}
      {/* HEADER */}
      {/* ===================================== */}

      <header className="border-b border-white/10 bg-slate-900 print:hidden">

        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">

          <div>

            <h1 className="text-lg font-black sm:text-xl">
              📄 LAPORAN BACAAN
            </h1>

            <p className="mt-1 text-[10px] text-slate-400 sm:text-xs">
              QURAN RANKING LIVE · PPD MACHANG
            </p>

          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-700 sm:text-sm"
          >
            ← Dashboard
          </Link>

        </div>

      </header>

      {/* ===================================== */}
      {/* CONTENT */}
      {/* ===================================== */}

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 print:max-w-none print:px-0 print:py-0">

        {/* =================================== */}
        {/* TAJUK */}
        {/* =================================== */}

        <div className="mb-8 print:mb-3">

          <p className="font-semibold text-purple-400 print:text-black print:text-[10pt]">
            LAPORAN PENGISIAN BACAAN AL-QURAN
          </p>

          <h2 className="mt-2 text-3xl font-black sm:text-4xl print:mt-1 print:text-xl">
            Kumpulan {selectedGroup}
          </h2>

          <p className="mt-2 text-sm text-slate-400 print:mt-1 print:text-[9pt] print:text-black">
            Tarikh: {formatDate(selectedDate)}
          </p>

        </div>

        {/* =================================== */}
        {/* PILIHAN */}
        {/* =================================== */}

        <div className="mb-8 rounded-3xl border border-white/10 bg-slate-900 p-6 print:hidden">

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            <div>

              <label className="mb-2 block text-sm font-bold text-slate-300">
                👥 Kumpulan
              </label>

              <select
                value={selectedGroup}
                onChange={(event) =>
                  setSelectedGroup(
                    event.target.value
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-purple-400"
              >

                {Array.from(
                  { length: 10 },
                  (_, index) => index + 1
                ).map((group) => (

                  <option
                    key={group}
                    value={group}
                  >
                    Kumpulan {group}
                  </option>

                ))}

              </select>

            </div>

            <div>

              <label className="mb-2 block text-sm font-bold text-slate-300">
                📅 Tarikh
              </label>

              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(
                    event.target.value
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-purple-400"
              />

            </div>

          </div>

        </div>

        {/* =================================== */}
        {/* ERROR */}
        {/* =================================== */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-300 print:hidden">

            <p className="font-bold">
              Ralat
            </p>

            <p className="mt-1 text-sm">
              {error}
            </p>

          </div>
        )}

        {/* =================================== */}
        {/* RINGKASAN */}
        {/* =================================== */}

        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4 print:mb-3 print:grid-cols-4 print:gap-2">

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 print:rounded-lg print:border-slate-300 print:bg-white print:p-2.5">

            <p className="text-xs text-slate-500 print:text-[8pt]">
              Jumlah Murid
            </p>

            <p className="mt-2 text-3xl font-black print:mt-0.5 print:text-lg print:text-black">
              {totalParticipants}
            </p>

          </div>

          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5 print:rounded-lg print:border-slate-300 print:bg-white print:p-2.5">

            <p className="text-xs text-slate-500 print:text-[8pt]">
              Sudah Isi
            </p>

            <p className="mt-2 text-3xl font-black text-emerald-400 print:mt-0.5 print:text-lg print:text-black">
              {totalFilled}
            </p>

          </div>

          <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-5 print:rounded-lg print:border-slate-300 print:bg-white print:p-2.5">

            <p className="text-xs text-slate-500 print:text-[8pt]">
              Belum Isi
            </p>

            <p className="mt-2 text-3xl font-black text-red-400 print:mt-0.5 print:text-lg print:text-black">
              {totalNotFilled}
            </p>

          </div>

          <div className="rounded-3xl border border-purple-500/20 bg-purple-500/5 p-5 print:rounded-lg print:border-slate-300 print:bg-white print:p-2.5">

            <p className="text-xs text-slate-500 print:text-[8pt]">
              Jumlah Bacaan
            </p>

            <p className="mt-2 text-3xl font-black text-purple-400 print:mt-0.5 print:text-lg print:text-black">
              {totalPagesToday}
            </p>

            <p className="text-xs text-slate-500 print:text-[7pt]">
              muka surat hari ini
            </p>

          </div>

        </div>

        {/* =================================== */}
        {/* INFO KEMAJUAN */}
        {/* =================================== */}

        <div className="mb-8 rounded-3xl border border-white/10 bg-slate-900 p-6 print:mb-3 print:rounded-lg print:border-slate-300 print:bg-white print:p-2.5">

          <div className="flex flex-wrap items-center justify-between gap-4">

            <div>

              <p className="text-sm text-slate-400 print:text-[8pt] print:text-slate-600">
                Jumlah Kemajuan Kumpulan
              </p>

              <p className="mt-1 text-3xl font-black text-emerald-400 print:mt-0.5 print:text-lg print:text-black">
                {totalPagesToday.toLocaleString()}
              </p>

              <p className="text-xs text-slate-500 print:text-[7pt]">
                muka surat dibaca pada{" "}
                {formatDate(selectedDate)}
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                window.print()
              }
              className="rounded-2xl bg-purple-500 px-6 py-3 font-black text-white transition hover:bg-purple-400 print:hidden"
            >
              🖨️ CETAK / SIMPAN PDF
            </button>

          </div>

        </div>

        {/* =================================== */}
        {/* JADUAL */}
        {/* =================================== */}

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900 print:overflow-visible print:rounded-none print:border-slate-300 print:bg-white">

          {/* HEADER CETAK */}

          <div className="hidden border-b border-slate-300 p-6 text-black print:block print:p-2">

            <h1 className="text-center text-2xl font-black print:text-[15pt]">
              QURAN RANKING LIVE – PPD MACHANG
            </h1>

            <p className="mt-2 text-center text-lg font-bold print:mt-0.5 print:text-[11pt]">
              LAPORAN PENGISIAN BACAAN AL-QURAN
            </p>

            <div className="mt-4 flex justify-between text-sm print:mt-2 print:text-[8pt]">

              <span>
                Kumpulan:{" "}
                <strong>
                  {selectedGroup}
                </strong>
              </span>

              <span>
                Tarikh:{" "}
                <strong>
                  {formatDate(selectedDate)}
                </strong>
              </span>

            </div>

          </div>

          {loadingRecords ? (

            <div className="p-10 text-center text-slate-400 print:hidden">
              Memuatkan rekod bacaan...
            </div>

          ) : reportRows.length === 0 ? (

            <div className="p-10 text-center print:hidden">

              <div className="text-5xl">
                👥
              </div>

              <p className="mt-4 font-bold">
                Tiada murid dalam Kumpulan{" "}
                {selectedGroup}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Daftarkan murid dan tetapkan kumpulan terlebih dahulu.
              </p>

            </div>

          ) : (

            <div className="overflow-x-auto print:overflow-visible">

              <table className="w-full min-w-[900px] border-collapse text-sm print:min-w-0 print:w-full print:table-fixed print:text-[7.5pt]">

                <colgroup>

                  <col className="w-[5%]" />
                  <col className="w-[26%]" />
                  <col className="w-[20%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[15%]" />
                  <col className="w-[10%]" />

                </colgroup>

                <thead>

                  <tr className="border-b border-white/10 bg-slate-800 text-left print:border-slate-300 print:bg-slate-100 print:text-black">

                    <th className="px-4 py-4 text-center print:px-1.5 print:py-1.5">
                      Bil.
                    </th>

                    <th className="px-4 py-4 print:px-1.5 print:py-1.5">
                      Nama Murid
                    </th>

                    <th className="px-4 py-4 print:px-1.5 print:py-1.5">
                      Sekolah
                    </th>

                    <th className="px-4 py-4 text-center print:px-1.5 print:py-1.5">
                      Muka Surat
                    </th>

                    <th className="px-4 py-4 text-center print:px-1.5 print:py-1.5">
                      Bacaan Hari Ini
                    </th>

                    <th className="px-4 py-4 text-center print:px-1.5 print:py-1.5">
                      Level
                    </th>

                    <th className="px-4 py-4 text-center print:px-1.5 print:py-1.5">
                      Status
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {reportRows.map(
                    (row) => (

                      <tr
                        key={row.participant.id}
                        className="border-b border-white/5 text-white print:border-slate-300 print:break-inside-avoid print:text-black"
                      >

                        <td className="px-4 py-4 text-center font-bold print:px-1.5 print:py-1 print:text-black">
                          {row.number}
                        </td>

                        <td className="px-4 py-4 print:px-1.5 print:py-1 print:text-black">

                          <div className="flex items-center gap-3 print:gap-1.5">

                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-800 print:hidden">

                              {row.participant.photo_url ? (

                                <img
                                  src={
                                    row.participant.photo_url
                                  }
                                  alt={
                                    row.participant.name
                                  }
                                  className="h-full w-full object-cover"
                                />

                              ) : (

                                <div className="flex h-full w-full items-center justify-center">
                                  👤
                                </div>

                              )}

                            </div>

                            <div className="min-w-0">

                              <p className="font-bold print:leading-tight print:text-black">
                                {
                                  row.participant.name
                                }
                              </p>

                            </div>

                          </div>

                        </td>

                        <td className="px-4 py-4 print:px-1.5 print:py-1 print:leading-tight print:text-black">
                          {
                            row.participant.school_name
                          }
                        </td>

                        <td className="px-4 py-4 text-center font-black print:px-1.5 print:py-1 print:text-black">
                          {
                            row.participant.current_page
                          }{" "}
                          / 604
                        </td>

                        <td className="px-4 py-4 text-center print:px-1.5 print:py-1 print:text-black">

                          {row.hasReading ? (

                            <span className="font-black text-emerald-400 print:text-black">
                              +{row.pagesToday}
                            </span>

                          ) : (

                            <span className="text-slate-500 print:text-black">
                              —
                            </span>

                          )}

                        </td>

                        <td className="px-4 py-4 text-center print:px-1.5 print:py-1 print:text-black">

                          <span
                            className={`font-bold ${row.level.className} print:text-black`}
                          >
                            {row.level.icon}{" "}
                            {row.level.name}
                          </span>

                        </td>

                        <td className="px-4 py-4 text-center print:px-1.5 print:py-1 print:text-black">

                          {row.hasReading ? (

                            <span className="font-bold text-emerald-400 print:text-black">
                              ✓ ISI
                            </span>

                          ) : (

                            <span className="font-bold text-red-400 print:text-black">
                              ✗ BELUM
                            </span>

                          )}

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

                <tfoot>

                  <tr className="border-t-2 border-white/20 bg-slate-800 font-black print:border-slate-400 print:bg-slate-100 print:text-black">

                    <td
                      colSpan={3}
                      className="px-4 py-4 text-right print:px-1.5 print:py-1.5 print:text-black"
                    >
                      JUMLAH
                    </td>

                    <td className="px-4 py-4 text-center print:px-1.5 print:py-1.5 print:text-black">
                      {totalCurrentPages}
                    </td>

                    <td className="px-4 py-4 text-center print:px-1.5 print:py-1.5 print:text-black">
                      +{totalPagesToday}
                    </td>

                    <td
                      colSpan={2}
                      className="px-4 py-4 text-center print:px-1.5 print:py-1.5 print:text-black"
                    >
                      {totalFilled} /{" "}
                      {totalParticipants} ISI
                    </td>

                  </tr>

                </tfoot>

              </table>

            </div>

          )}

          {/* FOOTER CETAK */}

          <div className="hidden border-t border-slate-300 p-6 print:block print:p-2">

            <div className="mt-10 grid grid-cols-2 gap-20 print:mt-5">

              <div className="text-center">

                <div className="h-12 border-b border-black print:h-7" />

                <p className="mt-2 text-sm print:mt-1 print:text-[8pt] print:text-black">
                  Tandatangan Guru
                </p>

              </div>

              <div className="text-center">

                <div className="h-12 border-b border-black print:h-7" />

                <p className="mt-2 text-sm print:mt-1 print:text-[8pt] print:text-black">
                  Tandatangan Penyelaras
                </p>

              </div>

            </div>

            <p className="mt-8 text-center text-xs text-slate-500 print:mt-3 print:text-[7pt] print:text-black">
              QURAN RANKING LIVE – PPD MACHANG
            </p>

          </div>

        </div>

      </section>

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
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
            color: black !important;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          main {
            width: 100% !important;
            min-height: auto !important;
            background: white !important;
            color: black !important;
          }

          table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            color: #000 !important;
          }

          /*
           * PENTING:
           * Paksa SEMUA teks dalam jadual
           * menjadi hitam ketika PDF.
           *
           * Ini mengatasi text-white yang
           * diwarisi daripada dark mode.
           */

          table tbody,
          table tbody tr,
          table tbody td,
          table tbody td div,
          table tbody td p,
          table tbody td span,
          table tfoot,
          table tfoot tr,
          table tfoot td {
            color: #000 !important;
          }

          table thead,
          table thead tr,
          table thead th {
            color: #000 !important;
          }

          th,
          td {
            vertical-align: middle;
          }

          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          thead {
            display: table-header-group;
          }

          tfoot {
            display: table-footer-group;
          }

          .print\\:hidden {
            display: none !important;
          }

          .print\\:block {
            display: block !important;
          }

          .print\\:min-w-0 {
            min-width: 0 !important;
          }

          .print\\:overflow-visible {
            overflow: visible !important;
          }
        }
      `}</style>

    </main>
  );
}