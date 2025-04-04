"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ModelsResponse, ProviderConfig } from "@/types/models";
import { findBestModelForProvider, getModelDescription, isProviderAvailable } from "@/utils/modelUtils";

export default function Chat() {
  const { data: session } = useSession();
  const [userInput, setUserInput] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>("google");
  const [selectedModelId, setSelectedModelId] = useState<string>("gemini-2.5-pro-exp-03-25");
  const [models, setModels] = useState<ModelsResponse | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Fetch available models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      setIsLoadingModels(true);
      try {
        const response = await fetch("http://localhost:8000/models");
        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.status}`);
        }
        const data = await response.json();
        setModels(data);
        
        // Set first available provider and model as default
        for (const [provider, config] of Object.entries(data) as [string, ProviderConfig][]) {
          if (config.available && config.models.length > 0) {
            setSelectedProvider(provider);
            setSelectedModelId(config.models[0].id);
            break;
          }
        }
      } catch (error) {
        console.error("Error fetching models:", error);
        setError("Failed to fetch available models");
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
  }, []);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value;
    setSelectedProvider(provider);
    
    // Find the best model for this provider
    const bestModelId = findBestModelForProvider(models, provider);
    if (bestModelId) {
      setSelectedModelId(bestModelId);
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModelId(e.target.value);
  };

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
        body: JSON.stringify({ 
          message: userInput,
          provider: selectedProvider,
          model_id: selectedModelId,
          user_id: session?.user?.id || null,
          conversation_id: conversationId
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!result.ok) {
        throw new Error(`Server returned ${result.status}: ${result.statusText}`);
      }
      
      const data = await result.json();
      setResponse(data.response);
      
      // If we got a conversation ID back, store it
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }
    } catch (error: unknown) {
      console.error("API Error:", error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        setResponse("Request timed out. The API might be taking too long to respond.");
        setError("Request timed out after 30 seconds");
      } else {
        setResponse("Error connecting to the server. Please try again.");
        setError(error instanceof Error ? error.message : String(error));
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
        
        <div className="mb-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="provider" className="block text-sm font-medium mb-1">Provider</label>
            <select
              id="provider"
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              value={selectedProvider}
              onChange={handleProviderChange}
              disabled={isLoadingModels || !models}
            >
              {!models ? (
                <option>Loading...</option>
              ) : (
                Object.keys(models).map(provider => (
                  <option 
                    key={provider} 
                    value={provider}
                    disabled={!isProviderAvailable(models, provider)}
                  >
                    {provider.charAt(0).toUpperCase() + provider.slice(1)} {!isProviderAvailable(models, provider) && "(API key required)"}
                  </option>
                ))
              )}
            </select>
          </div>
          
          <div className="flex-1">
            <label htmlFor="model" className="block text-sm font-medium mb-1">Model</label>
            <select
              id="model"
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              value={selectedModelId}
              onChange={handleModelChange}
              disabled={isLoadingModels || !models}
            >
              {!models ? (
                <option>Loading...</option>
              ) : (
                models[selectedProvider]?.models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
        
        {selectedProvider && selectedModelId && models && (
          <div className="mb-4 text-sm text-gray-500">
            <p>{getModelDescription(models, selectedProvider, selectedModelId)}</p>
          </div>
        )}
        
        {session ? (
          <div className="mb-4 text-sm text-green-600">
            <p>Logged in as {session.user?.name}. Your conversations will be saved.</p>
            {conversationId && <p>Conversation ID: {conversationId}</p>}
          </div>
        ) : (
          <div className="mb-4 text-sm text-amber-600">
            <p>Not logged in. Your conversations will not be saved. <Link href="/auth/signin" className="underline">Sign in</Link> to save conversations.</p>
          </div>
        )}
        
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
            disabled={isLoading || !userInput.trim() || !selectedModelId}
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-12 px-5 disabled:opacity-50 disabled:cursor-not-allowed self-end"
          >
            {isLoading ? "Sending..." : "Send Message"}
          </button>
        </form>
      </main>
    </div>
  );
}