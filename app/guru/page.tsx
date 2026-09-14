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
  group_number: number | null;
};

type ReadingRecord = {
  id: string;
  page_from: number;
  page_to: number;
  pages_read: number;
  reading_date: string;
  created_at: string;
};

type PageInputs = Record<string, string>;

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

  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    image.close();
    throw new Error("Gagal memproses gambar.");
  }

  context.drawImage(image, 0, 0, width, height);

  image.close();

  let quality = 0.85;
  let blob: Blob | null = null;

  while (quality >= 0.4) {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });

    if (blob && blob.size <= 700 * 1024) {
      break;
    }

    quality -= 0.1;
  }

  if (!blob) {
    throw new Error("Gagal memampatkan gambar.");
  }

  if (blob.size > 3 * 1024 * 1024) {
    throw new Error(
      "Gambar masih melebihi had 3 MB selepas compression."
    );
  }

  return new File([blob], "participant-photo.jpg", {
    type: "image/jpeg",
  });
}

export default function GuruPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [records, setRecords] = useState<ReadingRecord[]>([]);

  const [selectedGroup, setSelectedGroup] = useState("1");
  const [pageInputs, setPageInputs] = useState<PageInputs>({});

  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [newParticipantName, setNewParticipantName] = useState("");
  const [startingPage, setStartingPage] = useState("0");
  const [newParticipantPhoto, setNewParticipantPhoto] =
    useState<File | null>(null);
  const [newParticipantGroup, setNewParticipantGroup] = useState("1");

  const [selectedParticipantId, setSelectedParticipantId] =
    useState("");
  const [recordsParticipantId, setRecordsParticipantId] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [savingParticipant, setSavingParticipant] = useState(false);
  const [savingAllReadings, setSavingAllReadings] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedParticipant = participants.find(
    (participant) => participant.id === selectedParticipantId
  );

  const recordsParticipant = participants.find(
    (participant) => participant.id === recordsParticipantId
  );

  const filledCount = participants.filter((participant) => {
    const value = pageInputs[participant.id]?.trim() ?? "";
    return value !== "";
  }).length;

  const remainingCount = participants.length - filledCount;

  const todayPages = useMemo(
    () =>
      records.reduce(
        (total, record) => total + (record.pages_read ?? 0),
        0
      ),
    [records]
  );

  const groups = Array.from({ length: 10 }, (_, index) => index + 1);

  function getSchoolForParticipant(participant: Participant) {
    return schools.find((school) => school.id === participant.school_id);
  }

  // =====================================================
  // LOAD SEKOLAH - GUNA RPC
  // =====================================================

  async function loadSchools() {
    const { data, error } = await supabase.rpc(
      "get_active_schools"
    );

    if (error) {
      setError(
        `Gagal memuatkan senarai sekolah: ${error.message}`
      );
      setSchools([]);
      return;
    }

    const schoolData = (data ?? []) as School[];

    setSchools(schoolData);

    if (schoolData.length > 0) {
      setSelectedSchoolId((current) => current || schoolData[0].id);
    }
  }

  // =====================================================
  // LOAD PESERTA MENGIKUT KUMPULAN - GUNA RPC
  // =====================================================

  async function loadParticipants(groupNumber: string) {
    if (!groupNumber) {
      setParticipants([]);
      setPageInputs({});
      return;
    }

    setError("");

    const { data, error } = await supabase.rpc(
      "get_group_participants",
      {
        p_group_number: Number(groupNumber),
      }
    );

    if (error) {
      setError(
        `Gagal memuatkan peserta Kumpulan ${groupNumber}: ${error.message}`
      );
      setParticipants([]);
      return;
    }

    const participantData = (data ?? []) as Participant[];

    setParticipants(participantData);
    setPageInputs({});
    setSelectedParticipantId("");
    setRecordsParticipantId("");
    setRecords([]);
  }

  // =====================================================
  // LOAD REKOD BACAAN HARI INI
  // =====================================================

  async function loadRecords(participantId: string) {
    if (!participantId) {
      setRecords([]);
      return;
    }

    const malaysiaDate = getMalaysiaDate();

    const { data, error } = await supabase
      .from("reading_records")
      .select(
        "id, page_from, page_to, pages_read, reading_date, created_at"
      )
      .eq("participant_id", participantId)
      .eq("reading_date", malaysiaDate)
      .is("voided_at", null)
      .eq("is_baseline", false)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setError(`Gagal memuatkan rekod: ${error.message}`);
      return;
    }

    setRecords(data ?? []);
  }

  // =====================================================
  // UPLOAD GAMBAR
  // =====================================================

  async function uploadParticipantPhoto(
    participantId: string,
    file: File
  ) {
    const compressedFile = await compressImage(file);

    const path = `${participantId}/profile.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("participant-photos")
      .upload(path, compressedFile, {
        upsert: true,
        contentType: "image/jpeg",
        cacheControl: "3600",
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("participant-photos")
      .getPublicUrl(path);

    const photoUrl = `${publicUrl}?v=${Date.now()}`;

    const { error: photoError } = await supabase.rpc(
      "update_participant_photo",
      {
        p_participant_id: participantId,
        p_photo_url: photoUrl,
      }
    );

    if (photoError) {
      throw new Error(photoError.message);
    }
  }

  // =====================================================
  // INITIALISE
  // =====================================================

  useEffect(() => {
    async function initialise() {
      setLoading(true);
      setError("");

      await loadSchools();

      setLoading(false);
    }

    void initialise();
  }, []);

  // =====================================================
  // BILA KUMPULAN BERUBAH
  // =====================================================

  useEffect(() => {
    void loadParticipants(selectedGroup);
  }, [selectedGroup]);

  // =====================================================
  // BILA PESERTA REKOD BERUBAH
  // =====================================================

  useEffect(() => {
    if (!recordsParticipantId) {
      setRecords([]);
      return;
    }

    void loadRecords(recordsParticipantId);
  }, [recordsParticipantId]);

  // =====================================================
  // TAMBAH PESERTA
  // =====================================================

  async function handleAddParticipant(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const name = newParticipantName.trim();
    const page = Number(startingPage);
    const groupNumber = Number(newParticipantGroup);

    if (!selectedSchoolId || !name) {
      setError("Pilih sekolah dan masukkan nama peserta.");
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

    if (
      !Number.isInteger(groupNumber) ||
      groupNumber < 1 ||
      groupNumber > 10
    ) {
      setError(
        "Kumpulan mestilah antara Kumpulan 1 hingga Kumpulan 10."
      );
      return;
    }

    setSavingParticipant(true);
    setError("");
    setSuccess("");

    const { data, error } = await supabase.rpc(
      "add_participant",
      {
        p_school_id: selectedSchoolId,
        p_name: name,
        p_starting_page: page,
      }
    );

    if (error) {
      setError(error.message);
      setSavingParticipant(false);
      return;
    }

    const newParticipant = (
      Array.isArray(data) ? data[0] : data
    ) as Participant | null;

    try {
      if (!newParticipant?.id) {
        throw new Error(
          "Peserta berjaya ditambah tetapi ID peserta tidak dapat diperoleh."
        );
      }

      const { error: groupError } = await supabase.rpc(
        "set_participant_group",
        {
          p_participant_id: newParticipant.id,
          p_group_number: groupNumber,
        }
      );

      if (groupError) {
        throw new Error(
          `Peserta ditambah tetapi kumpulan gagal disimpan: ${groupError.message}`
        );
      }

      if (newParticipantPhoto) {
        await uploadParticipantPhoto(
          newParticipant.id,
          newParticipantPhoto
        );
      }

      setNewParticipantName("");
      setStartingPage("0");
      setNewParticipantPhoto(null);
      setNewParticipantGroup(selectedGroup);

      setSuccess(
        `Peserta berjaya ditambah ke Kumpulan ${groupNumber}.`
      );

      if (String(groupNumber) === selectedGroup) {
        await loadParticipants(selectedGroup);
      }
    } catch (addError) {
      const message =
        addError instanceof Error
          ? addError.message
          : "Gagal menyimpan peserta.";

      setError(message);

      if (String(groupNumber) === selectedGroup) {
        await loadParticipants(selectedGroup);
      }
    }

    setSavingParticipant(false);
  }

  // =====================================================
  // INPUT MUKA SURAT
  // =====================================================

  function handlePageInputChange(
    participantId: string,
    value: string
  ) {
    setPageInputs((current) => ({
      ...current,
      [participantId]: value,
    }));

    setError("");
    setSuccess("");
  }

  // =====================================================
  // HANTAR SEMUA BACAAN
  // =====================================================

  async function handleSubmitAllReadings(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const entries = participants
      .map((participant) => ({
        participant,
        value: pageInputs[participant.id]?.trim() ?? "",
      }))
      .filter((entry) => entry.value !== "");

    if (entries.length === 0) {
      setError(
        "Sila masukkan sekurang-kurangnya satu muka surat."
      );
      return;
    }

    for (const entry of entries) {
      const pageTo = Number(entry.value);

      if (
        !Number.isInteger(pageTo) ||
        pageTo < 1 ||
        pageTo > 604
      ) {
        setError(
          `Muka surat untuk ${entry.participant.name} mestilah antara 1 hingga 604.`
        );
        return;
      }

      if (pageTo <= entry.participant.current_page) {
        setError(
          `${entry.participant.name}: muka surat baharu (${pageTo}) mesti lebih daripada kemajuan semasa (${entry.participant.current_page}).`
        );
        return;
      }
    }

    setSavingAllReadings(true);

    const savedNames: string[] = [];
    const failedNames: string[] = [];

    for (const entry of entries) {
      const pageTo = Number(entry.value);

      const { error } = await supabase.rpc(
        "record_reading",
        {
          p_participant_id: entry.participant.id,
          p_page_to: pageTo,
          p_note: null,
        }
      );

      if (error) {
        failedNames.push(
          `${entry.participant.name}: ${error.message}`
        );
      } else {
        savedNames.push(entry.participant.name);
      }
    }

    await loadParticipants(selectedGroup);

    setPageInputs({});

    if (failedNames.length === 0) {
      setSuccess(
        `✅ Semua bacaan berjaya disimpan untuk ${savedNames.length} peserta.`
      );
    } else if (savedNames.length > 0) {
      setSuccess(
        `✅ ${savedNames.length} bacaan berjaya disimpan.`
      );

      setError(
        `⚠️ ${failedNames.length} bacaan gagal:\n${failedNames.join(
          "\n"
        )}`
      );
    } else {
      setError(
        `❌ Semua bacaan gagal disimpan:\n${failedNames.join(
          "\n"
        )}`
      );
    }

    setSavingAllReadings(false);
  }

  // =====================================================
  // PILIH PESERTA
  // =====================================================

  function handleSelectParticipant(
    participantId: string
  ) {
    setSelectedParticipantId(participantId);
    setRecordsParticipantId(participantId);

    setError("");
    setSuccess("");
  }

  // =====================================================
  // TUKAR GAMBAR
  // =====================================================

  async function handleSelectedPhotoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    const participantId = selectedParticipantId;

    if (!file || !participantId) {
      return;
    }

    setUploadingPhoto(true);
    setError("");
    setSuccess("");

    try {
      await uploadParticipantPhoto(
        participantId,
        file
      );

      await loadParticipants(selectedGroup);

      setSelectedParticipantId(participantId);
      setRecordsParticipantId(participantId);

      setSuccess(
        "Gambar peserta berjaya dikemas kini."
      );
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Gagal memuat naik gambar.";

      setError(message);
    }

    event.target.value = "";
    setUploadingPhoto(false);
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-white">
        Memuatkan pengisian bacaan…
      </main>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <main className="min-h-screen bg-slate-950 text-white">

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
              href="/dashboard"
              className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20 sm:px-4 sm:text-sm"
            >
              Dashboard
            </Link>

            <Link
              href="/ranking"
              className="rounded-xl bg-yellow-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-yellow-400 sm:px-4 sm:text-sm"
            >
              🏆 Ranking
            </Link>
          </div>

        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">

        <p className="text-sm font-semibold text-emerald-400">
          PENGISIAN BACAAN
        </p>

        <h2 className="mt-2 text-3xl font-black sm:text-4xl">
          Rekod Bacaan Kumpulan
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
          Pilih kumpulan dan masukkan bacaan semua peserta secara pukal.
        </p>

        {error && (
          <div className="mt-6 whitespace-pre-line rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-300">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-300">
            {success}
          </div>
        )}

        {/* KUMPULAN */}
        <div className="mt-7 rounded-3xl border border-emerald-500/20 bg-slate-900 p-5 sm:p-7">

          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

            <div className="w-full flex-1">

              <p className="text-xs font-semibold text-emerald-400">
                LANGKAH 1
              </p>

              <h3 className="mt-1 text-xl font-black sm:text-2xl">
                📋 Pilih Kumpulan
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                Setiap kumpulan boleh mengandungi peserta daripada pelbagai sekolah.
              </p>

              <select
                value={selectedGroup}
                onChange={(event) => {
                  setSelectedGroup(event.target.value);
                  setError("");
                  setSuccess("");
                }}
                className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-4 text-base font-bold text-white outline-none focus:border-emerald-400 sm:text-lg"
              >
                {groups.map((group) => (
                  <option
                    key={group}
                    value={group}
                  >
                    Kumpulan {group}
                  </option>
                ))}
              </select>

            </div>

            <div className="grid grid-cols-3 gap-2 md:w-[360px]">

              <div className="rounded-2xl bg-slate-800 p-3 text-center sm:p-4">
                <p className="text-[10px] font-bold text-slate-500">
                  PESERTA
                </p>

                <p className="mt-1 text-2xl font-black text-white">
                  {participants.length}
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-500/10 p-3 text-center sm:p-4">
                <p className="text-[10px] font-bold text-emerald-400">
                  SUDAH ISI
                </p>

                <p className="mt-1 text-2xl font-black text-emerald-400">
                  {filledCount}
                </p>
              </div>

              <div className="rounded-2xl bg-yellow-500/10 p-3 text-center sm:p-4">
                <p className="text-[10px] font-bold text-yellow-400">
                  BELUM ISI
                </p>

                <p className="mt-1 text-2xl font-black text-yellow-400">
                  {remainingCount}
                </p>
              </div>

            </div>

          </div>
        </div>

        {/* SENARAI PESERTA */}
        <form
          onSubmit={handleSubmitAllReadings}
          className="mt-6"
        >
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-4 sm:p-7">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-xs font-semibold text-emerald-400">
                  LANGKAH 2
                </p>

                <h3 className="mt-1 text-xl font-black sm:text-2xl">
                  📖 Masukkan Bacaan
                </h3>
              </div>

              <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300 sm:text-sm">
                Kosongkan jika peserta tidak membaca hari ini.
              </div>

            </div>

            {participants.length > 0 ? (

              <div className="mt-5 space-y-3">

                {participants.map(
                  (participant, index) => {

                    const school =
                      getSchoolForParticipant(
                        participant
                      );

                    const inputValue =
                      pageInputs[
                        participant.id
                      ] ?? "";

                    const hasInput =
                      inputValue.trim() !== "";

                    return (
                      <div
                        key={participant.id}
                        className={`rounded-2xl border p-4 transition ${
                          hasInput
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-white/5 bg-slate-800/70"
                        }`}
                      >

                        <div className="flex gap-3">

                          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-slate-700 sm:h-14 sm:w-14">

                            {participant.photo_url ? (
                              <img
                                src={participant.photo_url}
                                alt={participant.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-2xl">
                                👤
                              </div>
                            )}

                          </div>

                          <div className="min-w-0 flex-1">

                            <div className="flex items-start justify-between gap-2">

                              <div className="min-w-0">

                                <p className="font-black leading-5">
                                  {index + 1}.{" "}
                                  {participant.name}
                                </p>

                                <p className="mt-1 truncate text-xs text-slate-500">
                                  {school?.code ?? "—"} ·{" "}
                                  {school?.name ??
                                    "Sekolah tidak ditemui"}
                                </p>

                              </div>

                              {hasInput && (
                                <span className="flex-shrink-0 rounded-lg bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-400">
                                  ✓ SIAP
                                </span>
                              )}

                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">

                              <div className="rounded-xl bg-slate-900/80 p-3">

                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                  Semasa
                                </p>

                                <p className="mt-1 text-xl font-black text-emerald-400">
                                  {participant.current_page}

                                  <span className="ml-1 text-xs font-medium text-slate-500">
                                    /604
                                  </span>
                                </p>

                              </div>

                              <div>

                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                  Bacaan Baharu
                                </p>

                                <input
                                  type="number"
                                  min={
                                    participant.current_page +
                                    1
                                  }
                                  max="604"
                                  inputMode="numeric"
                                  value={inputValue}
                                  onChange={(event) =>
                                    handlePageInputChange(
                                      participant.id,
                                      event.target.value
                                    )
                                  }
                                  placeholder={`> ${participant.current_page}`}
                                  className={`mt-1 w-full rounded-xl border px-3 py-3 text-center text-lg font-black text-white outline-none transition ${
                                    hasInput
                                      ? "border-emerald-500/40 bg-emerald-500/10"
                                      : "border-white/10 bg-slate-900"
                                  } focus:border-emerald-400`}
                                />

                              </div>

                            </div>

                            {participant.grandmaster_at && (
                              <div className="mt-3">
                                <span className="rounded-lg bg-yellow-500/10 px-3 py-1 text-xs font-black text-yellow-400">
                                  👑 GRANDMASTER
                                </span>
                              </div>
                            )}

                          </div>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            ) : (

              <div className="mt-5 rounded-2xl border border-white/5 bg-slate-800 p-8 text-center">

                <p className="text-4xl">
                  👥
                </p>

                <p className="mt-3 font-bold text-slate-300">
                  Tiada peserta dalam Kumpulan{" "}
                  {selectedGroup}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Tambahkan peserta dan pilih kumpulan mereka.
                </p>

              </div>

            )}

            {participants.length > 0 && (

              <div className="mt-6">

                <div className="mb-3 flex items-center justify-between text-xs">

                  <span className="text-slate-500">
                    Kemajuan pengisian
                  </span>

                  <span className="font-bold text-emerald-400">
                    {filledCount} / {participants.length}
                  </span>

                </div>

                <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-800">

                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width:
                        participants.length > 0
                          ? `${Math.round(
                              (filledCount /
                                participants.length) *
                                100
                            )}%`
                          : "0%",
                    }}
                  />

                </div>

                <button
                  type="submit"
                  disabled={
                    savingAllReadings ||
                    filledCount === 0
                  }
                  className="w-full rounded-2xl bg-emerald-500 py-5 text-base font-black text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:text-lg"
                >
                  {savingAllReadings
                    ? "⏳ Sedang menyimpan semua bacaan…"
                    : `📖 HANTAR SEMUA BACAAN (${filledCount})`}
                </button>

              </div>

            )}

          </div>
        </form>

        {/* DAFTAR PESERTA */}
        <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-5 sm:p-7">

          <p className="text-xs font-semibold text-emerald-400">
            TAMBAH PESERTA
          </p>

          <h3 className="mt-1 text-xl font-black sm:text-2xl">
            ➕ Daftar Peserta Baharu
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Peserta boleh daripada mana-mana sekolah dan dimasukkan ke mana-mana kumpulan.
          </p>

          <form
            onSubmit={handleAddParticipant}
            className="mt-6 grid gap-4 lg:grid-cols-2"
          >

            {/* SEKOLAH */}
            <div>

              <label className="text-sm font-semibold text-slate-300">
                Sekolah
              </label>

              <select
                value={selectedSchoolId}
                onChange={(event) =>
                  setSelectedSchoolId(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-emerald-400"
              >

                {schools.length === 0 ? (
                  <option value="">
                    Tiada sekolah tersedia
                  </option>
                ) : (
                  schools.map((school) => (
                    <option
                      key={school.id}
                      value={school.id}
                    >
                      {school.code} · {school.name}
                    </option>
                  ))
                )}

              </select>

            </div>

            {/* KUMPULAN */}
            <div>

              <label className="text-sm font-semibold text-slate-300">
                Kumpulan
              </label>

              <select
                value={newParticipantGroup}
                onChange={(event) =>
                  setNewParticipantGroup(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-emerald-400"
              >

                {groups.map((group) => (
                  <option
                    key={group}
                    value={group}
                  >
                    Kumpulan {group}
                  </option>
                ))}

              </select>

            </div>

            {/* NAMA */}
            <div>

              <label className="text-sm font-semibold text-slate-300">
                Nama Peserta
              </label>

              <input
                value={newParticipantName}
                onChange={(event) =>
                  setNewParticipantName(
                    event.target.value
                  )
                }
                placeholder="Nama penuh peserta"
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />

            </div>

            {/* MUKA SURAT */}
            <div>

              <label className="text-sm font-semibold text-slate-300">
                Muka Surat Permulaan
              </label>

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
                placeholder="0"
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />

              <p className="mt-2 text-xs text-slate-500">
                Kemajuan awal tidak dikira sebagai bacaan hari ini.
              </p>

            </div>

            {/* GAMBAR */}
            <div className="lg:col-span-2">

              <label className="text-sm font-semibold text-slate-300">
                Gambar Peserta
              </label>

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
                Gambar akan dimampatkan secara automatik.
              </p>

            </div>

            <div className="lg:col-span-2">

              <button
                type="submit"
                disabled={
                  savingParticipant ||
                  !selectedSchoolId
                }
                className="w-full rounded-xl bg-emerald-500 py-4 font-bold text-slate-950 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400"
              >
                {savingParticipant
                  ? "⏳ Menyimpan peserta…"
                  : "➕ Tambah Peserta"}
              </button>

            </div>

          </form>

        </div>

        {/* REKOD PESERTA */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 sm:p-7">

            <p className="text-xs font-semibold text-emerald-400">
              SEMAKAN
            </p>

            <h3 className="mt-1 text-xl font-bold">
              👤 Lihat Rekod Peserta
            </h3>

            <select
              value={selectedParticipantId}
              onChange={(event) =>
                handleSelectParticipant(
                  event.target.value
                )
              }
              className="mt-5 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-emerald-400"
            >

              <option value="">
                — Pilih peserta —
              </option>

              {participants.map((participant) => (
                <option
                  key={participant.id}
                  value={participant.id}
                >
                  {participant.name} ·{" "}
                  {participant.current_page}/604
                </option>
              ))}

            </select>

            {selectedParticipant && (

              <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">

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
                    disabled={uploadingPhoto}
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

          {/* BACAAN HARI INI */}
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 sm:p-7">

            <h3 className="text-xl font-bold">
              📊 Bacaan Hari Ini
            </h3>

            {recordsParticipant ? (
              <>

                <p className="mt-4 text-lg font-bold">
                  {recordsParticipant.name}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Jumlah bacaan hari ini
                </p>

                <p className="mt-2 text-4xl font-black text-emerald-400">
                  {todayPages}
                </p>

                <p className="text-sm text-slate-400">
                  muka surat hari ini
                </p>

                <div className="mt-6 space-y-3">

                  {records.length > 0 ? (
                    records.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3"
                      >

                        <span className="text-sm text-slate-300">
                          {record.page_from}
                          {" → "}
                          {record.page_to}
                        </span>

                        <span className="font-bold text-emerald-400">
                          +{record.pages_read}
                        </span>

                      </div>
                    ))
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