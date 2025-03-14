"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Chat() {
  const [userInput, setUserInput] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Chat page mounted");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userInput.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Add a timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const result = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userInput }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!result.ok) {
        throw new Error(`Server returned ${result.status}: ${result.statusText}`);
      }
      
      const data = await result.json();
      setResponse(data.response);
    } catch (error: any) {
      console.error("API Error:", error);
      
      if (error.name === 'AbortError') {
        setResponse("Request timed out. The API might be taking too long to respond.");
        setError("Request timed out after 30 seconds");
      } else {
        setResponse("Error connecting to the server. Please try again.");
        setError(String(error));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 flex flex-col font-[family-name:var(--font-geist-sans)]">
      <header className="mb-8">
        <Link href="/" className="text-2xl font-bold">ThreadFlow</Link>
      </header>
      
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-6">Chat Page</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-4">
            <p>Error: {error}</p>
          </div>
        )}
        
        <div className="bg-black/[.05] dark:bg-white/[.06] rounded-lg p-6 mb-6 min-h-[200px] flex items-start">
          {isLoading ? (
            <div className="flex items-center justify-center w-full">
              <p className="text-gray-500">Getting response...</p>
            </div>
          ) : response ? (
            <p className="whitespace-pre-wrap">{response}</p>
          ) : (
            <p className="text-gray-500">Your response will appear here</p>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <textarea
            className="w-full p-4 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 min-h-[120px] resize-none"
            placeholder="Type your message here..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={isLoading}
          />
          
          <button
            type="submit"
            disabled={isLoading || !userInput.trim()}
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-12 px-5 disabled:opacity-50 disabled:cursor-not-allowed self-end"
          >
            {isLoading ? "Sending..." : "Send Message"}
          </button>
        </form>
      </main>
    </div>
  );
}