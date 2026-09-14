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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // =========================================================
  // LOAD SEKOLAH & PESERTA
  // =========================================================

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const [schoolsResult, participantsResult] = await Promise.all([
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
          .order("name", { ascending: true }),
      ]);

      if (schoolsResult.error) {
        throw new Error(
          `GAGAL LOAD SEKOLAH: ${schoolsResult.error.message}`
        );
      }

      if (participantsResult.error) {
        throw new Error(
          `GAGAL LOAD MURID: ${participantsResult.error.message}`
        );
      }

      setSchools((schoolsResult.data ?? []) as School[]);
      setParticipants((participantsResult.data ?? []) as Participant[]);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ Gagal memuatkan data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // =========================================================
  // FILTER
  // =========================================================

  const filteredParticipants = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return participants.filter((participant) => {
      const schoolMatch =
        selectedSchool === "all" ||
        participant.school_id === selectedSchool;

      const groupMatch =
        selectedGroup === "all" ||
        String(participant.group_number ?? "") === selectedGroup;

      const searchMatch =
        !keyword ||
        participant.name.toLowerCase().includes(keyword);

      return schoolMatch && groupMatch && searchMatch;
    });
  }, [participants, selectedSchool, selectedGroup, search]);

  // =========================================================
  // PILIH MURID
  // =========================================================

  function handleSelectParticipant(participant: Participant) {
    setSelectedParticipant(participant);

    setName(participant.name);
    setSchoolId(participant.school_id);
    setGroupNumber(String(participant.group_number ?? 1));
    setCurrentPage(String(participant.current_page ?? 0));

    setPhotoFile(null);
    setPhotoPreview(participant.photo_url);

    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // =========================================================
  // PILIH GAMBAR
  // =========================================================

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("❌ Sila pilih fail gambar.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage("❌ Saiz gambar terlalu besar. Maksimum 10MB.");
      return;
    }

    setPhotoFile(file);

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);

    setMessage("");
  }

  // =========================================================
  // COMPRESS GAMBAR
  // =========================================================

  async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);

      image.onload = () => {
        try {
          const maxWidth = 1000;
          const maxHeight = 1000;

          let width = image.width;
          let height = image.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(
              maxWidth / width,
              maxHeight / height
            );

            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement("canvas");

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");

          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Canvas tidak disokong."));
            return;
          }

          ctx.drawImage(image, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl);

              if (!blob) {
                reject(new Error("Gagal menghasilkan gambar."));
                return;
              }

              resolve(blob);
            },
            "image/jpeg",
            0.82
          );
        } catch (error) {
          URL.revokeObjectURL(objectUrl);
          reject(error);
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Gagal membaca gambar."));
      };

      image.src = objectUrl;
    });
  }

  // =========================================================
  // UPLOAD GAMBAR
  // =========================================================

  async function uploadParticipantPhoto(
    participantId: string,
    file: File
  ) {
    let compressed: Blob;

    try {
      compressed = await compressImage(file);
    } catch (error) {
      throw new Error(
        `LANGKAH COMPRESSION GAMBAR GAGAL: ${
          error instanceof Error
            ? error.message
            : "Tidak diketahui"
        }`
      );
    }

    const filePath = `${participantId}/profile.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("participant-photos")
      .upload(filePath, compressed, {
        cacheControl: "3600",
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(
        `LANGKAH UPLOAD GAMBAR GAGAL: ${uploadError.message}`
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("participant-photos")
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      throw new Error(
        "LANGKAH PUBLIC URL GAGAL: URL gambar tidak berjaya diperoleh."
      );
    }

    return `${publicUrlData.publicUrl}?v=${Date.now()}`;
  }

  // =========================================================
  // SIMPAN PERUBAHAN
  // =========================================================

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedParticipant) {
      setMessage("❌ Sila pilih murid terlebih dahulu.");
      return;
    }

    const cleanName = name.trim();
    const page = Number(currentPage);
    const group = Number(groupNumber);

    if (!cleanName) {
      setMessage("❌ Nama murid diperlukan.");
      return;
    }

    if (!schoolId) {
      setMessage("❌ Sila pilih sekolah.");
      return;
    }

    if (!Number.isInteger(group) || group < 1 || group > 10) {
      setMessage("❌ Kumpulan mestilah antara 1 hingga 10.");
      return;
    }

    if (!Number.isInteger(page) || page < 0 || page > 604) {
      setMessage(
        "❌ Muka surat mestilah antara 0 hingga 604."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      // -------------------------------------------------------
      // 1. KEMASKINI MAKLUMAT PESERTA
      // -------------------------------------------------------

      const { data: updatedParticipant, error: updateError } =
        await supabase.rpc("update_participant", {
          p_participant_id: selectedParticipant.id,
          p_school_id: schoolId,
          p_name: cleanName,
          p_group_number: group,
          p_current_page: page,
        });

      if (updateError) {
        throw new Error(
          `LANGKAH KEMASKINI MURID GAGAL: ${updateError.message}`
        );
      }

      // -------------------------------------------------------
      // 2. UPLOAD GAMBAR JIKA ADA GAMBAR BAHARU
      // -------------------------------------------------------

      let finalPhotoUrl = selectedParticipant.photo_url;

      if (photoFile) {
        finalPhotoUrl = await uploadParticipantPhoto(
          selectedParticipant.id,
          photoFile
        );

        const { error: photoUpdateError } = await supabase.rpc(
          "update_participant_photo",
          {
            p_participant_id: selectedParticipant.id,
            p_photo_url: finalPhotoUrl,
          }
        );

        if (photoUpdateError) {
          throw new Error(
            `LANGKAH SIMPAN URL GAMBAR GAGAL: ${photoUpdateError.message}`
          );
        }
      }

      // -------------------------------------------------------
      // 3. KEMASKINI PAPARAN TEMPATAN
      // -------------------------------------------------------

      const updated: Participant = {
        ...(updatedParticipant as Participant),
        photo_url: finalPhotoUrl,
      };

      setParticipants((current) =>
        current.map((participant) =>
          participant.id === updated.id
            ? updated
            : participant
        )
      );

      setSelectedParticipant(updated);

      setPhotoFile(null);
      setPhotoPreview(finalPhotoUrl);

      setMessage("✅ Maklumat murid berjaya dikemaskini.");

      // Refresh data sebenar dari database
      await loadData();

      // Kekalkan murid yang sedang diedit
      setSelectedParticipant(updated);
      setName(updated.name);
      setSchoolId(updated.school_id);
      setGroupNumber(String(updated.group_number ?? 1));
      setCurrentPage(String(updated.current_page ?? 0));
      setPhotoPreview(updated.photo_url);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ Gagal menyimpan perubahan."
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // BATAL EDIT
  // =========================================================

  function handleCancel() {
    setSelectedParticipant(null);
    setName("");
    setSchoolId("");
    setGroupNumber("1");
    setCurrentPage("0");
    setPhotoFile(null);
    setPhotoPreview(null);
    setMessage("");
  }

  // =========================================================
  // SEKOLAH HELPER
  // =========================================================

  function getSchoolName(schoolId: string) {
    const school = schools.find((item) => item.id === schoolId);

    if (!school) return "Sekolah tidak diketahui";

    return `${school.code} – ${school.name}`;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
          >
            ← Kembali ke Dashboard
          </Link>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h1 className="text-2xl font-black text-slate-900">
              ✏️ EDIT MURID
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Betulkan maklumat murid atau tukar gambar.
            </p>
          </div>
        </div>

        {/* MESSAGE */}
        {message && (
          <div className="mb-5 rounded-xl bg-white p-4 font-semibold shadow-sm ring-1 ring-slate-200">
            {message}
          </div>
        )}

        {/* BORANG EDIT */}
        {selectedParticipant && (
          <form
            onSubmit={handleSave}
            className="mb-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Maklumat Murid
                </h2>

                <p className="text-sm text-slate-500">
                  Kemaskini maklumat di bawah.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                ✕ Batal
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-[180px_1fr]">

              {/* FOTO */}
              <div className="flex flex-col items-center">
                <div className="mb-3 h-40 w-40 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt={name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-6xl">
                      👤
                    </div>
                  )}
                </div>

                <label className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-bold text-white hover:bg-slate-800">
                  📷 Tukar Gambar
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>

                {photoFile && (
                  <p className="mt-2 max-w-[180px] break-words text-center text-xs text-green-600">
                    ✓ {photoFile.name}
                  </p>
                )}
              </div>

              {/* DATA */}
              <div className="grid gap-4 sm:grid-cols-2">

                {/* NAMA */}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Nama Murid
                  </label>

                  <input
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    placeholder="Nama murid"
                  />
                </div>

                {/* SEKOLAH */}
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Sekolah
                  </label>

                  <select
                    value={schoolId}
                    onChange={(event) =>
                      setSchoolId(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
                  >
                    <option value="">
                      -- Pilih Sekolah --
                    </option>

                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.code} – {school.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* KUMPULAN */}
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Kumpulan
                  </label>

                  <select
                    value={groupNumber}
                    onChange={(event) =>
                      setGroupNumber(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
                  >
                    {Array.from(
                      { length: 10 },
                      (_, index) => index + 1
                    ).map((group) => (
                      <option key={group} value={group}>
                        Kumpulan {group}
                      </option>
                    ))}
                  </select>
                </div>

                {/* MUKA SURAT */}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Muka Surat Semasa
                  </label>

                  <input
                    type="number"
                    min={0}
                    max={604}
                    value={currentPage}
                    onChange={(event) =>
                      setCurrentPage(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />

                  <p className="mt-1 text-xs text-slate-500">
                    0 – 604
                  </p>
                </div>

                {/* LEVEL */}
                <div className="sm:col-span-2">
                  <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Level Semasa
                    </p>

                    <p className="mt-1 text-lg font-black text-slate-900">
                      {getLevelIcon(getLevel(Number(currentPage)))}{" "}
                      {getLevel(Number(currentPage))}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* SIMPAN */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="rounded-xl bg-slate-100 px-6 py-3 font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-900 px-6 py-3 font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "⏳ MENYIMPAN..."
                  : "💾 SIMPAN PERUBAHAN"}
              </button>
            </div>
          </form>
        )}

        {/* SENARAI MURID */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">

          <div className="mb-5">
            <h2 className="text-xl font-black text-slate-900">
              🔎 Cari Murid
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Pilih murid yang hendak diedit.
            </p>
          </div>

          {/* FILTER */}
          <div className="grid gap-3 md:grid-cols-3">

            {/* SEARCH */}
            <div className="md:col-span-1">
              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="🔎 Taip nama murid..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
              />
            </div>

            {/* SEKOLAH */}
            <select
              value={selectedSchool}
              onChange={(event) =>
                setSelectedSchool(event.target.value)
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none"
            >
              <option value="all">
                🏫 Semua Sekolah
              </option>

              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.code} – {school.name}
                </option>
              ))}
            </select>

            {/* KUMPULAN */}
            <select
              value={selectedGroup}
              onChange={(event) =>
                setSelectedGroup(event.target.value)
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none"
            >
              <option value="all">
                👥 Semua Kumpulan
              </option>

              {Array.from(
                { length: 10 },
                (_, index) => index + 1
              ).map((group) => (
                <option key={group} value={group}>
                  Kumpulan {group}
                </option>
              ))}
            </select>

          </div>

          {/* COUNT */}
          <div className="mt-4 text-sm font-semibold text-slate-500">
            Menunjukkan{" "}
            <span className="font-black text-slate-900">
              {filteredParticipants.length}
            </span>{" "}
            murid
          </div>

          {/* LOADING */}
          {loading && (
            <div className="py-12 text-center text-slate-500">
              ⏳ Memuatkan senarai murid...
            </div>
          )}

          {/* EMPTY */}
          {!loading && filteredParticipants.length === 0 && (
            <div className="py-12 text-center">
              <div className="text-5xl">🔍</div>

              <p className="mt-3 font-bold text-slate-700">
                Tiada murid ditemui.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Cuba ubah carian atau pilihan filter.
              </p>
            </div>
          )}

          {/* LIST */}
          {!loading && filteredParticipants.length > 0 && (
            <div className="mt-5 grid gap-3">

              {filteredParticipants.map((participant) => {
                const level = getLevel(
                  participant.current_page
                );

                return (
                  <button
                    key={participant.id}
                    type="button"
                    onClick={() =>
                      handleSelectParticipant(participant)
                    }
                    className={`flex w-full items-center gap-4 rounded-2xl border p-3 text-left transition hover:bg-slate-50 ${
                      selectedParticipant?.id === participant.id
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >

                    {/* PHOTO */}
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      {participant.photo_url ? (
                        <img
                          src={participant.photo_url}
                          alt={participant.name}
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

                      <div className="truncate font-black text-slate-900">
                        {participant.name}
                      </div>

                      <div className="mt-1 truncate text-xs text-slate-500">
                        🏫 {getSchoolName(participant.school_id)}
                      </div>

                      <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                        <span>
                          👥 Kumpulan{" "}
                          {participant.group_number ?? "-"}
                        </span>

                        <span>
                          📖 M/S{" "}
                          {participant.current_page}
                        </span>

                        <span>
                          {getLevelIcon(level)} {level}
                        </span>
                      </div>

                    </div>

                    {/* EDIT */}
                    <div className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white">
                      ✏️ EDIT
                    </div>

                  </button>
                );
              })}

            </div>
          )}

        </section>

        {/* FOOTER */}
        <div className="mt-6 text-center">
          <Link
            href="/dashboard"
            className="text-sm font-bold text-slate-600 hover:text-slate-900"
          >
            ← Kembali ke Dashboard
          </Link>
        </div>

      </div>
    </main>
  );
}