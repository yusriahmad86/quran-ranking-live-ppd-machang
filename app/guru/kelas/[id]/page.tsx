import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClassStudentsPage({ params }: Props) {
  const { id } = await params;

  // Dapatkan maklumat kelas
  const { data: classData, error: classError } = await supabase
    .from("classes")
    .select("id, name")
    .eq("id", id)
    .single();

  // Dapatkan murid dalam kelas tersebut
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, name, photo_url, current_page")
    .eq("class_id", id)
    .order("name");

  if (classError) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        <h1 className="text-2xl font-bold text-red-400">
          Ralat mendapatkan kelas
        </h1>

        <p className="mt-4 text-slate-300">
          {classError.message}
        </p>
      </main>
    );
  }

  if (studentsError) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        <h1 className="text-2xl font-bold text-red-400">
          Ralat mendapatkan murid
        </h1>

        <p className="mt-4 text-slate-300">
          {studentsError.message}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}
      <header className="border-b border-white/10 bg-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-5">

          <div className="flex items-center justify-between gap-4">

            <div>
              <Link
                href="/guru"
                className="text-sm text-emerald-400 hover:text-emerald-300"
              >
                ← Kembali ke Senarai Kelas
              </Link>

              <h1 className="mt-4 text-3xl font-bold">
                {classData?.name}
              </h1>

              <p className="mt-1 text-slate-400">
                Senarai murid
              </p>
            </div>

            {/* TAMBAH MURID */}
            <Link
              href={`/guru/tambah-murid?class_id=${id}`}
              className="shrink-0 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
            >
              ➕ Tambah Murid
            </Link>

          </div>

        </div>
      </header>

      {/* STUDENTS */}
      <section className="mx-auto max-w-6xl px-6 py-10">

        {students && students.length > 0 ? (

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

            {students.map((student) => (

              <Link
                key={student.id}
                href={`/guru/murid/${student.id}`}
                className="group rounded-3xl border border-white/10 bg-slate-900 p-5 transition hover:border-emerald-400/50 hover:bg-slate-800"
              >

                <div className="flex items-center gap-4">

                  {/* FOTO */}
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-800">

                    {student.photo_url ? (
                      <img
                        src={student.photo_url}
                        alt={student.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">
                        👤
                      </span>
                    )}

                  </div>

                  {/* NAMA */}
                  <div className="min-w-0 flex-1">

                    <h2 className="truncate text-lg font-bold transition group-hover:text-emerald-400">
                      {student.name}
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      Muka surat:{" "}
                      <span className="font-semibold text-white">
                        {student.current_page ?? 0}
                      </span>
                      {" / 604"}
                    </p>

                  </div>

                </div>

                <div className="mt-5 flex justify-between border-t border-white/10 pt-4">

                  <span className="text-sm text-slate-400">
                    Tekan untuk isi bacaan
                  </span>

                  <span className="text-emerald-400">
                    →
                  </span>

                </div>

              </Link>

            ))}

          </div>

        ) : (

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-10 text-center">

            <div className="mb-4 text-5xl">
              👨‍🎓
            </div>

            <h2 className="text-xl font-bold">
              Tiada murid ditemui
            </h2>

            <p className="mt-2 text-slate-400">
              Belum ada murid didaftarkan dalam kelas ini.
            </p>

            <Link
              href={`/guru/tambah-murid?class_id=${id}`}
              className="mt-6 inline-block rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-400"
            >
              ➕ Tambah Murid
            </Link>

          </div>

        )}

      </section>

    </main>
  );
}