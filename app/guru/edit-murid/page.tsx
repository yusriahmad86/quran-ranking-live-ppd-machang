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
  is_active?: boolean;
};

type Participant = {
  id: string;
  school_id: string;
  name: string;
  group_number: number;
  current_page: number;
  photo_url: string | null;
  is_active: boolean;
  grandmaster_at?: string | null;
};

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
/* COMPRESS GAMBAR */
/* ========================================= */

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Fail yang dipilih bukan gambar.");
  }

  if (file.size > 15 * 1024 * 1024) {
    throw new Error(
      "Saiz gambar terlalu besar. Maksimum 15MB."
    );
  }

  const image = await createImageBitmap(file);

  const maxDimension = 800;

  const scale = Math.min(
    1,
    maxDimension /
      Math.max(
        image.width,
        image.height
      )
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

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

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

  const targetSize = 250 * 1024;

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
      blob.size <= targetSize
    ) {
      break;
    }

    quality -= 0.1;
  }

  if (!blob) {
    throw new Error(
      "Gagal menghasilkan gambar."
    );
  }

  if (
    blob.size >
    3 * 1024 * 1024
  ) {
    throw new Error(
      "Gambar masih terlalu besar selepas dimampatkan."
    );
  }

  return new File(
    [blob],
    "profile.jpg",
    {
      type: "image/jpeg",
    }
  );
}

