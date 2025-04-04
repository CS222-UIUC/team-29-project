"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Home() {
  const [apiStatus, setApiStatus] = useState<string>("Checking...");
  const [statusClass, setStatusClass] = useState<string>("");
  const { data: session, status } = useSession();

  useEffect(() => {
    fetch('/api/health')
      .then(response => response.json())
      .then(data => {
        setApiStatus(data.status || "Online");
        setStatusClass("text-green-500 font-bold");
      })
      .catch(() => {
        setApiStatus("Offline");
        setStatusClass("text-red-500 font-bold");
      });
  }, []);

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1 className="text-4xl font-bold">ThreadFlow</h1>
        <p className="text-xl mb-6">A branching chat interface for LLMs</p>
        
        <div className="p-4 bg-black/[.05] dark:bg-white/[.06] rounded-lg mb-6">
          <p>
            API Status: <span className={statusClass}>{apiStatus}</span>
          </p>
        </div>

        {/* Google Authentication Section */}
        <div className="flex gap-4 items-center">
          {status === "loading" ? (
            <p>Loading...</p>
          ) : session ? (
            <div className="flex items-center gap-2">
              <p className="text-sm">Signed in as {session.user?.email}</p>
              <button
                onClick={() => signOut()}
                className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-red-500 text-white gap-2 hover:bg-red-600 text-sm h-10 px-4"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {e.preventDefault();signIn("google")}}
              className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-blue-500 text-white gap-2 hover:bg-blue-600 text-sm h-10 px-4"
            >
              Sign in with Google
            </button>
          )}
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Link
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            href="/chat"
          >
            Start a Conversation
          </Link>
          <Link
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44"
            href="/about"
          >
            About ThreadFlow
          </Link>
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <p className="text-sm">Team 29 Project</p>
      </footer>
    </div>
  );
}
