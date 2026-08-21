"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DaftarGuruPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleRegister(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password.length < 6) {
      setError(
        "Kata laluan mestilah sekurang-kurangnya 6 aksara."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Kata laluan dan pengesahan kata laluan tidak sama."
      );
      return;
    }

    setLoading(true);

    const { data, error } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          emailRedirectTo:
            "https://quran-ranking-live-skam.vercel.app/",
        },
      });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setMessage(
      "Pendaftaran berjaya! Sila semak email anda untuk mengesahkan akaun sebelum log masuk."
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-10">

      <div className="w-full max-w-md">

        {/* HEADER */}

        <div className="text-center mb-8">

          <div className="text-6xl mb-5">
            👨‍🏫
          </div>

          <h1 className="text-3xl font-black">
            DAFTAR{" "}
            <span className="text-emerald-400">
              GURU
            </span>
          </h1>

          <p className="text-slate-400 mt-2">
            QURAN RANKING LIVE
          </p>

          <p className="text-sm text-slate-500 mt-1">
            SK AYER MERAH
          </p>

        </div>

        {/* FORM */}

        <div className="rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-2xl">

          <h2 className="text-2xl font-bold">
            Akaun Guru Baharu
          </h2>

          <p className="text-sm text-slate-400 mt-2">
            Sila lengkapkan maklumat di bawah.
          </p>

          <form
            onSubmit={handleRegister}
            className="mt-7"
          >

            {/* NAMA */}

            <label className="block">

              <span className="text-sm text-slate-300">
                Nama Guru
              </span>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Nama penuh guru"
                required
                className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />

            </label>

            {/* EMAIL */}

            <label className="block mt-5">

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
                placeholder="Minimum 6 aksara"
                required
                autoComplete="new-password"
                className="mt-2 w-full rounded-xl bg-slate-800 border border-white/10 px-4 py-3 text-white outline-none focus:border-emerald-400"
              />

            </label>

            {/* CONFIRM PASSWORD */}

            <label className="block mt-5">

              <span className="text-sm text-slate-300">
                Sahkan Kata Laluan
              </span>

              <input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Masukkan semula kata laluan"
                required
                autoComplete="new-password"
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

            {/* SUCCESS */}

            {message && (
              <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">

                <p className="text-sm text-emerald-400">
                  ✅ {message}
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
                ? "⏳ Mendaftarkan..."
                : "👨‍🏫 DAFTAR AKAUN"}
            </button>

          </form>

        </div>

        {/* KEMBALI LOGIN */}

        <div className="text-center mt-6">

          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            ← Sudah mempunyai akaun? Log Masuk
          </button>

        </div>

      </div>

    </main>
  );
}