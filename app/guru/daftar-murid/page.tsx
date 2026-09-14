"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
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
    blob = await new Promise<Blob | null>(
      (resolve) => {
        canvas.toBlob(
          resolve,
          "image/jpeg",
          quality
        );
      }
    );

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

export default function DaftarMuridPage() {
  const [schools, setSchools] =
    useState<School[]>([]);

  const [selectedSchoolId, setSelectedSchoolId] =
    useState("");

  const [newParticipantName, setNewParticipantName] =
    useState("");

  const [startingPage, setStartingPage] =
    useState("0");

  const [newParticipantPhoto, setNewParticipantPhoto] =
    useState<File | null>(null);

  const [newParticipantGroup, setNewParticipantGroup] =
    useState("1");

  const [loading, setLoading] =
    useState(true);

  const [savingParticipant, setSavingParticipant] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const groups = Array.from(
    { length: 10 },
    (_, index) => index + 1
  );

  // =====================================================
  // LOAD SEKOLAH
  // =====================================================

  async function loadSchools() {
    const {
      data,
      error,
    } = await supabase.rpc(
      "get_active_schools"
    );

    if (error) {
      setError(
        `Gagal memuatkan senarai sekolah: ${error.message}`
      );

      setSchools([]);

      return;
    }

    const schoolData =
      (data ?? []) as School[];

    setSchools(schoolData);

    if (
      schoolData.length > 0
    ) {
      setSelectedSchoolId(
        (current) =>
          current ||
          schoolData[0].id
      );
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
  // UPLOAD GAMBAR
  // =====================================================

  async function uploadParticipantPhoto(
    participantId: string,
    file: File
  ) {
    // ---------------------------------------------------
    // LANGKAH 1 - COMPRESSION
    // ---------------------------------------------------

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

    // ---------------------------------------------------
    // LANGKAH 2 - UPLOAD STORAGE
    // ---------------------------------------------------

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

    // ---------------------------------------------------
    // LANGKAH 3 - DAPATKAN PUBLIC URL
    // ---------------------------------------------------

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

    // ---------------------------------------------------
    // LANGKAH 4 - SIMPAN URL KE PARTICIPANTS
    // ---------------------------------------------------

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
  }

  // =====================================================
  // TAMBAH PESERTA
  // =====================================================

  async function handleAddParticipant(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const name =
      newParticipantName.trim();

    const page =
      Number(startingPage);

    const groupNumber =
      Number(newParticipantGroup);

    // ---------------------------------------------------
    // VALIDASI
    // ---------------------------------------------------

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

    if (
      !Number.isInteger(
        groupNumber
      ) ||
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

    // ---------------------------------------------------
    // LANGKAH 1 - TAMBAH PESERTA
    // ---------------------------------------------------

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
        `LANGKAH TAMBAH PESERTA GAGAL: ${error.message}`
      );

      setSavingParticipant(false);

      return;
    }

    const newParticipant =
      (
        Array.isArray(data)
          ? data[0]
          : data
      ) as Participant | null;

    try {
      // -------------------------------------------------
      // SEMAK ID PESERTA
      // -------------------------------------------------

      if (
        !newParticipant?.id
      ) {
        throw new Error(
          "Peserta berjaya ditambah tetapi ID peserta tidak dapat diperoleh."
        );
      }

      // -------------------------------------------------
      // LANGKAH 2 - SIMPAN KUMPULAN
      // -------------------------------------------------

      const {
        error: groupError,
      } =
        await supabase.rpc(
          "set_participant_group",
          {
            p_participant_id:
              newParticipant.id,

            p_group_number:
              groupNumber,
          }
        );

      if (groupError) {
        throw new Error(
          `LANGKAH SIMPAN KUMPULAN GAGAL: ${groupError.message}`
        );
      }

      // -------------------------------------------------
      // LANGKAH 3 - SIMPAN GAMBAR
      // -------------------------------------------------

      if (
        newParticipantPhoto
      ) {
        await uploadParticipantPhoto(
          newParticipant.id,
          newParticipantPhoto
        );
      }

      // -------------------------------------------------
      // RESET BORANG
      // -------------------------------------------------

      setNewParticipantName(
        ""
      );

      setStartingPage(
        "0"
      );

      setNewParticipantPhoto(
        null
      );

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      setSuccess(
        `✅ Peserta "${name}" berjaya didaftarkan ke Kumpulan ${groupNumber}.`
      );
    } catch (
      addError
    ) {
      const message =
        addError instanceof Error
          ? addError.message
          : "Gagal menyimpan peserta.";

      setError(message);
    }

    setSavingParticipant(
      false
    );
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-white">
        Memuatkan pendaftaran murid…
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

        {/* BACK BUTTON */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:border-emerald-400/30 hover:text-white"
        >
          ← Kembali ke Dashboard
        </Link>

        {/* TITLE */}
        <div className="mt-7">

          <p className="text-sm font-semibold text-emerald-400">
            PENDAFTARAN MURID
          </p>

          <h2 className="mt-2 text-3xl font-black sm:text-4xl">
            ➕ Daftar Murid Baharu
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Daftarkan murid daripada mana-mana sekolah dan
            masukkan mereka ke dalam Kumpulan 1 hingga
            Kumpulan 10.
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

        {/* BORANG */}
        <div className="mt-7 rounded-3xl border border-white/10 bg-slate-900 p-5 sm:p-8">

          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">

            <p className="text-sm font-bold text-emerald-400">
              📌 Maklumat Pendaftaran
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">
              Pastikan sekolah, kumpulan, nama dan muka
              surat permulaan adalah betul sebelum menekan
              butang tambah.
            </p>

          </div>

          <form
            onSubmit={
              handleAddParticipant
            }
            className="grid gap-5 lg:grid-cols-2"
          >

            {/* SEKOLAH */}
            <div>

              <label className="text-sm font-semibold text-slate-300">
                🏫 Sekolah
              </label>

              <select
                value={
                  selectedSchoolId
                }
                onChange={(
                  event
                ) =>
                  setSelectedSchoolId(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-4 text-white outline-none focus:border-emerald-400"
              >

                {schools.length ===
                0 ? (
                  <option value="">
                    Tiada sekolah tersedia
                  </option>
                ) : (
                  schools.map(
                    (
                      school
                    ) => (
                      <option
                        key={
                          school.id
                        }
                        value={
                          school.id
                        }
                      >
                        {
                          school.code
                        }{" "}
                        ·{" "}
                        {
                          school.name
                        }
                      </option>
                    )
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
                value={
                  newParticipantGroup
                }
                onChange={(
                  event
                ) =>
                  setNewParticipantGroup(
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
                      Kumpulan{" "}
                      {group}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* NAMA */}
            <div>

              <label className="text-sm font-semibold text-slate-300">
                👤 Nama Murid
              </label>

              <input
                value={
                  newParticipantName
                }
                onChange={(
                  event
                ) =>
                  setNewParticipantName(
                    event.target.value
                  )
                }
                placeholder="Masukkan nama penuh murid"
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-4 text-white outline-none focus:border-emerald-400"
              />

            </div>

            {/* MUKA SURAT */}
            <div>

              <label className="text-sm font-semibold text-slate-300">
                📖 Muka Surat Permulaan
              </label>

              <input
                type="number"
                min="0"
                max="604"
                value={
                  startingPage
                }
                onChange={(
                  event
                ) =>
                  setStartingPage(
                    event.target.value
                  )
                }
                placeholder="0"
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-4 text-white outline-none focus:border-emerald-400"
              />

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Contoh: jika murid sudah membaca sehingga
                muka surat 100 sebelum menyertai program,
                masukkan{" "}
                <strong>
                  100
                </strong>
                .
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Kemajuan awal tidak dikira sebagai bacaan
                harian.
              </p>

            </div>

            {/* GAMBAR */}
            <div className="lg:col-span-2">

              <label className="text-sm font-semibold text-slate-300">
                📷 Gambar Murid
              </label>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(
                  event: ChangeEvent<HTMLInputElement>
                ) =>
                  setNewParticipantPhoto(
                    event.target.files?.[0] ??
                      null
                  )
                }
                className="mt-2 block w-full text-sm text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-500 file:px-4 file:py-3 file:font-bold file:text-slate-950 hover:file:bg-emerald-400"
              />

              <p className="mt-2 text-xs text-slate-500">
                JPG, PNG atau WebP. Gambar akan dimampatkan
                secara automatik.
              </p>

              {newParticipantPhoto && (
                <p className="mt-2 text-xs font-semibold text-emerald-400">
                  ✓{" "}
                  {
                    newParticipantPhoto.name
                  }
                </p>
              )}

            </div>

            {/* BUTTON */}
            <div className="lg:col-span-2">

              <button
                type="submit"
                disabled={
                  savingParticipant ||
                  !selectedSchoolId
                }
                className="w-full rounded-2xl bg-emerald-500 py-5 text-base font-black text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:text-lg"
              >
                {savingParticipant
                  ? "⏳ Sedang mendaftarkan murid…"
                  : "➕ DAFTAR MURID"}
              </button>

            </div>

          </form>

        </div>

        {/* INFO */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">

            <p className="text-2xl">
              🏫
            </p>

            <p className="mt-2 font-bold">
              Pelbagai Sekolah
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Murid boleh didaftarkan daripada mana-mana
              sekolah yang aktif.
            </p>

          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">

            <p className="text-2xl">
              👥
            </p>

            <p className="mt-2 font-bold">
              10 Kumpulan
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Pilih Kumpulan 1 hingga Kumpulan 10.
            </p>

          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">

            <p className="text-2xl">
              📷
            </p>

            <p className="mt-2 font-bold">
              Gambar Murid
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Gambar akan dimampatkan secara automatik
              sebelum dimuat naik.
            </p>

          </div>

        </div>

        {/* BOTTOM BACK BUTTON */}
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