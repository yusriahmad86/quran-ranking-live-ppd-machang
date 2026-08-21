"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">

      <div className="w-full max-w-md">

        {/* LOGO / TAJUK */}

        <div className="text-center mb-8">

          <div className="text-6xl mb-5">
            📖
          </div>

          <h1 className="text-3xl font-black">
            QURAN RANKING{" "}
            <span className="text-emerald-400">
              LIVE
            </span>
          </h1>

          <p className="text-slate-400 mt-2">
            SK AYER MERAH
          </p>

          <p className="text-sm text-slate-500 mt-1">
            Sistem Pemantauan Bacaan Al-Quran Murid
          </p>

        </div>

        {/* LOGIN CARD */}

        <div className="rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-2xl">

          <h2 className="text-2xl font-bold text-center">
            Log Masuk Guru
          </h2>

          <p className="text-sm text-slate-400 text-center mt-2">
            Sila masukkan akaun guru anda.
          </p>

          <form
            onSubmit={handleLogin}
            className="mt-8"
          >

            {/* EMAIL */}

            <label className="block">

              <span className="text-sm text-slate-300">
                Email
              </span>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="contoh@email.com"
                required
                autoComplete="email"
                className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />

            </label>

            {/* PASSWORD */}

            <label className="block mt-5">

              <span className="text-sm text-slate-300">
                Kata Laluan
              </span>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Masukkan kata laluan"
                required
                autoComplete="current-password"
                className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />

            </label>

            {/* ERROR */}

            {error && (
              <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">

                <p className="text-sm text-red-400">
                  ❌ {error}
                </p>

              </div>
            )}

            {/* BUTTON */}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-bold py-4 transition"
            >
              {loading
                ? "⏳ Sedang log masuk..."
                : "🔐 LOG MASUK"}
            </button>

          </form>

        </div>

        {/* RANKING PUBLIC */}

        <div className="mt-5 text-center">

          <button
            type="button"
            onClick={() => router.push("/ranking")}
            className="text-sm text-yellow-400 hover:text-yellow-300"
          >
            🏆 Lihat Ranking Live →
          </button>

        </div>

        {/* FOOTER */}

        <p className="text-center text-xs text-slate-600 mt-8">
          © 2026 QURAN RANKING LIVE · SK AYER MERAH
        </p>

      </div>

    </main>
  );
}