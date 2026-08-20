import { supabase } from "@/lib/supabase";

export default async function TestPage() {
  const { data, error } = await supabase
    .from("classes")
    .select("*");

  return (
    <main className="min-h-screen bg-slate-950 text-white p-10">
      <h1 className="text-3xl font-bold mb-6">
        Ujian Supabase
      </h1>

      {error ? (
        <div className="bg-red-900 p-5 rounded-xl">
          <p className="font-bold">❌ Ralat</p>
          <p className="mt-2">{error.message}</p>
        </div>
      ) : (
        <div className="bg-emerald-900 p-5 rounded-xl">
          <p className="font-bold mb-4">
            ✅ Supabase berjaya disambungkan!
          </p>

          <pre>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}