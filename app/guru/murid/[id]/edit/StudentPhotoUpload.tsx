"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  studentId: string;
  currentPhotoUrl: string | null;
};

export default function StudentPhotoUpload({
  studentId,
  currentPhotoUrl,
}: Props) {
  const [photoUrl, setPhotoUrl] = useState(
    currentPhotoUrl
  );

  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    try {
      setMessage("");

      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      // Semak jenis fail
      if (!file.type.startsWith("image/")) {
        setMessage("Sila pilih fail gambar sahaja.");
        return;
      }

      // Had saiz 5MB
      if (file.size > 5 * 1024 * 1024) {
        setMessage(
          "Saiz gambar mestilah kurang daripada 5MB."
        );
        return;
      }

      setUploading(true);

      // Nama fail unik
      const fileExt =
        file.name.split(".").pop() || "jpg";

      const fileName =
        `${studentId}-${Date.now()}.${fileExt}`;

      const filePath = fileName;

      // Upload ke Storage
      const { error: uploadError } =
        await supabase.storage
          .from("student-photos")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Dapatkan URL public
      const { data: publicUrlData } =
        supabase.storage
          .from("student-photos")
          .getPublicUrl(filePath);

      const publicUrl =
        publicUrlData.publicUrl;

      // Simpan URL ke students
      const { error: updateError } =
        await supabase
          .from("students")
          .update({
            photo_url: publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", studentId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Tukar preview
      setPhotoUrl(publicUrl);

      setMessage(
        "✅ Foto murid berjaya dimuat naik."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal memuat naik gambar."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">

      <h2 className="text-xl font-bold">
        📷 Foto Murid
      </h2>

      <p className="text-sm text-slate-400 mt-1">
        Pilih gambar untuk digunakan sebagai foto profil murid.
      </p>

      {/* PREVIEW */}
      <div className="mt-6 flex flex-col items-center">

        <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-800 border-4 border-emerald-400 flex items-center justify-center">

          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Foto murid"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-6xl">
              👤
            </span>
          )}

        </div>

      </div>

      {/* INPUT */}
      <div className="mt-6">

        <label
          htmlFor="student-photo"
          className="block w-full cursor-pointer rounded-xl bg-slate-800 border border-white/10 hover:border-emerald-400/50 px-5 py-4 text-center font-semibold transition"
        >
          {uploading
            ? "⏳ Sedang memuat naik..."
            : "📷 Pilih Gambar"}
        </label>

        <input
          id="student-photo"
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />

      </div>

      {/* INFO */}
      <p className="text-xs text-slate-500 text-center mt-3">
        Format gambar: JPG, PNG atau WEBP · Maksimum 5MB
      </p>

      {/* MESSAGE */}
      {message && (
        <div className="mt-4 rounded-xl bg-slate-800 border border-white/10 px-4 py-3 text-sm text-center">
          {message}
        </div>
      )}

    </div>
  );
}