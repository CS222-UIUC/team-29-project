"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface Message {
  id: string;
  content: string;
  role: string;
  timestamp: string;
}

interface Thread {
  id: string;
  messages: Message[];
  parent_thread_id?: string;
  created_at: string;
  updated_at: string;
}

export default function Chat() {
  const [userInput, setUserInput] = useState<string>("");
  const [currentThread, setCurrentThread] = useState<Thread | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create a new thread when the component mounts
    createNewThread();
  }, []);

  const createNewThread = async () => {
    try {
      const response = await fetch('http://localhost:8000/threads', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to create thread');
      const thread = await response.json();
      setCurrentThread(thread);
    } catch (error) {
      console.error('Error creating thread:', error);
      setError('Failed to create new thread');
    }
  };

  const branchThread = async (messageId: string) => {
    if (!currentThread) return;
    
    try {
      const response = await fetch(`http://localhost:8000/threads/${currentThread.id}/branch?message_id=${messageId}`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to branch thread');
      }
      const newThread = await response.json();
      setCurrentThread(newThread);
      setUserInput(''); // Clear input when switching threads
    } catch (error) {
      console.error('Error branching thread:', error);
      setError(error instanceof Error ? error.message : 'Failed to branch thread');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userInput.trim() || !currentThread) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const result = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: userInput,
          thread_id: currentThread.id 
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!result.ok) {
        throw new Error(`Server returned ${result.status}: ${result.statusText}`);
      }
      
      const data = await result.json();
      
      // Update the current thread with the new messages
      if (currentThread) {
        const updatedThread = {
          ...currentThread,
          messages: [...currentThread.messages, 
            { id: data.message_id, content: userInput, role: 'user', timestamp: new Date().toISOString() },
            { id: data.response_id, content: data.response, role: 'assistant', timestamp: new Date().toISOString() }
          ]
        };
        setCurrentThread(updatedThread);
      }
      
      setUserInput('');
    } catch (error: any) {
      console.error("API Error:", error);
      
      if (error.name === 'AbortError') {
        setError("Request timed out after 30 seconds");
      } else {
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
      
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-6">Chat Page</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-4">
            <p>Error: {error}</p>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto mb-6">
          {currentThread?.messages.map((message, index) => (
            <div 
              key={message.id} 
              className={`mb-4 p-4 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-blue-100 dark:bg-blue-900 ml-auto max-w-[80%]' 
                  : 'bg-gray-100 dark:bg-gray-800 mr-auto max-w-[80%]'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold">
                  {message.role === 'user' ? 'You' : 'Assistant'}
                </span>
                <button
                  onClick={() => branchThread(message.id)}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                >
                  Branch from here
                </button>
              </div>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))}
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