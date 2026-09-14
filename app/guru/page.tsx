"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";


/* ========================================= */
/* TYPES */
/* ========================================= */

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
  is_active?: boolean;
};

type ReadingRecord = {
  id: string;
  page_from: number;
  page_to: number;
  pages_read: number;
  reading_date: string;
  created_at: string;
};

type RankingSchool = {
  position: number;
  school_name: string;
  participant_count: number;
  average_pages: number;
};

type LiveRankings = {
  date: string;
  individual: unknown[];
  schools: RankingSchool[];
  overall: unknown[];
  grandmasters: unknown[];
};


/* ========================================= */
/* TARIKH MALAYSIA */
/* ========================================= */

function getMalaysiaDate() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}


/* ========================================= */
/* COMPRESS IMAGE */
/* ========================================= */

async function compressImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Sila pilih fail gambar.");
  }

  if (file.size > 15 * 1024 * 1024) {
    throw new Error(
      "Gambar asal terlalu besar. Had gambar asal ialah 15 MB."
    );
  }

  const image = await createImageBitmap(file);

  const maxDimension = 1600;

  const scale = Math.min(
    1,
    maxDimension / Math.max(image.width, image.height)
  );

  const width = Math.max(
    1,
    Math.round(image.width * scale)
  );

  const height = Math.max(
    1,
    Math.round(image.height * scale)
  );

  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    image.close();
    throw new Error("Gagal memproses gambar.");
  }

  context.drawImage(
    image,
    0,
    0,
    width,
    height
  );

  image.close();

  let quality = 0.85;

  let blob: Blob | null = null;

  while (quality >= 0.4) {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        resolve,
        "image/jpeg",
        quality
      );
    });

    if (
      blob &&
      blob.size <= 700 * 1024
    ) {
      break;
    }

    quality -= 0.1;
  }

  if (!blob) {
    throw new Error(
      "Gagal memampatkan gambar."
    );
  }

  if (
    blob.size >
    3 * 1024 * 1024
  ) {
    throw new Error(
      "Gambar masih melebihi had 3 MB selepas compression."
    );
  }

  return new File(
    [blob],
    "participant-photo.jpg",
    {
      type: "image/jpeg",
    }
  );
}


/* ========================================= */
/* MAIN PAGE */
/* ========================================= */

