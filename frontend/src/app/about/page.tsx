"use client";

import Link from "next/link";

export default function About() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">About ThreadFlow</h1>

      <p className="text-lg leading-relaxed mb-10 text-center">
        ThreadFlow is a branching chat interface designed for AI-powered
        conversations, enabling users to explore tangential ideas and manage
        complex discussions without losing context. It provides an intuitive way
        to orchestrate multiple AI models, allowing users to compare and combine
        outputs effortlessly. With ThreadFlow, each message can branch into
        sub-threads, keeping side discussions separate while maintaining
        relevance. Users can select which branches contribute to the
        conversation, ensuring focused responses. Advanced search and
        collaboration features, including shareable conversation trees and
        export options, enhance productivity. The interface is built with a
        React-based frontend and a FastAPI-powered backend, integrating LLMs for
        dynamic interactions. Designed for both technical and non-technical
        users, ThreadFlow streamlines AI-assisted workflows with an intuitive,
        scalable, and interactive experience.
      </p>

      <Link
        className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
        href="/"
      >
        Back to Home
      </Link>
    </div>
  );
}
