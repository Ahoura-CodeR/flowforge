"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button, ErrorText, Field, inputClass } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { state, login, register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === "register";

  useEffect(() => {
    if (state.status === "authenticated") router.replace("/projects");
  }, [state.status, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isRegister) await register(name, email, password);
      else await login(email, password);
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">{isRegister ? "Create your account" : "Sign in to FlowForge"}</h1>
          <p className="mt-1 text-sm text-slate-500">Plan work and move it across the board.</p>
        </div>

        {isRegister && (
          <Field label="Name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" />
          </Field>
        )}
        <Field label="Email">
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </Field>
        <Field label="Password">
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={isRegister ? 8 : 1}
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
        </Field>

        <ErrorText error={error} />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
        </Button>

        <p className="text-center text-sm text-slate-500">
          {isRegister ? "Already have an account? " : "New here? "}
          <Link className="font-medium text-indigo-600 hover:underline" href={isRegister ? "/login" : "/register"}>
            {isRegister ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </form>
    </main>
  );
}
