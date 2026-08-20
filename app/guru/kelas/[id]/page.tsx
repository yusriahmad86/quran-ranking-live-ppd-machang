import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClassStudentsPage({ params }: Props) {
  await requireAuth();

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
      <main className="min-h-screen bg-slate-950 text-white p-10">
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
      <main className="min-h-screen bg-slate-950 text-white p-10">
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
        <div className="max-w-6xl mx-auto px-6 py-5">

          <div className="flex items-center justify-between gap-4">

            <div>
              <Link
                href="/guru"
                className="text-sm text-emerald-400 hover:text-emerald-300"
              >
                ← Kembali ke Senarai Kelas
              </Link>

              <h1 className="text-3xl font-bold mt-4">
                {classData?.name}
              </h1>

              <p className="text-slate-400 mt-1">
                Senarai murid
              </p>
            </div>

            {/* TAMBAH MURID */}
            <Link
              href={`/guru/tambah-murid?class_id=${id}`}
              className="shrink-0 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 transition"
            >
              ➕ Tambah Murid
            </Link>

          </div>

        </div>
      </header>

      {/* STUDENTS */}
      <section className="max-w-6xl mx-auto px-6 py-10">

        {students && students.length > 0 ? (

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

            {students.map((student) => (

              <Link
                key={student.id}
                href={`/guru/murid/${student.id}`}
                className="group rounded-3xl border border-white/10 bg-slate-900 p-5 hover:bg-slate-800 hover:border-emerald-400/50 transition"
              >

                <div className="flex items-center gap-4">

                  {/* FOTO */}
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 flex items-center justify-center">

                    {student.photo_url ? (
                      <img
                        src={student.photo_url}
                        alt={student.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">
                        👤
                      </span>
                    )}

                  </div>

                  {/* NAMA */}
                  <div className="flex-1 min-w-0">

                    <h2 className="font-bold text-lg group-hover:text-emerald-400 transition truncate">
                      {student.name}
                    </h2>

                    <p className="text-sm text-slate-400 mt-1">
                      Muka surat:{" "}
                      <span className="text-white font-semibold">
                        {student.current_page ?? 0}
                      </span>
                      {" / 604"}
                    </p>

                  </div>

                </div>

                <div className="mt-5 pt-4 border-t border-white/10 flex justify-between">

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

            <div className="text-5xl mb-4">
              👨‍🎓
            </div>

            <h2 className="text-xl font-bold">
              Tiada murid ditemui
            </h2>

            <p className="text-slate-400 mt-2">
              Belum ada murid didaftarkan dalam kelas ini.
            </p>

            <Link
              href={`/guru/tambah-murid?class_id=${id}`}
              className="inline-block mt-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-3 font-bold text-slate-950 transition"
            >
              ➕ Tambah Murid
            </Link>

          </div>

        )}

      </section>

    </main>
  );
}