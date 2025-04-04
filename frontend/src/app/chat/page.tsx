"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

// Define the structure of a chat message
interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
}

// Define the structure of a chat session
interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
}

export default function Chat() {
  // State to manage chat sessions
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  
  // State for the currently active chat session
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  
  // State for user input and loading/error handling
  const [userInput, setUserInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Create a new chat session
  const createNewChat = () => {
    const newChatId = uuidv4();
    const newChat: ChatSession = {
      id: newChatId,
      name: `Chat ${chatSessions.length + 1}`,
      messages: []
    };
    
    setChatSessions(prevSessions => [...prevSessions, newChat]);
    setActiveChatId(newChatId);
  };

  // Branch out an existing chat session from a specific message
  const branchChatFromMessage = (messageId: string) => {
    const activeChat = chatSessions.find(session => session.id === activeChatId);
    if (!activeChat) return;
    
    // Find the index of the message to branch from
    const branchIndex = activeChat.messages.findIndex(m => m.id === messageId);
    if (branchIndex === -1) return;
    
    // Create a new chat session with messages from the beginning up to the selected message (inclusive)
    const newChatId = uuidv4();
    const newMessages = activeChat.messages.slice(0, branchIndex + 1);
    const newChat: ChatSession = {
      id: newChatId,
      name: `${activeChat.name} (Branch from ${branchIndex + 1})`,
      messages: newMessages
    };

    setChatSessions(prevSessions => [...prevSessions, newChat]);
    setActiveChatId(newChatId);
  };

  // Initialize with a first chat session on component mount
  useEffect(() => {
    createNewChat();
  }, []);

  // Handle message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userInput.trim() || !activeChatId) return;
    
    setIsLoading(true);
    setError(null);
    
    // Create user message
    const userMessage: Message = {
      id: uuidv4(),
      text: userInput,
      sender: "user"
    };
    
    // Update chat sessions to add user message
    setChatSessions(prevSessions => 
      prevSessions.map(session => 
        session.id === activeChatId 
          ? { ...session, messages: [...session.messages, userMessage] }
          : session
      )
    );
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const result = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userInput }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!result.ok) {
        throw new Error(`Server returned ${result.status}: ${result.statusText}`);
      }
      
      const data = await result.json();
      
      // Create AI response message
      const aiMessage: Message = {
        id: uuidv4(),
        text: data.response,
        sender: "ai"
      };
      
      // Update chat sessions to add AI message
      setChatSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === activeChatId 
            ? { ...session, messages: [...session.messages, aiMessage] }
            : session
        )
      );
    } catch (error: unknown) {
      console.error("API Error:", error);
      
      // Create error message
      const errorMessage: Message = {
        id: uuidv4(),
        text: error instanceof Error && error.name === "AbortError"
          ? "Request timed out. The API might be taking too long to respond."
          : "Error connecting to the server. Please try again.",
        sender: "ai"
      };
      
      setChatSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === activeChatId 
            ? { ...session, messages: [...session.messages, errorMessage] }
            : session
        )
      );
      
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
      setUserInput("");
    }
  };

  // Get the current active chat session
  const activeChat = chatSessions.find(session => session.id === activeChatId);

  return (
    <div className="min-h-screen p-8 flex font-[family-name:var(--font-geist-sans)]">
      {/* Sidebar for chat sessions */}
      <div className="w-64 pr-4 border-r">
        <button 
          onClick={createNewChat}
          className="w-full mb-4 p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + New Chat
        </button>
        
        {chatSessions.map(session => (
          <button
            key={session.id}
            onClick={() => setActiveChatId(session.id)}
            className={`w-full text-left p-2 mb-2 rounded ${
              activeChatId === session.id 
                ? "bg-blue-100 dark:bg-blue-900" 
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            {session.name}
          </button>
        ))}
      </div>

      {/* Main chat interface */}
      <div className="flex-1 pl-4 flex flex-col">
        <header className="mb-8">
          <Link href="/" className="text-2xl font-bold">ThreadFlow</Link>
        </header>
        
        <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
          <h1 className="text-3xl font-bold mb-6">{activeChat?.name}</h1>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded mb-4">
              <p>Error: {error}</p>
            </div>
          )}
          
          {/* Chat messages display */}
          <div className="bg-black/[.05] dark:bg-white/[.06] rounded-lg p-6 mb-6 min-h-[200px] flex flex-col space-y-4 overflow-y-auto max-h-[400px]">
            {activeChat?.messages.map((message, index) => (
              <div 
                key={message.id} 
                className={`p-3 rounded-lg relative ${
                  message.sender === "user" 
                    ? "bg-blue-100 dark:bg-blue-900 self-end" 
                    : "bg-gray-100 dark:bg-gray-700 self-start"
                }`}
              >
                {message.text}
                {/* Branch button: clicking it creates a new chat session with all messages up to this one */}
                <button
                  onClick={() => branchChatFromMessage(message.id)}
                  className="absolute top-1 right-1 text-xs text-blue-600 hover:underline"
                  title="Branch from here"
                >
                  Branch
                </button>
              </div>
            ))}
            
            {isLoading && (
              <div className="text-gray-500 italic">
                Getting response...
              </div>
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
    </div>
  );
}
