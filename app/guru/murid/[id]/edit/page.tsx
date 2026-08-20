import Link from "next/link";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import StudentPhotoUpload from "./StudentPhotoUpload";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditStudentPage({
  params,
}: Props) {
  await requireAuth();

  const { id } = await params;

  // Dapatkan maklumat murid
  const { data: student, error: studentError } =
    await supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .single();

  // Dapatkan senarai kelas
  const { data: classes, error: classesError } =
    await supabase
      .from("classes")
      .select("id, name")
      .order("name");

  if (studentError || !student) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-10">

        <h1 className="text-3xl font-bold text-red-400">
          Murid tidak ditemui
        </h1>

        <p className="mt-4 text-slate-400">
          {studentError?.message}
        </p>

      </main>
    );
  }

  if (classesError) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-10">

        <h1 className="text-3xl font-bold text-red-400">
          Ralat mendapatkan kelas
        </h1>

        <p className="mt-4 text-slate-400">
          {classesError.message}
        </p>

      </main>
    );
  }

  async function updateStudent(formData: FormData) {
    "use server";

    await requireAuth();

    const name = String(
      formData.get("name") ?? ""
    ).trim();

    const classId = String(
      formData.get("class_id") ?? ""
    );

    const pageValue = Number(
      formData.get("current_page")
    );

    if (!name) {
      throw new Error(
        "Nama murid tidak boleh kosong."
      );
    }

    if (!classId) {
      throw new Error(
        "Sila pilih kelas."
      );
    }

    if (
      !Number.isInteger(pageValue) ||
      pageValue < 0 ||
      pageValue > 604
    ) {
      throw new Error(
        "Muka surat mestilah antara 0 hingga 604."
      );
    }

    const { error } = await supabase
      .from("students")
      .update({
        name,
        class_id: classId,
        current_page: pageValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    redirect(`/guru/murid/${id}`);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}
      <header className="border-b border-white/10 bg-slate-900">

        <div className="max-w-3xl mx-auto px-6 py-5">

          <Link
            href={`/guru/murid/${id}`}
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            ← Kembali ke Profil Murid
          </Link>

          <h1 className="text-3xl font-bold mt-4">
            ✏️ Edit Maklumat Murid
          </h1>

          <p className="text-slate-400 mt-1">
            Kemas kini maklumat murid.
          </p>

        </div>

      </header>

      {/* CONTENT */}
      <section className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* FOTO */}
        <StudentPhotoUpload
          studentId={student.id}
          currentPhotoUrl={student.photo_url}
        />

        {/* MAKLUMAT MURID */}
        <div className="rounded-3xl border border-white/10 bg-slate-900 p-6 md:p-8">

          <form
            action={updateStudent}
            className="space-y-6"
          >

            {/* NAMA */}
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
                required
                defaultValue={student.name}
                className="w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />

            </div>

            {/* KELAS */}
            <div>

              <label
                htmlFor="class_id"
                className="block text-sm font-semibold text-slate-300 mb-2"
              >
                Kelas
              </label>

              <select
                id="class_id"
                name="class_id"
                required
                defaultValue={student.class_id}
                className="w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 text-white outline-none focus:border-emerald-400"
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

            {/* MUKA SURAT */}
            <div>

              <label
                htmlFor="current_page"
                className="block text-sm font-semibold text-slate-300 mb-2"
              >
                Muka Surat Semasa
              </label>

              <input
                id="current_page"
                name="current_page"
                type="number"
                min="0"
                max="604"
                required
                defaultValue={
                  student.current_page ?? 0
                }
                className="w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 text-white text-xl text-center outline-none focus:border-emerald-400"
              />

              <p className="text-xs text-slate-500 mt-2">
                Masukkan nilai antara 0 hingga 604.
              </p>

            </div>

            {/* PERINGATAN */}
            <div className="rounded-2xl border border-yellow-500/10 bg-yellow-500/5 p-5">

              <div className="flex gap-4">

                <div className="text-3xl">
                  ⚠️
                </div>

                <div>

                  <h3 className="font-bold">
                    Perhatian
                  </h3>

                  <p className="text-sm text-slate-400 mt-1">
                    Perubahan muka surat akan terus
                    mempengaruhi ranking murid.
                  </p>

                </div>

              </div>

            </div>

            {/* SIMPAN */}
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 text-lg transition"
            >
              💾 Simpan Perubahan
            </button>

          </form>

        </div>

      </section>

    </main>
  );
}