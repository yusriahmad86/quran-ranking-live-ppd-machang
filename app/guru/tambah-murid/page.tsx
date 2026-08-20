import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

type Props = {
  searchParams: Promise<{
    class_id?: string;
  }>;
};

export default async function AddStudentPage({
  searchParams,
}: Props) {
  await requireAuth();

  // Ambil class_id daripada URL jika datang dari halaman kelas
  const { class_id } = await searchParams;

  const supabase = await createClient();

  // Dapatkan senarai kelas
  const { data: classes, error } = await supabase
    .from("classes")
    .select("id, name")
    .order("name");

  // Fungsi simpan murid
  async function addStudent(formData: FormData) {
    "use server";

    const supabase = await createClient();

    await requireAuth();

    const name = String(
      formData.get("name") ?? ""
    ).trim();

    const classId = String(
      formData.get("class_id") ?? ""
    );

    if (!name || !classId) {
      return;
    }

    const { error } = await supabase
      .from("students")
      .insert({
        name,
        class_id: classId,
        photo_url: null,
        current_page: 0,
      });

    if (error) {
      throw new Error(error.message);
    }

    // Selepas berjaya, terus kembali ke kelas
    redirect(`/guru/kelas/${classId}`);
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-10">

        <h1 className="text-2xl font-bold text-red-400">
          Ralat mendapatkan kelas
        </h1>

        <p className="mt-4 text-slate-300">
          {error.message}
        </p>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}
      <header className="border-b border-white/10 bg-slate-900">

        <div className="max-w-4xl mx-auto px-6 py-5">

          <Link
            href="/guru"
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            ← Kembali ke Pengisian Bacaan
          </Link>

          <h1 className="text-3xl font-bold mt-4">
            ➕ Tambah Murid
          </h1>

          <p className="text-slate-400 mt-1">
            Daftarkan murid baharu ke dalam sistem Quran Ranking Live.
          </p>

        </div>

      </header>

      {/* FORM */}
      <section className="max-w-4xl mx-auto px-6 py-10">

        <div className="rounded-3xl border border-white/10 bg-slate-900 p-6 md:p-8">

          <form action={addStudent} className="space-y-6">

            {/* NAMA MURID */}
            <div>

              <label
                htmlFor="name"
                className="block text-sm font-semibold text-slate-300 mb-2"
              >
                Nama Murid
              </label>

              <input
                id="name"
                name="name"
                type="text"
                placeholder="Masukkan nama penuh murid"
                required
                autoFocus
                className="w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-emerald-500"
              />

            </div>

            {/* PILIH KELAS */}
            <div>

              <label
                htmlFor="class_id"
                className="block text-sm font-semibold text-slate-300 mb-2"
              >
                Pilih Kelas
              </label>

              <select
                id="class_id"
                name="class_id"
                required
                defaultValue={class_id ?? ""}
                className="w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 text-white outline-none focus:border-emerald-500"
              >

                <option value="" disabled>
                  -- Pilih Kelas --
                </option>

                {classes?.map((item) => (

                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>

                ))}

              </select>

            </div>

            {/* INFO */}
            <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-5">

              <div className="flex gap-4">

                <div className="text-3xl">
                  📖
                </div>

                <div>

                  <h3 className="font-bold">
                    Bacaan permulaan
                  </h3>

                  <p className="text-sm text-slate-400 mt-1">
                    Murid baharu akan bermula pada muka surat{" "}

                    <span className="text-emerald-400 font-bold">
                      0 / 604
                    </span>.

                  </p>

                </div>

              </div>

            </div>

            {/* BUTTON */}
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 transition"
            >
              💾 Simpan Murid
            </button>

          </form>

        </div>

      </section>

    </main>
  );
}