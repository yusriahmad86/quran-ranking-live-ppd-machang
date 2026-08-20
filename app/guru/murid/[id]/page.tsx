import Link from "next/link";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import DeleteStudentButton from "./DeleteStudentButton";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    saved?: string;
  }>;
};

function getLevel(page: number) {
  if (page === 604) return "GRANDMASTER";
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

export default async function StudentPage({
  params,
  searchParams,
}: Props) {
  await requireAuth();


  const { id } = await params;
  const { saved } = await searchParams;

  const { data: student, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !student) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-10">
        <h1 className="text-3xl font-bold text-red-400">
          Murid tidak ditemui
        </h1>

        <p className="mt-4 text-slate-400">
          {error?.message}
        </p>
      </main>
    );
  }

  const currentPage = student.current_page ?? 0;
  const level = getLevel(currentPage);
  const icon = getLevelIcon(level);

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}
      <header className="border-b border-white/10 bg-slate-900">
        <div className="max-w-3xl mx-auto px-6 py-5">

          <Link
            href="/guru"
            className="text-emerald-400 hover:text-emerald-300"
          >
            ← Kembali ke Dashboard
          </Link>

        </div>
      </header>

      {/* PROFILE */}
      <section className="max-w-3xl mx-auto px-6 py-10">

        <div className="text-center">

          {/* PHOTO */}
          <div className="mx-auto w-32 h-32 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center border-4 border-emerald-400">

            {student.photo_url ? (
  <img
    src={student.photo_url}
    alt={student.name}
    className="w-full h-full object-cover"
  />
) : (
  <span className="text-6xl">
    👤
  </span>
)}

          </div>

          <h1 className="text-3xl font-bold mt-6">
            {student.name}
          </h1>
          <Link
  href={`/guru/murid/${student.id}/edit`}
  className="inline-flex mt-4 rounded-xl bg-slate-800 border border-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-slate-700 hover:border-emerald-400/50 transition"
>
  ✏️ Edit Maklumat Murid
</Link>

<DeleteStudentButton
  studentId={student.id}
  studentName={student.name}
/>

        </div>

        {/* MESEJ BERJAYA */}
        {saved === "1" && (
          <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-6 py-5 text-center">

            <div className="text-3xl">
              ✅
            </div>

            <div className="text-lg font-bold text-emerald-400 mt-2">
              Bacaan berjaya disimpan!
            </div>

            <p className="text-sm text-slate-300 mt-1">
              Muka surat {currentPage} telah direkodkan.
            </p>

          </div>
        )}

        {/* CURRENT PAGE */}
        <div className="mt-10 rounded-3xl border border-white/10 bg-slate-900 p-8 text-center">

          <p className="text-slate-400">
            Muka Surat Semasa
          </p>

          <div className="text-6xl font-bold mt-3">
            {currentPage}
            <span className="text-2xl text-slate-500">
              {" "}/ 604
            </span>
          </div>

          <div className="mt-6 inline-flex items-center gap-3 rounded-full bg-slate-800 px-6 py-3">

            <span className="text-3xl">
              {icon}
            </span>

            <span className="text-xl font-bold">
              {level}
            </span>

          </div>

        </div>

        {/* INPUT */}
        <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-8">
        <h2 className="text-xl font-bold">
            Masukkan Muka Surat Baharu
          </h2>

          <form
            action={async (formData) => {
              "use server";

              const pageValue = Number(
                formData.get("page")
              );

              if (
                !Number.isInteger(pageValue) ||
                pageValue < 1 ||
                pageValue > 604
              ) {
                throw new Error(
                  "Muka surat mestilah antara 1 hingga 604."
                );
              }

              const { error } = await supabase
                .from("students")
                .update({
                  current_page: pageValue,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", student.id);

              if (error) {
                throw new Error(error.message);
              }

              redirect(
                `/guru/murid/${student.id}?saved=1`
              );
            }}
          >

            <input
              name="page"
              type="number"
              min="1"
              max="604"
              defaultValue={currentPage}
              className="mt-5 w-full rounded-xl bg-slate-800 border border-white/10 px-5 py-4 text-white text-2xl text-center outline-none focus:border-emerald-400"
            />

            <button
              type="submit"
              className="mt-5 w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 text-lg transition"
            >
              💾 SIMPAN BACAAN
            </button>

          </form>

        </div>

      </section>

    </main>
  );
}