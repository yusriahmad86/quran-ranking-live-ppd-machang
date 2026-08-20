import { supabase } from "@/lib/supabase";
import RankingLive from "./RankingLive";

export default async function RankingPage() {
  const { data: students, error } = await supabase
    .from("students")
    .select("id, name, photo_url, current_page")
    .order("current_page", {
      ascending: false,
    });

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-10">
        <h1 className="text-3xl font-bold text-red-400">
          Ralat mendapatkan ranking
        </h1>

        <p className="mt-4 text-slate-300">
          {error.message}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <header className="bg-slate-900 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-8 text-center">

          <div className="text-5xl">
            📖
          </div>

          <h1 className="text-4xl font-black mt-3">
            QURAN RANKING
            <span className="text-emerald-400">
              {" "}LIVE
            </span>
          </h1>

          <p className="text-slate-400 mt-2">
            SK AYER MERAH
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/20 px-4 py-2">

            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />

            <span className="text-sm text-red-400 font-semibold">
              LIVE
            </span>

          </div>

        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-10">

        <RankingLive
          initialStudents={students ?? []}
        />

      </section>

    </main>
  );
}