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

function getLevel(page: number) {
  if (page >= 604) return "GRANDMASTER";
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

export default function EditMuridPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const [selectedSchool, setSelectedSchool] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [search, setSearch] = useState("");

  const [selectedParticipant, setSelectedParticipant] =
    useState<Participant | null>(null);

  const [name, setName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [groupNumber, setGroupNumber] = useState("1");
  const [currentPage, setCurrentPage] = useState("0");

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const groups = Array.from(
    { length: 10 },
    (_, index) => index + 1
  );

  // =====================================================
  // LOAD DATA
  // =====================================================

  async function loadData() {
    setLoading(true);

    const [schoolsResult, participantsResult] =
      await Promise.all([
        supabase.rpc("get_active_schools"),

        supabase
          .from("participants")
          .select(
            `
              id,
              name,
              photo_url,
              current_page,
              grandmaster_at,
              school_id,
              group_number
            `
          )
          .eq("is_active", true)
          .order("name", {
            ascending: true,
          }),
      ]);

    if (schoolsResult.error) {
      setError(
        `Gagal memuatkan sekolah: ${schoolsResult.error.message}`
      );
    } else {
      setSchools(
        (schoolsResult.data ?? []) as School[]
      );
    }

    if (participantsResult.error) {
      setError(
        `Gagal memuatkan murid: ${participantsResult.error.message}`
      );
    } else {
      setParticipants(
        (participantsResult.data ?? []) as Participant[]
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  // =====================================================
  // FILTER
  // =====================================================

  const filteredParticipants = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    return participants.filter(
      (participant) => {
        const schoolMatch =
          selectedSchool === "all" ||
          participant.school_id ===
            selectedSchool;

        const groupMatch =
          selectedGroup === "all" ||
          String(
            participant.group_number ?? ""
          ) === selectedGroup;

        const searchMatch =
          !keyword ||
          participant.name
            .toLowerCase()
            .includes(keyword);

        return (
          schoolMatch &&
          groupMatch &&
          searchMatch
        );
      }
    );
  }, [
    participants,
    selectedSchool,
    selectedGroup,
    search,
  ]);

  // =====================================================
  // PILIH MURID
  // =====================================================

  function handleSelectParticipant(
    participant: Participant
  ) {
    setSelectedParticipant(
      participant
    );

    setName(participant.name);

    setSchoolId(
      participant.school_id
    );

    setGroupNumber(
      String(
        participant.group_number ?? 1
      )
    );

    setCurrentPage(
      String(
        participant.current_page ?? 0
      )
    );

    setPhotoFile(null);

    setPhotoPreview(
      participant.photo_url
    );

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =====================================================
  // PILIH GAMBAR
  // =====================================================

  function handlePhotoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(
        "Sila pilih fail gambar."
      );
      return;
    }

    if (
      file.size >
      15 * 1024 * 1024
    ) {
      setError(
        "Gambar terlalu besar. Had maksimum ialah 15 MB."
      );
      return;
    }

    setPhotoFile(file);

    const previewUrl =
      URL.createObjectURL(file);

    setPhotoPreview(previewUrl);

    setError("");
    setSuccess("");
  }

  // =====================================================
  // UPLOAD GAMBAR
  // =====================================================

  async function uploadParticipantPhoto(
    participantId: string,
    file: File
  ) {
    let compressedFile: File;

    try {
      compressedFile =
        await compressImage(file);
    } catch (compressionError) {
      const message =
        compressionError instanceof Error
          ? compressionError.message
          : "Gagal memproses gambar.";

      throw new Error(
        `LANGKAH COMPRESSION GAMBAR GAGAL: ${message}`
      );
    }

    const path =
      `${participantId}/profile.jpg`;

    const {
      error: uploadError,
    } =
      await supabase.storage
        .from("participant-photos")
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
        `LANGKAH UPLOAD GAMBAR GAGAL: ${uploadError.message}`
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
        .getPublicUrl(path);

    if (!publicUrl) {
      throw new Error(
        "LANGKAH PUBLIC URL GAGAL: URL gambar tidak dapat diperoleh."
      );
    }

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
        `LANGKAH SIMPAN URL GAMBAR GAGAL: ${photoError.message}`
      );
    }

    return photoUrl;
  }

  // =====================================================
  // SIMPAN PERUBAHAN
  // =====================================================

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedParticipant) {
      setError(
        "Sila pilih murid terlebih dahulu."
      );
      return;
    }

    const cleanName =
      name.trim();

    const page =
      Number(currentPage);

    const group =
      Number(groupNumber);

    if (!cleanName) {
      setError(
        "Nama murid diperlukan."
      );
      return;
    }

    if (!schoolId) {
      setError(
        "Sila pilih sekolah."
      );
      return;
    }

    if (
      !Number.isInteger(group) ||
      group < 1 ||
      group > 10
    ) {
      setError(
        "Kumpulan mestilah antara 1 hingga 10."
      );
      return;
    }

    if (
      !Number.isInteger(page) ||
      page < 0 ||
      page > 604
    ) {
      setError(
        "Muka surat mestilah antara 0 hingga 604."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // -------------------------------------------------
      // KEMASKINI MAKLUMAT
      // -------------------------------------------------

      const {
        data,
        error: updateError,
      } =
        await supabase.rpc(
          "update_participant",
          {
            p_participant_id:
              selectedParticipant.id,

            p_school_id:
              schoolId,

            p_name:
              cleanName,

            p_group_number:
              group,

            p_current_page:
              page,
          }
        );

      if (updateError) {
        throw new Error(
          `LANGKAH KEMASKINI MURID GAGAL: ${updateError.message}`
        );
      }

      let finalPhotoUrl =
        selectedParticipant.photo_url;

      // -------------------------------------------------
      // UPLOAD GAMBAR JIKA ADA
      // -------------------------------------------------

      if (photoFile) {
        finalPhotoUrl =
          await uploadParticipantPhoto(
            selectedParticipant.id,
            photoFile
          );
      }

      const updatedParticipant: Participant =
        {
          ...(data as Participant),
          photo_url:
            finalPhotoUrl,
        };

      // -------------------------------------------------
      // UPDATE STATE
      // -------------------------------------------------

      setParticipants(
        (current) =>
          current.map(
            (participant) =>
              participant.id ===
              updatedParticipant.id
                ? updatedParticipant
                : participant
          )
      );

      setSelectedParticipant(
        updatedParticipant
      );

      setPhotoFile(null);

      setPhotoPreview(
        finalPhotoUrl
      );

      setSuccess(
        `✅ Maklumat "${cleanName}" berjaya dikemaskini.`
      );

      // Refresh database
      await loadData();

    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Gagal menyimpan perubahan."
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // BATAL
  // =====================================================

  function handleCancel() {
    setSelectedParticipant(null);

    setName("");
    setSchoolId("");
    setGroupNumber("1");
    setCurrentPage("0");

    setPhotoFile(null);
    setPhotoPreview(null);

    setError("");
    setSuccess("");
  }

  // =====================================================
  // SEKOLAH
  // =====================================================

  function getSchoolName(
    schoolId: string
  ) {
    const school =
      schools.find(
        (item) =>
          item.id === schoolId
      );

    if (!school) {
      return "Sekolah tidak diketahui";
    }

    return `${school.code} · ${school.name}`;
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-white">
        Memuatkan halaman Edit Murid…
      </main>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}
      <header className="border-b border-white/10 bg-slate-900">

        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6">

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

          <Link
            href="/dashboard"
            className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold transition hover:bg-white/20 sm:px-4 sm:text-sm"
          >
            🏠 Dashboard
          </Link>

        </div>

      </header>

      {/* CONTENT */}
      <section className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">

        {/* BACK */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:border-emerald-400/30 hover:text-white"
        >
          ← Kembali ke Dashboard
        </Link>

        {/* TITLE */}
        <div className="mt-7">

          <p className="text-sm font-semibold text-emerald-400">
            PENGURUSAN MURID
          </p>

          <h2 className="mt-2 text-3xl font-black sm:text-4xl">
            ✏️ Edit Murid
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Cari murid untuk membetulkan maklumat,
            menukar kumpulan atau memuat naik gambar.
          </p>

        </div>

        {/* ERROR */}
        {error && (
          <div className="mt-6 whitespace-pre-line rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-300">
            ❌ {error}
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-300">
            {success}
          </div>
        )}

        {/* EDIT FORM */}
        {selectedParticipant && (
          <div className="mt-7 rounded-3xl border border-white/10 bg-slate-900 p-5 sm:p-8">

            <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">

              <p className="text-sm font-bold text-emerald-400">
                ✏️ Maklumat Murid
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">
                Betulkan maklumat murid atau tukar
                gambar. Pastikan semua maklumat betul
                sebelum menekan simpan.
              </p>

            </div>

            <form
              onSubmit={handleSave}
              className="grid gap-5 lg:grid-cols-2"
            >

              {/* FOTO */}
              <div className="lg:col-span-2">

                <label className="text-sm font-semibold text-slate-300">
                  📷 Gambar Murid
                </label>

                <div className="mt-3 flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-slate-800 p-5 sm:flex-row">

                  <div className="h-32 w-32 shrink-0 overflow-hidden rounded-2xl bg-slate-700 ring-1 ring-white/10">

                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt={name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-5xl">
                        👤
                      </div>
                    )}

                  </div>

                  <div className="w-full">

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={
                        handlePhotoChange
                      }
                      className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-500 file:px-4 file:py-3 file:font-bold file:text-slate-950 hover:file:bg-emerald-400"
                    />

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      JPG, PNG atau WebP.
                      Gambar akan dimampatkan secara
                      automatik.
                    </p>

                    {photoFile && (
                      <p className="mt-2 text-xs font-semibold text-emerald-400">
                        ✓ Gambar baharu dipilih:{" "}
                        {photoFile.name}
                      </p>
                    )}

                  </div>

                </div>

              </div>

              {/* NAMA */}
              <div>

                <label className="text-sm font-semibold text-slate-300">
                  👤 Nama Murid
                </label>

                <input
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="Nama penuh murid"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-4 text-white outline-none focus:border-emerald-400"
                />

              </div>

              {/* SEKOLAH */}
              <div>

                <label className="text-sm font-semibold text-slate-300">
                  🏫 Sekolah
                </label>

                <select
                  value={schoolId}
                  onChange={(event) =>
                    setSchoolId(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-4 text-white outline-none focus:border-emerald-400"
                >

                  {schools.map(
                    (school) => (
                      <option
                        key={school.id}
                        value={school.id}
                      >
                        {school.code} ·{" "}
                        {school.name}
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* KUMPULAN */}
              <div>

                <label className="text-sm font-semibold text-slate-300">
                  👥 Kumpulan
                </label>

                <select
                  value={groupNumber}
                  onChange={(event) =>
                    setGroupNumber(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-4 text-white outline-none focus:border-emerald-400"
                >

                  {groups.map(
                    (group) => (
                      <option
                        key={group}
                        value={group}
                      >
                        Kumpulan {group}
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* MUKA SURAT */}
              <div>

                <label className="text-sm font-semibold text-slate-300">
                  📖 Muka Surat Semasa
                </label>

                <input
                  type="number"
                  min="0"
                  max="604"
                  value={currentPage}
                  onChange={(event) =>
                    setCurrentPage(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-4 text-white outline-none focus:border-emerald-400"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Nilai antara 0 hingga 604.
                </p>

              </div>

              {/* LEVEL */}
              <div className="lg:col-span-2">

                <div className="rounded-2xl border border-white/10 bg-slate-800 p-5">

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Level Berdasarkan Muka Surat
                  </p>

                  <p className="mt-2 text-2xl font-black text-white">
                    {getLevelIcon(
                      getLevel(
                        Number(currentPage)
                      )
                    )}{" "}
                    {getLevel(
                      Number(currentPage)
                    )}
                  </p>

                </div>

              </div>

              {/* BUTTON */}
              <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row">

                <button
                  type="button"
                  onClick={
                    handleCancel
                  }
                  disabled={saving}
                  className="rounded-2xl border border-white/10 bg-slate-800 px-6 py-4 font-bold text-slate-300 transition hover:bg-slate-700 disabled:opacity-50 sm:w-auto"
                >
                  ✕ Batal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-emerald-500 py-4 text-base font-black text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:text-lg"
                >
                  {saving
                    ? "⏳ Menyimpan perubahan…"
                    : "💾 SIMPAN PERUBAHAN"}
                </button>

              </div>

            </form>

          </div>
        )}

        {/* SEARCH */}
        <div className="mt-7 rounded-3xl border border-white/10 bg-slate-900 p-5 sm:p-8">

          <div className="mb-6">

            <p className="text-sm font-semibold text-emerald-400">
              SENARAI MURID
            </p>

            <h3 className="mt-2 text-2xl font-black">
              🔎 Cari Murid
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              Pilih murid yang hendak diedit.
            </p>

          </div>

          {/* FILTER */}
          <div className="grid gap-4 lg:grid-cols-3">

            <div>

              <label className="text-sm font-semibold text-slate-300">
                🔎 Nama
              </label>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Taip nama murid..."
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-4 text-white outline-none focus:border-emerald-400"
              />

            </div>

            <div>

              <label className="text-sm font-semibold text-slate-300">
                🏫 Sekolah
              </label>

              <select
                value={selectedSchool}
                onChange={(event) =>
                  setSelectedSchool(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-4 text-white outline-none focus:border-emerald-400"
              >

                <option value="all">
                  Semua Sekolah
                </option>

                {schools.map(
                  (school) => (
                    <option
                      key={school.id}
                      value={school.id}
                    >
                      {school.code} ·{" "}
                      {school.name}
                    </option>
                  )
                )}

              </select>

            </div>

            <div>

              <label className="text-sm font-semibold text-slate-300">
                👥 Kumpulan
              </label>

              <select
                value={selectedGroup}
                onChange={(event) =>
                  setSelectedGroup(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-4 text-white outline-none focus:border-emerald-400"
              >

                <option value="all">
                  Semua Kumpulan
                </option>

                {groups.map(
                  (group) => (
                    <option
                      key={group}
                      value={group}
                    >
                      Kumpulan {group}
                    </option>
                  )
                )}

              </select>

            </div>

          </div>

          {/* COUNT */}
          <div className="mt-5 rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-sm text-slate-400">
            Menunjukkan{" "}
            <span className="font-black text-emerald-400">
              {filteredParticipants.length}
            </span>{" "}
            murid
          </div>

          {/* EMPTY */}
          {filteredParticipants.length === 0 && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-800 p-10 text-center">

              <div className="text-5xl">
                🔍
              </div>

              <p className="mt-3 font-bold text-slate-300">
                Tiada murid ditemui.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Cuba ubah carian atau pilihan
                sekolah/kumpulan.
              </p>

            </div>
          )}

          {/* LIST */}
          {filteredParticipants.length > 0 && (
            <div className="mt-5 grid gap-3">

              {filteredParticipants.map(
                (participant) => {
                  const level =
                    getLevel(
                      participant.current_page
                    );

                  const selected =
                    selectedParticipant?.id ===
                    participant.id;

                  return (
                    <button
                      key={participant.id}
                      type="button"
                      onClick={() =>
                        handleSelectParticipant(
                          participant
                        )
                      }
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-emerald-400/50 bg-emerald-500/10"
                          : "border-white/10 bg-slate-800 hover:border-emerald-400/30 hover:bg-slate-700"
                      }`}
                    >

                      <div className="flex items-center gap-4">

                        {/* PHOTO */}
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-700">

                          {participant.photo_url ? (
                            <img
                              src={
                                participant.photo_url
                              }
                              alt={
                                participant.name
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-3xl">
                              👤
                            </div>
                          )}

                        </div>

                        {/* INFO */}
                        <div className="min-w-0 flex-1">

                          <div className="truncate font-black text-white">
                            {participant.name}
                          </div>

                          <div className="mt-1 truncate text-xs text-slate-400">
                            🏫{" "}
                            {getSchoolName(
                              participant.school_id
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-400">

                            <span className="rounded-lg bg-slate-700 px-2 py-1">
                              👥 Kumpulan{" "}
                              {participant.group_number ??
                                "-"}
                            </span>

                            <span className="rounded-lg bg-slate-700 px-2 py-1">
                              📖 M/S{" "}
                              {
                                participant.current_page
                              }
                            </span>

                            <span className="rounded-lg bg-slate-700 px-2 py-1">
                              {getLevelIcon(
                                level
                              )}{" "}
                              {level}
                            </span>

                          </div>

                        </div>

                        {/* EDIT */}
                        <div className="hidden shrink-0 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-slate-950 sm:block">
                          ✏️ EDIT
                        </div>

                      </div>

                      <div className="mt-3 text-right text-xs font-bold text-emerald-400 sm:hidden">
                        ✏️ Tekan untuk Edit
                      </div>

                    </button>
                  );
                }
              )}

            </div>
          )}

        </div>

        {/* INFO */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">

            <p className="text-2xl">
              ✏️
            </p>

            <p className="mt-2 font-bold">
              Betulkan Maklumat
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Nama, sekolah, kumpulan dan muka surat
              boleh dikemaskini.
            </p>

          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">

            <p className="text-2xl">
              📷
            </p>

            <p className="mt-2 font-bold">
              Tukar Gambar
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Guru boleh menambah atau menggantikan
              gambar murid.
            </p>

          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">

            <p className="text-2xl">
              👥
            </p>

            <p className="mt-2 font-bold">
              Urus Kumpulan
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Pindahkan murid ke Kumpulan 1 hingga
              Kumpulan 10.
            </p>

          </div>

        </div>

        {/* BACK */}
        <div className="mt-8 text-center">

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-300 transition hover:border-emerald-400/30 hover:text-white"
          >
            ← Kembali ke Dashboard
          </Link>

        </div>

      </section>

    </main>
  );
}