export default function GuruPage() {


  /* ========================================= */
  /* STATE */
  /* ========================================= */

  const [schools, setSchools] =
    useState<School[]>([]);

  const [participants, setParticipants] =
    useState<Participant[]>([]);

  const [records, setRecords] =
    useState<ReadingRecord[]>([]);


  const [selectedSchoolId, setSelectedSchoolId] =
    useState("");

  const [selectedParticipantId, setSelectedParticipantId] =
    useState("");


  const [newParticipantName, setNewParticipantName] =
    useState("");

  const [startingPage, setStartingPage] =
    useState("0");

  const [newParticipantPhoto, setNewParticipantPhoto] =
    useState<File | null>(null);


  const [newPage, setNewPage] =
    useState("");

  const [note, setNote] =
    useState("");


  const [loading, setLoading] =
    useState(true);

  const [savingParticipant, setSavingParticipant] =
    useState(false);

  const [savingReading, setSavingReading] =
    useState(false);

  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);


  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  /* ========================================= */
  /* SELECTED SCHOOL */
  /* ========================================= */

  const selectedSchool =
    schools.find(
      (school) =>
        school.id === selectedSchoolId
    );


  /* ========================================= */
  /* SELECTED PARTICIPANT */
  /* ========================================= */

  const selectedParticipant =
    participants.find(
      (participant) =>
        participant.id === selectedParticipantId
    );


  /* ========================================= */
  /* JUMLAH BACAAN HARI INI */
  /* ========================================= */

  const todayPages =
    useMemo(
      () =>
        records.reduce(
          (total, record) =>
            total +
            record.pages_read,
          0
        ),
      [records]
    );


  /* ========================================= */
  /* LOAD SCHOOLS */
  /* ========================================= */

  async function loadSchools() {

    /*
     * PENTING:
     *
     * Kita ambil data sekolah daripada
     * RPC yang sama digunakan oleh /ranking.
     *
     * Ini memastikan /guru dan /ranking
     * menggunakan sumber data yang sama.
     */

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "get_live_rankings"
      );


    if (error) {

      setError(
        `Gagal mendapatkan senarai sekolah: ${error.message}`
      );

      return;
    }


    const rankings =
      data as LiveRankings;


    const rankingSchools =
      rankings?.schools ?? [];


    /*
     * RPC memberikan school_name tetapi
     * kita masih perlukan ID sekolah.
     *
     * Jadi selepas mendapat nama sekolah
     * daripada RPC, kita ambil ID sekolah
     * melalui query schools.
     */

    const {
      data: schoolRows,
      error: schoolError,
    } =
      await supabase
        .from("schools")
        .select(
          "id, code, name"
        )
        .order("code");


    if (schoolError) {

      setError(
        `Ranking berjaya dibaca tetapi senarai sekolah gagal dimuatkan: ${schoolError.message}`
      );

      return;
    }


    const activeSchoolNames =
      new Set(
        rankingSchools.map(
          (school) =>
            school.school_name
        )
      );


    /*
     * Jika RPC mempunyai data sekolah,
     * gunakan sekolah yang wujud dalam ranking.
     *
     * Jika belum ada ranking untuk sekolah tertentu,
     * fallback kepada semua sekolah daripada
     * jadual schools.
     */

    let finalSchools =
      schoolRows ?? [];


    if (
      activeSchoolNames.size > 0
    ) {

      const matchingSchools =
        (schoolRows ?? []).filter(
          (school) =>
            activeSchoolNames.has(
              school.name
            )
        );


      if (
        matchingSchools.length > 0
      ) {
        finalSchools =
          matchingSchools;
      }
    }


    setSchools(
      finalSchools
    );


    /*
     * Pilih sekolah pertama
     * secara automatik.
     */

    if (
      finalSchools.length > 0
    ) {

      setSelectedSchoolId(
        (current) =>
          current ||
          finalSchools[0].id
      );

    }

  }


  /* ========================================= */
  /* LOAD PARTICIPANTS */
  /* ========================================= */

  async function loadParticipants(
    schoolId: string
  ) {

    if (!schoolId) {

      setParticipants([]);

      setSelectedParticipantId("");

      return;
    }


    const {
      data,
      error,
    } =
      await supabase
        .from("participants")
        .select(
          "id, name, photo_url, current_page, grandmaster_at, is_active"
        )
        .eq(
          "school_id",
          schoolId
        )
        .eq(
          "is_active",
          true
        )
        .order(
          "current_page",
          {
            ascending: false,
          }
        )
        .order(
          "name"
        );


    if (error) {

      setError(
        `Gagal mendapatkan peserta: ${error.message}`
      );

      setParticipants([]);

      return;
    }


    setParticipants(
      data ?? []
    );

    setSelectedParticipantId("");

    setRecords([]);

  }


  /* ========================================= */
  /* LOAD RECORDS */
  /* ========================================= */

  async function loadRecords(
    participantId: string
  ) {

    if (!participantId) {

      setRecords([]);

      return;
    }


    const {
      data,
      error,
    } =
      await supabase
        .from("reading_records")
        .select(
          "id, page_from, page_to, pages_read, reading_date, created_at"
        )
        .eq(
          "participant_id",
          participantId
        )
        .eq(
          "reading_date",
          getMalaysiaDate()
        )
        .is(
          "voided_at",
          null
        )
        .eq(
          "is_baseline",
          false
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );


    if (error) {

      setError(
        `Gagal mendapatkan rekod bacaan: ${error.message}`
      );

      return;
    }


    setRecords(
      data ?? []
    );

  }


  /* ========================================= */
  /* UPLOAD PHOTO */
  /* ========================================= */

  async function uploadParticipantPhoto(
    participantId: string,
    file: File
  ) {

    const compressedFile =
      await compressImage(file);


    const path =
      `${participantId}/profile.jpg`;


    const {
      error: uploadError,
    } =
      await supabase.storage
        .from(
          "participant-photos"
        )
        .upload(
          path,
          compressedFile,
          {
            upsert: true,
            contentType:
              "image/jpeg",
            cacheControl:
              "3600",
          }
        );


    if (uploadError) {

      throw new Error(
        uploadError.message
      );

    }


    const {
      data: {
        publicUrl,
      },
    } =
      supabase.storage
        .from(
          "participant-photos"
        )
        .getPublicUrl(
          path
        );


    const photoUrl =
      `${publicUrl}?v=${Date.now()}`;


    const {
      error: photoError,
    } =
      await supabase.rpc(
        "update_participant_photo",
        {
          p_participant_id:
            participantId,

          p_photo_url:
            photoUrl,
        }
      );


    if (photoError) {

      throw new Error(
        photoError.message
      );

    }

  }


  /* ========================================= */
  /* INITIALISE */
  /* ========================================= */

  useEffect(() => {

    async function initialise() {

      setLoading(true);

      setError("");

      await loadSchools();

      setLoading(false);

    }


    void initialise();

  }, []);


  /* ========================================= */
  /* SCHOOL CHANGED */
  /* ========================================= */

  useEffect(() => {

    if (!selectedSchoolId) {

      return;
    }

    void loadParticipants(
      selectedSchoolId
    );

  }, [
    selectedSchoolId,
  ]);


  /* ========================================= */
  /* PARTICIPANT CHANGED */
  /* ========================================= */

  useEffect(() => {

    void loadRecords(
      selectedParticipantId
    );

  }, [
    selectedParticipantId,
  ]);


  /* ========================================= */
  /* ADD PARTICIPANT */
  /* ========================================= */

  async function handleAddParticipant(
    event: FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    const name =
      newParticipantName.trim();


    const page =
      Number(
        startingPage
      );


    if (
      !selectedSchoolId ||
      !name
    ) {

      setError(
        "Pilih sekolah dan masukkan nama peserta."
      );

      return;
    }


    if (
      !Number.isInteger(page) ||
      page < 0 ||
      page > 604
    ) {

      setError(
        "Muka surat permulaan mestilah antara 0 hingga 604."
      );

      return;
    }


    setSavingParticipant(
      true
    );

    setError("");

    setSuccess("");


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "add_participant",
        {
          p_school_id:
            selectedSchoolId,

          p_name:
            name,

          p_starting_page:
            page,
        }
      );


    if (error) {

      setError(
        error.message
      );

      setSavingParticipant(
        false
      );

      return;
    }


    const newParticipant =
      (
        Array.isArray(data)
          ? data[0]
          : data
      ) as Participant | null;


    try {

      if (
        newParticipantPhoto &&
        newParticipant?.id
      ) {

        await uploadParticipantPhoto(
          newParticipant.id,
          newParticipantPhoto
        );

      }


      setNewParticipantName("");

      setStartingPage("0");

      setNewParticipantPhoto(
        null
      );


      setSuccess(
        "Peserta berjaya ditambah. Muka surat permulaan tidak dikira sebagai bacaan hari ini."
      );


      await loadParticipants(
        selectedSchoolId
      );

    } catch (
      uploadError
    ) {

      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Gagal memuat naik gambar.";


      setError(
        `Peserta berjaya ditambah, tetapi gambar gagal dimuat naik: ${message}`
      );


      await loadParticipants(
        selectedSchoolId
      );

    }


    setSavingParticipant(
      false
    );

  }


  /* ========================================= */
  /* RECORD READING */
  /* ========================================= */

  async function handleRecordReading(
    event: FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    const pageTo =
      Number(
        newPage
      );


    if (
      !selectedParticipant
    ) {

      setError(
        "Sila pilih peserta dahulu."
      );

      return;
    }


    if (
      !Number.isInteger(
        pageTo
      )
    ) {

      setError(
        "Masukkan nombor muka surat yang sah."
      );

      return;
    }


    setSavingReading(
      true
    );

    setError("");

    setSuccess("");


    const {
      data: savedRecord,
      error,
    } =
      await supabase.rpc(
        "record_reading",
        {
          p_participant_id:
            selectedParticipant.id,

          p_page_to:
            pageTo,

          p_note:
            note.trim() ||
            null,
        }
      );


    if (error) {

      setError(
        error.message
      );

      setSavingReading(
        false
      );

      return;
    }


    const isBaseline =
      !Array.isArray(
        savedRecord
      ) &&
      savedRecord?.is_baseline ===
        true;


    setNewPage("");

    setNote("");


    setSuccess(
      isBaseline
        ? "Kemajuan awal berjaya disimpan sebagai baseline dan tidak dikira untuk hari ini."
        : "Bacaan berjaya direkodkan."
    );


    await Promise.all([
      loadParticipants(
        selectedSchoolId
      ),

      loadRecords(
        selectedParticipant.id
      ),
    ]);


    setSelectedParticipantId(
      selectedParticipant.id
    );


    setSavingReading(
      false
    );

  }


  /* ========================================= */
  /* CHANGE SELECTED PHOTO */
  /* ========================================= */

  async function handleSelectedPhotoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {

    const file =
      event.target.files?.[0];


    if (
      !file ||
      !selectedParticipant
    ) {

      return;
    }


    setUploadingPhoto(
      true
    );

    setError("");

    setSuccess("");


    try {

      await uploadParticipantPhoto(
        selectedParticipant.id,
        file
      );


      await loadParticipants(
        selectedSchoolId
      );


      setSelectedParticipantId(
        selectedParticipant.id
      );


      setSuccess(
        "Gambar peserta berjaya dikemas kini."
      );

    } catch (
      uploadError
    ) {

      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Gagal memuat naik gambar.";


      setError(
        message
      );

    }


    event.target.value =
      "";

    setUploadingPhoto(
      false
    );

  }


  /* ========================================= */
  /* LOADING */
  /* ========================================= */

  if (loading) {

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">

        <div className="text-center">

          <div className="text-5xl">
            📖
          </div>

          <p className="mt-4 font-semibold">
            Memuatkan pengisian bacaan…
          </p>

        </div>

      </main>
    );

  }


  /* ========================================= */
  /* PAGE */
  /* ========================================= */

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


          <div className="flex gap-3">

            <Link
              href="/dashboard"
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
            >
              Dashboard
            </Link>


            <Link
              href="/ranking"
              className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-yellow-400"
            >
              🏆 Ranking
            </Link>

          </div>

        </div>

      </header>


      {/* CONTENT */}

      <section className="mx-auto max-w-6xl px-6 py-10">


        <p className="font-semibold text-emerald-400">
          PENGISIAN BACAAN
        </p>


        <h2 className="mt-2 text-4xl font-black">
          Rekod Bacaan Peserta
        </h2>


        <p className="mt-2 text-slate-400">
          Pilih sekolah, pilih peserta, kemudian masukkan muka surat semasa.
        </p>


        {/* ERROR */}

        {error && (

          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">

            ❌ {error}

          </div>

        )}


        {/* SUCCESS */}

        {success && (

          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">

            ✅ {success}

          </div>

        )}


        {/* ===================================== */}
        {/* SCHOOL + PARTICIPANT */}
        {/* ===================================== */}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">


          {/* SEKOLAH */}

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-7">

            <h3 className="text-xl font-bold">
              1. Pilih Sekolah
            </h3>


            {schools.length > 0 ? (

              <select
                value={selectedSchoolId}
                onChange={(event) => {

                  setSelectedSchoolId(
                    event.target.value
                  );

                  setError("");

                  setSuccess("");

                }}
                className="mt-5 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-emerald-400"
              >

                {schools.map(
                  (school) => (

                    <option
                      key={school.id}
                      value={school.id}
                    >
                      {school.code} · {school.name}
                    </option>

                  )
                )}

              </select>

            ) : (

              <div className="mt-5 rounded-xl bg-red-500/10 border border-red-500/20 p-4">

                <p className="font-semibold text-red-300">
                  Tiada sekolah ditemui.
                </p>

                <p className="mt-1 text-xs text-red-400">
                  Sila semak data sekolah dalam Supabase.
                </p>

              </div>

            )}


            {/* TAMBAH PESERTA */}

            <form
              onSubmit={
                handleAddParticipant
              }
              className="mt-8"
            >

              <h3 className="text-lg font-bold">
                Tambah Peserta
              </h3>


              <p className="mt-1 text-sm text-slate-400">

                Tambah peserta baharu bagi{" "}

                {selectedSchool?.name ??
                  "sekolah ini"}.

              </p>


              <input
                value={
                  newParticipantName
                }
                onChange={(event) =>
                  setNewParticipantName(
                    event.target.value
                  )
                }
                placeholder="Nama penuh peserta"
                className="mt-4 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />


              <input
                type="number"
                min="0"
                max="604"
                value={startingPage}
                onChange={(event) =>
                  setStartingPage(
                    event.target.value
                  )
                }
                placeholder="Muka surat permulaan"
                className="mt-3 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />


              <label className="mt-3 block">

                <span className="text-sm text-slate-300">
                  Gambar peserta (pilihan)
                </span>


                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setNewParticipantPhoto(
                      event.target.files?.[0] ??
                        null
                    )
                  }
                  className="mt-2 block w-full text-sm text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:font-bold file:text-slate-950 hover:file:bg-emerald-400"
                />


                <p className="mt-2 text-xs text-slate-500">
                  Gambar akan dimampatkan automatik sebelum disimpan.
                </p>

              </label>


              <p className="mt-3 text-xs text-slate-500">
                Muka surat permulaan ialah kemajuan awal peserta dan tidak
                dikira sebagai bacaan hari ini.
              </p>


              <button
                type="submit"
                disabled={
                  savingParticipant ||
                  !selectedSchoolId
                }
                className="mt-4 w-full rounded-xl bg-emerald-500 py-3 font-bold text-slate-950 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400"
              >

                {savingParticipant
                  ? "Menyimpan…"
                  : "➕ Tambah Peserta"}

              </button>

            </form>

          </div>


          {/* PESERTA */}

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-7">

            <h3 className="text-xl font-bold">
              2. Pilih Peserta
            </h3>


            {participants.length > 0 ? (

              <select
                value={
                  selectedParticipantId
                }
                onChange={(event) => {

                  setSelectedParticipantId(
                    event.target.value
                  );

                  setError("");

                  setSuccess("");

                }}
                className="mt-5 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-emerald-400"
              >

                <option value="">
                  — Pilih peserta —
                </option>


                {participants.map(
                  (participant) => (

                    <option
                      key={
                        participant.id
                      }
                      value={
                        participant.id
                      }
                    >

                      {participant.name} ·{" "}
                      {participant.current_page}/604

                    </option>

                  )
                )}

              </select>

            ) : (

              <p className="mt-5 rounded-xl bg-slate-800 p-4 text-slate-400">
                Belum ada peserta untuk sekolah ini.
              </p>

            )}


            {/* SELECTED PARTICIPANT */}

            {selectedParticipant && (

              <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">


                <div className="flex items-center gap-4">


                  <div className="h-20 w-20 overflow-hidden rounded-2xl border border-emerald-400/20 bg-slate-800">

                    {selectedParticipant.photo_url ? (

                      <img
                        src={
                          selectedParticipant.photo_url
                        }
                        alt={
                          selectedParticipant.name
                        }
                        className="h-full w-full object-cover"
                      />

                    ) : (

                      <div className="flex h-full w-full items-center justify-center text-4xl">
                        👤
                      </div>

                    )}

                  </div>


                  <div>

                    <p className="text-sm text-slate-400">
                      Peserta dipilih
                    </p>


                    <p className="mt-1 text-xl font-black">
                      {selectedParticipant.name}
                    </p>


                    <p className="mt-2 text-emerald-400">
                      Kemajuan semasa:{" "}
                      {selectedParticipant.current_page}{" "}
                      / 604
                    </p>

                  </div>

                </div>


                {selectedParticipant.grandmaster_at && (

                  <p className="mt-4 font-bold text-yellow-400">
                    👑 GRANDMASTER
                  </p>

                )}


                {/* FOTO */}

                <label className="mt-5 block">

                  <span className="text-sm text-slate-300">
                    Tukar gambar peserta
                  </span>


                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={
                      handleSelectedPhotoChange
                    }
                    disabled={
                      uploadingPhoto
                    }
                    className="mt-2 block w-full text-sm text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:font-bold file:text-slate-950 hover:file:bg-emerald-400 disabled:opacity-50"
                  />


                  <p className="mt-2 text-xs text-slate-500">

                    {uploadingPhoto
                      ? "Sedang memampatkan dan memuat naik gambar…"
                      : "JPG, PNG atau WebP. Gambar akan dimampatkan automatik."}

                  </p>

                </label>

              </div>

            )}

          </div>

        </div>


        {/* ===================================== */}
        {/* REKOD + HARI INI */}
        {/* ===================================== */}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">


          {/* REKOD */}

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-7">

            <h3 className="text-xl font-bold">
              3. Rekod Bacaan
            </h3>


            <form
              onSubmit={
                handleRecordReading
              }
              className="mt-5"
            >


              <label className="block">

                <span className="text-sm text-slate-300">
                  Muka surat semasa
                </span>


                <input
                  type="number"
                  min="1"
                  max="604"
                  value={newPage}
                  onChange={(event) =>
                    setNewPage(
                      event.target.value
                    )
                  }
                  placeholder={
                    selectedParticipant
                      ? `Lebih daripada ${selectedParticipant.current_page}`
                      : "Pilih peserta dahulu"
                  }
                  disabled={
                    !selectedParticipant
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                />

              </label>


              <label className="mt-4 block">

                <span className="text-sm text-slate-300">
                  Catatan (pilihan)
                </span>


                <textarea
                  value={note}
                  onChange={(event) =>
                    setNote(
                      event.target.value
                    )
                  }
                  placeholder="Contoh: Bacaan selepas waktu Zuhur"
                  disabled={
                    !selectedParticipant
                  }
                  className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                />

              </label>


              <button
                type="submit"
                disabled={
                  !selectedParticipant ||
                  savingReading
                }
                className="mt-5 w-full rounded-xl bg-emerald-500 py-4 font-bold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >

                {savingReading
                  ? "Merekod bacaan…"
                  : "📖 Simpan Bacaan"}

              </button>

            </form>

          </div>


          {/* BACAAN HARI INI */}

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-7">

            <h3 className="text-xl font-bold">
              Bacaan Hari Ini
            </h3>


            {selectedParticipant ? (

              <>

                <p className="mt-4 text-4xl font-black text-emerald-400">
                  {todayPages}
                </p>


                <p className="text-sm text-slate-400">
                  muka surat hari ini
                </p>


                <div className="mt-6 space-y-3">

                  {records.length > 0 ? (

                    records.map(
                      (record) => (

                        <div
                          key={
                            record.id
                          }
                          className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3"
                        >

                          <span className="text-sm text-slate-300">

                            {record.page_from}{" "}
                            →{" "}
                            {record.page_to}

                          </span>


                          <span className="font-bold text-emerald-400">

                            +{record.pages_read}

                          </span>

                        </div>

                      )
                    )

                  ) : (

                    <p className="text-slate-500">
                      Belum ada rekod bacaan hari ini.
                    </p>

                  )}

                </div>

              </>

            ) : (

              <p className="mt-5 text-slate-500">
                Pilih peserta untuk melihat rekod hari ini.
              </p>

            )}

          </div>

        </div>


      </section>

    </main>
  );
}