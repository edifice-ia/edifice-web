"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="rounded-lg border border-[#223149] bg-[#0F1724] p-6 shadow-2xl shadow-black/20">
      <div className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[#F4F7FB]"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="vous@exemple.com"
            className="mt-2 w-full rounded-md border border-[#223149] bg-[#111D2E] px-4 py-3 text-[#F4F7FB] outline-none transition placeholder:text-[#9EADBF]/60 focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/25"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[#F4F7FB]"
          >
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Votre mot de passe"
            className="mt-2 w-full rounded-md border border-[#223149] bg-[#111D2E] px-4 py-3 text-[#F4F7FB] outline-none transition placeholder:text-[#9EADBF]/60 focus:border-[#38BDF8] focus:ring-2 focus:ring-[#38BDF8]/25"
          />
        </div>
        {state.error ? (
          <p className="rounded-md border border-[#7f1d1d] bg-[#450a0a] px-4 py-3 text-sm leading-6 text-[#fecaca]">
            {state.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-[#38BDF8] px-5 py-3 text-sm font-semibold text-[#070B12] transition hover:bg-[#7DD3FC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Connexion..." : "Connexion"}
        </button>
        <div className="rounded-md border border-[#223149] bg-[#1E293B] p-4 text-sm leading-6 text-[#F4F7FB]">
          <p className="font-semibold">
            Acces prive reserve aux utilisateurs autorises.
          </p>
          <p className="mt-1 text-[#9EADBF]">
            Le Cockpit Web est l&apos;interface privee du portail L’Édifice.
          </p>
        </div>
      </div>
    </form>
  );
}