export default function EditMuridPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedId, setSelectedId] = useState("");

  const [search, setSearch] = useState("");
  const [filterSchool, setFilterSchool] = useState("");
  const [filterGroup, setFilterGroup] = useState("");

  const [formName, setFormName] = useState("");
  const [formSchoolId, setFormSchoolId] = useState("");
  const [formGroup, setFormGroup] = useState("1");
  const [formCurrentPage, setFormCurrentPage] = useState("0");

  const [formPhotoFile, setFormPhotoFile] = useState<File | null>(null);
  const [formPhotoPreview, setFormPhotoPreview] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [
        { data: schoolData, error: schoolError },
        { data: participantData, error: participantError },
      ] = await Promise.all([
        supabase.rpc("get_active_schools"),

        supabase
          .from("participants")
          .select(
            `
              id,
              school_id,
              name,
              group_number,
              current_page,
              photo_url,
              is_active,
              grandmaster_at
            `
          )
          .eq("is_active", true)
          .order("name", { ascending: true }),
      ]);

      if (schoolError) {
        throw schoolError;
      }

      if (participantError) {
        throw participantError;
      }

      setSchools((schoolData ?? []) as School[]);
      setParticipants((participantData ?? []) as Participant[]);
    } catch (err: any) {
      setError(
        err?.message ||
          "Gagal memuatkan data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredParticipants = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return participants.filter((participant) => {
      const matchesSearch =
        !keyword ||
        participant.name
          .toLowerCase()
          .includes(keyword);

      const matchesSchool =
        !filterSchool ||
        participant.school_id === filterSchool;

      const matchesGroup =
        !filterGroup ||
        String(participant.group_number) === filterGroup;

      return (
        matchesSearch &&
        matchesSchool &&
        matchesGroup
      );
    });
  }, [
    participants,
    search,
    filterSchool,
    filterGroup,
  ]);

  const selectedParticipant = useMemo(
    () =>
      participants.find(
        (participant) =>
          participant.id === selectedId
      ) ?? null,
    [participants, selectedId]
  );

  const formLevel = getLevel(
    Math.max(
      0,
      Math.min(
        604,
        Number(formCurrentPage) || 0
      )
    )
  );

  function selectParticipant(
    participant: Participant
  ) {
    setSelectedId(participant.id);
    setFormName(participant.name);
    setFormSchoolId(participant.school_id);
    setFormGroup(
      String(participant.group_number)
    );
    setFormCurrentPage(
      String(participant.current_page)
    );

    setFormPhotoFile(null);
    setFormPhotoPreview(
      participant.photo_url || ""
    );

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleCancel() {
    setSelectedId("");
    setFormName("");
    setFormSchoolId("");
    setFormGroup("1");
    setFormCurrentPage("0");
    setFormPhotoFile(null);
    setFormPhotoPreview("");

    setError("");
    setSuccess("");
  }

  function handlePhotoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setSuccess("");

    if (!file.type.startsWith("image/")) {
      setError(
        "Sila pilih fail gambar."
      );
      return;
    }

    setFormPhotoFile(file);

    const previewUrl =
      URL.createObjectURL(file);

    setFormPhotoPreview(previewUrl);
  }

  async function uploadParticipantPhoto(
    participantId: string,
    file: File
  ) {
    const compressedFile =
      await compressImage(file);

    const path =
      `${participantId}/profile.jpg`;

    const { error: uploadError } =
      await supabase.storage
        .from("participant-photos")
        .upload(
          path,
          compressedFile,
          {
            cacheControl: "3600",
            upsert: true,
            contentType: "image/jpeg",
          }
        );

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: publicUrlData,
    } = supabase.storage
      .from("participant-photos")
      .getPublicUrl(path);

    const publicUrl =
      publicUrlData.publicUrl;

    const {
      error: photoRpcError,
    } = await supabase.rpc(
      "update_participant_photo",
      {
        p_participant_id:
          participantId,
        p_photo_url: publicUrl,
      }
    );

    if (photoRpcError) {
      throw photoRpcError;
    }

    return publicUrl;
  }

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

    setError("");
    setSuccess("");

    const name =
      formName.trim();

    const schoolId =
      formSchoolId;

    const groupNumber =
      Number(formGroup);

    const currentPage =
      Number(formCurrentPage);

    if (!name) {
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
      !Number.isInteger(groupNumber) ||
      groupNumber < 1 ||
      groupNumber > 10
    ) {
      setError(
        "Kumpulan mestilah antara 1 hingga 10."
      );
      return;
    }

    if (
      !Number.isInteger(currentPage) ||
      currentPage < 0 ||
      currentPage > 604
    ) {
      setError(
        "Muka surat mestilah antara 0 hingga 604."
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data,
        error: updateError,
      } = await supabase.rpc(
        "update_participant",
        {
          p_participant_id:
            selectedParticipant.id,
          p_school_id: schoolId,
          p_name: name,
          p_group_number:
            groupNumber,
          p_current_page:
            currentPage,
        }
      );

      if (updateError) {
        throw updateError;
      }

      let updatedPhotoUrl =
        selectedParticipant.photo_url ||
        null;

      if (formPhotoFile) {
        updatedPhotoUrl =
          await uploadParticipantPhoto(
            selectedParticipant.id,
            formPhotoFile
          );
      }

      const updatedParticipant:
        Participant = {
          ...(data as Participant),
          photo_url:
            updatedPhotoUrl,
        };

      setParticipants(
        (current) =>
          current.map(
            (participant) =>
              participant.id ===
              selectedParticipant.id
                ? updatedParticipant
                : participant
          )
      );

      setSuccess(
        "✓ Maklumat murid berjaya dikemaskini."
      );

      setFormPhotoFile(null);

      await loadData();
    } catch (err: any) {
      setError(
        err?.message ||
          "Gagal menyimpan perubahan murid."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedParticipant) {
      setError(
        "Sila pilih murid terlebih dahulu."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `ANDA PASTI MAHU PADAM MURID INI?\n\n` +
          `Nama: ${selectedParticipant.name}\n\n` +
          `Tindakan ini akan memadam data murid dan rekod bacaan murid tersebut.\n\n` +
          `Tindakan ini tidak boleh dibuat asal semula.`
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const {
        error: deleteError,
      } = await supabase.rpc(
        "delete_participant",
        {
          p_participant_id:
            selectedParticipant.id,
        }
      );

      if (deleteError) {
        throw deleteError;
      }

      setParticipants(
        (current) =>
          current.filter(
            (participant) =>
              participant.id !==
              selectedParticipant.id
          )
      );

      setSelectedId("");
      setFormName("");
      setFormSchoolId("");
      setFormGroup("1");
      setFormCurrentPage("0");
      setFormPhotoFile(null);
      setFormPhotoPreview("");

      setSuccess(
        `✓ Murid "${selectedParticipant.name}" berjaya dipadam.`
      );

      await loadData();
    } catch (err: any) {
      setError(
        err?.message ||
          "Gagal memadam murid."
      );
    } finally {
      setDeleting(false);
    }
  }

  function getSchoolName(
    schoolId: string
  ) {
    const school = schools.find(
      (item) =>
        item.id === schoolId
    );

    if (!school) {
      return "Sekolah tidak diketahui";
    }

    return `${school.code} – ${school.name}`;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-400">
              QURAN RANKING LIVE
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              EDIT MURID
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Kemaskini maklumat peserta
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-emerald-500 hover:text-emerald-400"
          >
            ← Dashboard
          </Link>
        </div>

        {/* ALERT */}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
            {success}
          </div>
        )}

        {/* EDIT FORM */}

        {selectedParticipant && (
          <section className="mb-8 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl">

            <div className="border-b border-slate-800 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black">
                    ✏️ Kemaskini Maklumat Murid
                  </h2>

                  <p className="text-xs text-slate-400">
                    ID: {selectedParticipant.id}
                  </p>
                </div>

                <div className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
                  Kumpulan{" "}
                  {selectedParticipant.group_number}
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSave}
              className="p-5 sm:p-6"
            >
              <div className="grid gap-6 lg:grid-cols-[220px_1fr]">

                {/* PHOTO */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-300">
                    Foto Murid
                  </label>

                  <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                    {formPhotoPreview ? (
                      <img
                        src={formPhotoPreview}
                        alt={
                          formName ||
                          "Foto murid"
                        }
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center text-6xl">
                        👤
                      </div>
                    )}
                  </div>

                  <label className="mt-3 block cursor-pointer rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-center text-sm font-bold text-slate-200 transition hover:border-emerald-500 hover:text-emerald-400">
                    📷 Tukar Foto

                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={
                        handlePhotoChange
                      }
                    />
                  </label>

                  <p className="mt-2 text-center text-[11px] text-slate-500">
                    JPG / PNG • maksimum 15MB
                  </p>
                </div>

                {/* FORM */}

                <div className="grid gap-4 sm:grid-cols-2">

                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-bold text-slate-300">
                      Nama Murid
                    </label>

                    <input
                      type="text"
                      value={formName}
                      onChange={(e) =>
                        setFormName(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-500"
                      placeholder="Nama murid"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-300">
                      Sekolah
                    </label>

                    <select
                      value={formSchoolId}
                      onChange={(e) =>
                        setFormSchoolId(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                    >
                      <option value="">
                        Pilih sekolah
                      </option>

                      {schools.map(
                        (school) => (
                          <option
                            key={school.id}
                            value={school.id}
                          >
                            {school.code} –{" "}
                            {school.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-300">
                      Kumpulan
                    </label>

                    <select
                      value={formGroup}
                      onChange={(e) =>
                        setFormGroup(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                    >
                      {Array.from(
                        {
                          length: 10,
                        },
                        (_, index) =>
                          index + 1
                      ).map(
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

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-300">
                      Muka Surat Semasa
                    </label>

                    <input
                      type="number"
                      min={0}
                      max={604}
                      value={
                        formCurrentPage
                      }
                      onChange={(e) =>
                        setFormCurrentPage(
                          e.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-300">
                      Level
                    </label>

                    <div className="flex h-[50px] items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4">
                      <span className="text-2xl">
                        {formLevel.icon}
                      </span>

                      <span className="font-black text-emerald-400">
                        {formLevel.name}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 grid gap-3 sm:col-span-2 sm:grid-cols-3">

                    <button
                      type="submit"
                      disabled={
                        saving ||
                        deleting
                      }
                      className="rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving
                        ? "⏳ Menyimpan..."
                        : "💾 SIMPAN PERUBAHAN"}
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleCancel
                      }
                      disabled={
                        saving ||
                        deleting
                      }
                      className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3.5 text-sm font-black text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ✕ BATAL
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleDelete
                      }
                      disabled={
                        saving ||
                        deleting
                      }
                      className="rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-3.5 text-sm font-black text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deleting
                        ? "⏳ Memadam..."
                        : "🗑️ PADAM MURID"}
                    </button>

                  </div>
                </div>
              </div>
            </form>
          </section>
        )}

        {/* SEARCH / FILTER */}

        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-6">

          <div className="mb-4">
            <h2 className="text-lg font-black">
              🔎 Cari Murid
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Pilih murid untuk mengedit maklumat atau memadam peserta.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Cari nama murid..."
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
            />

            <select
              value={filterSchool}
              onChange={(e) =>
                setFilterSchool(
                  e.target.value
                )
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
            >
              <option value="">
                Semua Sekolah
              </option>

              {schools.map(
                (school) => (
                  <option
                    key={school.id}
                    value={school.id}
                  >
                    {school.code} –{" "}
                    {school.name}
                  </option>
                )
              )}
            </select>

            <select
              value={filterGroup}
              onChange={(e) =>
                setFilterGroup(
                  e.target.value
                )
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
            >
              <option value="">
                Semua Kumpulan
              </option>

              {Array.from(
                {
                  length: 10,
                },
                (_, index) =>
                  index + 1
              ).map(
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
        </section>

        {/* STUDENT LIST */}

        <section>

          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">
                👨‍🎓 Senarai Murid
              </h2>

              <p className="text-sm text-slate-400">
                {
                  filteredParticipants.length
                }{" "}
                murid dipaparkan
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">
              ⏳ Memuatkan senarai murid...
            </div>
          ) : filteredParticipants.length ===
            0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center">
              <div className="text-4xl">
                🔍
              </div>

              <p className="mt-3 font-bold text-slate-300">
                Tiada murid ditemui.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Cuba ubah carian atau filter.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

              {filteredParticipants.map(
                (participant) => {
                  const level =
                    getLevel(
                      participant.current_page
                    );

                  const isSelected =
                    participant.id ===
                    selectedId;

                  return (
                    <button
                      key={
                        participant.id
                      }
                      type="button"
                      onClick={() =>
                        selectParticipant(
                          participant
                        )
                      }
                      className={`overflow-hidden rounded-2xl border text-left transition ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20"
                          : "border-slate-800 bg-slate-900 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex gap-4 p-4">

                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                          {participant.photo_url ? (
                            <img
                              src={
                                participant.photo_url
                              }
                              alt={
                                participant.name
                              }
                              className="h-full w-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-2xl">
                              👤
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-black text-white">
                            {
                              participant.name
                            }
                          </h3>

                          <p className="mt-1 truncate text-xs text-slate-400">
                            {getSchoolName(
                              participant.school_id
                            )}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2">

                            <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300">
                              Kumpulan{" "}
                              {
                                participant.group_number
                              }
                            </span>

                            <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-bold text-emerald-400">
                              {
                                level.icon
                              }{" "}
                              {
                                level.name
                              }
                            </span>

                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-800 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">
                            Muka surat
                          </span>

                          <span className="font-black text-emerald-400">
                            {
                              participant.current_page
                            }
                            /604
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                }
              )}

            </div>
          )}

        </section>

        {/* INFO */}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-2xl">
              ✏️
            </div>

            <h3 className="mt-2 font-black">
              Edit Maklumat
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Tukar nama, sekolah, kumpulan, muka surat dan foto murid.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-2xl">
              🗑️
            </div>

            <h3 className="mt-2 font-black">
              Padam Murid
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Memadam murid turut memadam rekod bacaan murid tersebut.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-2xl">
              👑
            </div>

            <h3 className="mt-2 font-black">
              Level Automatik
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Level dikira secara automatik berdasarkan muka surat semasa.
            </p>
          </div>

        </section>

        {/* BOTTOM */}

        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-300 transition hover:border-emerald-500 hover:text-emerald-400"
          >
            ← Kembali ke Dashboard
          </Link>
        </div>

      </div>
    </main>
  );
}