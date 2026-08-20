"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Props = {
  studentId: string;
  studentName: string;
};

export default function DeleteStudentButton({
  studentId,
  studentName,
}: Props) {
  const router = useRouter();

  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);

    const { data, error } = await supabase
      .from("students")
      .delete()
      .eq("id", studentId)
      .select("id");

    if (error) {
      alert(
        `Gagal memadam murid:\n${error.message}`
      );

      setLoading(false);
      return;
    }

    // Pastikan rekod benar-benar dipadam
    if (!data || data.length === 0) {
      alert(
        "Murid tidak dipadam. Supabase tidak mengembalikan rekod yang dipadam."
      );

      setLoading(false);
      return;
    }

    // Tutup modal
    setShowConfirm(false);

    // Kembali ke senarai kelas
    router.push("/guru");

    // Refresh data
    router.refresh();
  }

  return (
    <>
      {/* BUTANG PADAM */}
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="inline-flex mt-3 rounded-xl bg-red-500/10 border border-red-500/20 px-5 py-3 text-sm font-bold text-red-400 hover:bg-red-500/20 transition"
      >
        🗑️ Padam Murid
      </button>

      {/* MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">

          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">

            <div className="text-center">

              <div className="text-5xl mb-4">
                ⚠️
              </div>

              <h2 className="text-2xl font-bold">
                Padam Murid?
              </h2>

              <p className="text-slate-400 mt-3">
                Adakah anda pasti mahu memadam:
              </p>

              <p className="text-white font-bold mt-2">
                {studentName}
              </p>

              <p className="text-sm text-red-400 mt-4">
                Tindakan ini tidak boleh dibuat semula.
              </p>

            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">

              {/* BATAL */}
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="rounded-xl bg-slate-800 border border-white/10 px-4 py-3 font-semibold hover:bg-slate-700 transition"
              >
                Batal
              </button>

              {/* PADAM */}
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="rounded-xl bg-red-500 hover:bg-red-400 px-4 py-3 font-bold text-white transition disabled:opacity-50"
              >
                {loading
                  ? "Memadam..."
                  : "Ya, Padam"}
              </button>

            </div>

          </div>

        </div>
      )}
    </>
  );
}