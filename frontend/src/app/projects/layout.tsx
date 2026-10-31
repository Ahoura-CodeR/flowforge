"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { state, logout } = useAuth();

  useEffect(() => {
    if (state.status === "anonymous") router.replace("/login");
  }, [state.status, router]);

  if (state.status !== "authenticated") return <Spinner />;

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4">
          <Link href="/projects" className="font-semibold tracking-tight text-indigo-700">
            FlowForge
          </Link>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>{state.user.name}</span>
            <Button variant="secondary" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6">{children}</div>
    </>
  );
}
