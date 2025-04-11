"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ModelsResponse, ProviderConfig, ConversationMetadata, Conversation, MessageItem, ChatApiResponse} from "@/types/models";
import { findBestModelForProvider, getModelDescription, isProviderAvailable } from "@/utils/modelUtils";

interface SidebarProps {
  metadataList: ConversationMetadata[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreateNew: () => void; // Callback to create a new root chat
  isLoading: boolean;
}

function ChatSidebar({ metadataList, activeId, onSelect, onCreateNew, isLoading }: SidebarProps) {
  const sortedList = metadataList
      ? [...metadataList].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      : null;

  return (
      <div className="w-64 pr-4 border-r border-gray-300 dark:border-gray-700 flex flex-col h-full overflow-y-auto">
           <button
              onClick={onCreateNew}
              className="w-full mb-4 p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              disabled={isLoading}
          >
              + New Chat
          </button>
          {isLoading && <p className="text-sm text-gray-500">Loading chats...</p>}
          {!isLoading && !sortedList?.length && <p className="text-sm text-gray-500">No conversations yet.</p>}
          {sortedList?.map(meta => (
              <button
                  key={meta.id}
                  onClick={() => onSelect(meta.id)}
                  className={`w-full text-left p-2 mb-1 rounded text-sm truncate ${
                      activeId === meta.id
                          ? "bg-blue-100 dark:bg-blue-800 font-semibold"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  title={meta.title} // Show full title on hover
              >
                  {/* Add indicator for branches? */}
                  {meta.parent_conversation_id && <span className="mr-1"> L </span>}
                  {meta.title}
              </button>
          ))}
      </div>
  );
}

export default function Chat() {
  const { data: session, status } = useSession();
  // --- Existing State ---
  const userId = session?.user?.id;
  const [userInput, setUserInput] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("google");
  const [selectedModelId, setSelectedModelId] = useState<string>(""); // Initialize empty, set after models load
  const [models, setModels] = useState<ModelsResponse | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(true); // Start true

  // --- NEW State for Branching ---
  const [conversationMetadataList, setConversationMetadataList] = useState<ConversationMetadata[] | null>(null);
  const [activeConversationContent, setActiveConversationContent] = useState<Conversation | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState<boolean>(false);
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false);
  const [isLoadingResponse, setIsLoadingResponse] = useState<boolean>(false); // For chat submit button
  const [error, setError] = useState<string | null>(null); // General error state

  // Fetch available models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      setIsLoadingModels(true);
      setError(null);
      try {
        // Use relative path for API routes handled by Next.js rewrite
        const response = await fetch("/api/models");
        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.status}`);
        }
        const data: ModelsResponse = await response.json();
        setModels(data);

        // Find the first available provider and its best model to set as default
        let defaultProvider = "google"; // Default fallback
        let defaultModel = "";
        const providers = Object.keys(data);
        for (const provider of providers) {
            if (isProviderAvailable(data, provider)) {
                defaultProvider = provider;
                defaultModel = findBestModelForProvider(data, provider) || "";
                break; // Found the first available, stop looking
            }
        }
        setSelectedProvider(defaultProvider);
        setSelectedModelId(defaultModel);

      } catch (err) {
        console.error("Error fetching models:", err);
        setError(`Failed to load models: ${err instanceof Error ? err.message : String(err)}`);
        // Keep default provider/model empty or fallback
        setSelectedProvider("google");
        setSelectedModelId("");
      } finally {
        setIsLoadingModels(false);
      }
    };
    fetchModels();
  }, []);
  const fetchMetadata = useCallback(async () => {
    if (!userId) return; // Need user ID

    setIsLoadingMetadata(true);
    setError(null);
    try {
      // Use relative path for API routes handled by Next.js rewrite
      // Pass user_id as query parameter
      const response = await fetch(`/api/conversations?user_id=${userId}`);
      if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
              // Handle auth errors, maybe sign out user?
              setError("Authentication error fetching conversations.");
          } else {
             throw new Error(`Failed to fetch conversation list: ${response.status}`);
          }
          setConversationMetadataList(null); // Clear list on error
          return; // Stop processing
      }
      const data: ConversationMetadata[] = await response.json();
      setConversationMetadataList(data);

      // Optional: If no active chat, select the most recent one automatically
      // if (!activeConversationId && data.length > 0) {
      //    setActiveConversationId(data[0].id); // data should be sorted by backend
      // }

    } catch (err) {
      console.error("Error fetching conversation metadata:", err);
      setError(`Failed to load conversation list: ${err instanceof Error ? err.message : String(err)}`);
      setConversationMetadataList(null);
    } finally {
      setIsLoadingMetadata(false);
    }
  }, [userId]); // Dependency: userId

  const fetchFullConversation = useCallback(async (id: string) => {
    if (!userId) return; // Need user ID for ownership check

    setIsLoadingContent(true);
    setError(null);
    // Optimistically keep old content while loading? Or clear it? Clear for now.
    // setActiveConversationContent(null);
    try {
      // Pass user_id as query parameter for ownership check on backend
      const response = await fetch(`/api/conversations/${id}?user_id=${userId}`);
      if (!response.ok) {
        if (response.status === 404) {
             setError("Conversation not found.");
             setActiveConversationId(null); // Deselect if not found
        } else if (response.status === 403) {
             setError("You don't have permission to view this conversation.");
             setActiveConversationId(null); // Deselect if forbidden
        } else {
            throw new Error(`Failed to fetch conversation details: ${response.status}`);
        }
        setActiveConversationContent(null); // Clear content on error
        return;
      }
      const data: Conversation = await response.json();
      setActiveConversationContent(data);
    } catch (err) {
      console.error("Error fetching full conversation:", err);
      setError(`Failed to load conversation: ${err instanceof Error ? err.message : String(err)}`);
      setActiveConversationContent(null);
      setActiveConversationId(null); // Deselect on error
    } finally {
      setIsLoadingContent(false);
    }
  }, [userId]); // Dependency: userId


  // --- Handlers ---
  const handleSelectConversation = (id: string) => {
      if (id !== activeConversationId) {
          setActiveConversationId(id);
          // fetchFullConversation will be triggered by the useEffect watching activeConversationId
          setError(null); // Clear previous errors on selection change
      }
  };

  // Clears the active selection to signal intent for a new chat
  // The actual creation happens when the user sends the first message via handleSubmit
  const handleCreateNewChat = () => {
       setActiveConversationId(null);
       setActiveConversationContent(null); // Clear content
       setUserInput(""); // Clear input
       setError(null);
       // Focus the textarea?
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !selectedModelId || !userId || isLoadingResponse || isLoadingContent) return;

    setIsLoadingResponse(true);
    setError(null);

    const currentConversationId = activeConversationId; // Capture current ID before potential changes

    // Optimistic UI Update (Optional but improves UX)
    const tempUserMessageId = `temp-user-${Date.now()}`;
    const optimisticUserMessage: MessageItem = {
         id: tempUserMessageId,
         role: "user",
         content: userInput,
         timestamp: new Date().toISOString()
    };
    if (activeConversationContent) {
        setActiveConversationContent(prev => prev ? { ...prev, messages: [...prev.messages, optimisticUserMessage] } : null);
    } else {
         // If starting a new chat, create temporary optimistic content
         setActiveConversationContent({
              id: "temp-new-chat", // Temporary ID
              user_id: userId,
              title: userInput.substring(0, 30) + "...",
              messages: [optimisticUserMessage],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              parent_conversation_id: null,
              branch_point_message_id: null
         });
    }
    const messageToSend = userInput; // Store user input before clearing
    setUserInput(""); // Clear input field immediately


    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          provider: selectedProvider,
          model_id: selectedModelId,
          user_id: userId,
          conversation_id: currentConversationId // Send null/undefined if starting new chat
        }),
      });

      if (!response.ok) {
        // Rollback optimistic update on error?
        if (activeConversationContent?.messages.at(-1)?.id === tempUserMessageId) {
            setActiveConversationContent(prev => prev ? { ...prev, messages: prev.messages.slice(0, -1) } : null);
        }
        const errorData = await response.json().catch(() => ({ detail: "Unknown server error" }));
        throw new Error(`Server error ${response.status}: ${errorData.detail || response.statusText}`);
      }

      const data: ChatApiResponse = await response.json();

      // --- Update State with Real Data ---
      const newUserMessage: MessageItem = {
          ...optimisticUserMessage,
          id: data.user_message_id, // Use real ID from backend
      };
      const assistantMessage: MessageItem = {
          id: data.assistant_message_id,
          role: "assistant",
          content: data.response,
          timestamp: new Date().toISOString() // Backend doesn't return this, use client time or modify backend
      };

      // If it was a new chat, we now have the real ID and potentially title
      const realConversationId = data.conversation_id;
      const isNewConversation = !currentConversationId;


      // Update Active Conversation Content
      setActiveConversationContent(prev => {
          if (!prev) return null; // Should not happen if optimistic update worked

          // Find and replace optimistic message or just append if optimistic failed/disabled
          const messages = prev.messages.filter(m => m.id !== tempUserMessageId);
          messages.push(newUserMessage);
          messages.push(assistantMessage);

          return {
              ...prev,
              id: realConversationId, // Update ID if it was new/temporary
              messages: messages,
              updated_at: new Date().toISOString(), // Update timestamp
               // Title might change on first message, backend doesn't return it, refetch metadata?
          };
      });

      // Update Metadata List
      setConversationMetadataList(prevList => {
          if (!prevList) return isNewConversation ? [] : null; // Should fetch if null

          const existingIndex = prevList.findIndex(meta => meta.id === realConversationId);
          const now = new Date().toISOString();

          if (existingIndex !== -1) {
              // Update existing metadata item
              const updatedMeta = { ...prevList[existingIndex], updated_at: now };
               // Maybe update title if backend logic changes it? For now, just timestamp.
              const newList = [...prevList];
              newList[existingIndex] = updatedMeta;
               // Re-sort maybe needed if sorting is purely client-side
               // newList.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
              return newList;
          } else if (isNewConversation) {
              // Add new metadata item (need title - fetch full or extract from active?)
              // Fetching full might be inefficient, extracting from activeConversationContent is better if available
               const newMeta: ConversationMetadata = {
                   id: realConversationId,
                   user_id: userId,
                   title: activeConversationContent?.title || messageToSend.substring(0,30) + "...", // Use title from active content or generate
                   created_at: now,
                   updated_at: now,
                   parent_conversation_id: null, // New root chat
                   branch_point_message_id: null
               };
              return [newMeta, ...prevList]; // Add to start (assuming sorted desc)
          }
          return prevList; // No change
      });

      // Ensure the newly created/updated conversation is active
      if (activeConversationId !== realConversationId) {
          setActiveConversationId(realConversationId);
      }


    } catch (err) {
      console.error("API Error:", err);
      setError(err instanceof Error ? err.message : String(err));
       // Consider adding error message to chat UI as well
       // Rollback optimistic update if error occurred after it
       if (activeConversationContent?.messages.at(-1)?.id === tempUserMessageId) {
          setActiveConversationContent(prev => prev ? { ...prev, messages: prev.messages.slice(0, -1) } : null);
      }
    } finally {
      setIsLoadingResponse(false);
    }
  };

  const handleBranch = async (messageId: string) => {
    if (!activeConversationId || !userId || isLoadingResponse || isLoadingContent) return;

    setIsLoadingResponse(true); // Use same loading state? Or a dedicated branching state?
    setError(null);

    try {
       const response = await fetch(`/api/conversations/${activeConversationId}/branch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message_id: messageId, user_id: userId }) // Pass user_id for backend check
       });

       if (!response.ok) {
           const errorData = await response.json().catch(() => ({ detail: "Branching failed" }));
           throw new Error(`Branching error ${response.status}: ${errorData.detail || response.statusText}`);
       }

       const newBranchConversation: Conversation = await response.json();

       // --- Update State after successful branch ---

       // 1. Set the new branch as the active conversation content
       setActiveConversationContent(newBranchConversation);

       // 2. Set the new branch ID as the active ID
       setActiveConversationId(newBranchConversation.id);

       // 3. Add metadata for the new branch to the list
       setConversationMetadataList(prevList => {
           const newMeta: ConversationMetadata = {
               id: newBranchConversation.id,
               user_id: newBranchConversation.user_id,
               title: newBranchConversation.title,
               created_at: newBranchConversation.created_at,
               updated_at: newBranchConversation.updated_at,
               parent_conversation_id: newBranchConversation.parent_conversation_id,
               branch_point_message_id: newBranchConversation.branch_point_message_id
           };
            // Add to the beginning assuming descending sort
           return [newMeta, ...(prevList || [])];
       });

    } catch (err) {
         console.error("Branching Error:", err);
         setError(`Failed to create branch: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
        setIsLoadingResponse(false);
    }
  };

  // Model/Provider Selection Handlers (update state)
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value;
    setSelectedProvider(newProvider);
    // Automatically select the best/first model for the new provider
    const bestModel = findBestModelForProvider(models, newProvider);
    setSelectedModelId(bestModel || ""); // Set to empty if no models found
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModelId(e.target.value);
  };

  useEffect(() => {
    if (status === 'authenticated' && userId && !conversationMetadataList) {
        fetchMetadata();
    }
    // If user logs out, clear the state
    if (status === 'unauthenticated') {
         setConversationMetadataList(null);
         setActiveConversationContent(null);
         setActiveConversationId(null);
    }
  }, [status, userId, fetchMetadata, conversationMetadataList]);

  // --- Fetch full content when active ID changes ---
  useEffect(() => {
    if (activeConversationId && userId) {
         // Optional: Check if content for this ID is already loaded to avoid refetch
         // if (activeConversationContent?.id !== activeConversationId) {
            fetchFullConversation(activeConversationId);
         // }
    } else {
        // Clear content if no ID is active
        setActiveConversationContent(null);
    }
  }, [activeConversationId, userId, fetchFullConversation]);

  const getBranchChildren = (messageId: string): ConversationMetadata[] => {
    if (!conversationMetadataList || !activeConversationId) return [];
    return conversationMetadataList.filter(meta =>
        meta.parent_conversation_id === activeConversationId &&
        meta.branch_point_message_id === messageId
    );
  };

  return (
    // Use flex layout for sidebar + main content
    <div className="flex h-screen font-[family-name:var(--font-geist-sans)]">
        {/* Sidebar */}
        {status === 'authenticated' && (
             <ChatSidebar
                 metadataList={conversationMetadataList || []}
                 activeId={activeConversationId}
                 onSelect={handleSelectConversation}
                 onCreateNew={handleCreateNewChat}
                 isLoading={isLoadingMetadata}
             />
        )}
        {/* Add placeholder or message if not authenticated */}
         {status === 'loading' && <div className="w-64 pr-4 border-r border-gray-300 dark:border-gray-700 flex items-center justify-center"><p>Loading session...</p></div>}
         {status === 'unauthenticated' && (
             <div className="w-64 pr-4 border-r border-gray-300 dark:border-gray-700 flex flex-col p-4 items-center justify-center text-center">
                 <p className="text-sm mb-4">Sign in to view and save conversations.</p>
                 <Link href="/auth/signin" className="text-blue-500 underline">Sign In</Link>
             </div>
         )}


        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto">
            <header className="mb-4 flex justify-between items-center">
                <Link href="/" className="text-xl md:text-2xl font-bold">ThreadFlow</Link>
                {/* Maybe add Sign Out button here? */}
            </header>

            <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
                <h1 className="text-xl md:text-3xl font-bold mb-4 truncate" title={activeConversationContent?.title || "Chat"}>
                    {activeConversationContent?.title || (activeConversationId ? "Loading..." : "Select or Start a Chat")}
                </h1>

                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded mb-4 text-sm">
                    <p>Error: {error}</p>
                  </div>
                )}

                {/* Chat Messages Display */}
                <div className="bg-black/[.05] dark:bg-white/[.06] rounded-lg p-4 md:p-6 mb-6 flex-1 flex flex-col space-y-4 overflow-y-auto min-h-[200px]">
                     {isLoadingContent && <p className="text-gray-500 text-center">Loading conversation...</p>}
                     {!isLoadingContent && !activeConversationContent && status === 'authenticated' && <p className="text-gray-500 text-center">Select a conversation or start a new one.</p>}
                     {!isLoadingContent && status !== 'authenticated' && <p className="text-gray-500 text-center">Please sign in to chat.</p>}

                     {activeConversationContent?.messages.map((message) => {
                         const branchChildren = getBranchChildren(message.id);
                         const hasBranches = branchChildren.length > 0;
                         return (
                             <div
                                 key={message.id}
                                 className={`p-3 rounded-lg relative max-w-[80%] break-words ${
                                     message.role === "user"
                                         ? "bg-blue-100 dark:bg-blue-900 self-end"
                                         : "bg-gray-100 dark:bg-gray-700 self-start"
                                 }`}
                             >
                                 <p className="whitespace-pre-wrap">{message.content}</p>
                                 {/* Branch Button & Indicator */}
                                 <div className="absolute top-0 -right-2 transform translate-x-full flex flex-col items-center opacity-50 hover:opacity-100 transition-opacity">
                                     <button
                                         onClick={() => handleBranch(message.id)}
                                         className="p-1 bg-gray-200 dark:bg-gray-600 rounded-full text-xs leading-none"
                                         title="Branch from this message"
                                         disabled={isLoadingResponse || isLoadingContent || !activeConversationId}
                                     >
                                         {/* Simple Branch Icon (e.g., Fork) */}
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                          </svg>
                                     </button>
                                      {hasBranches && (
                                         <span className="mt-1 text-[10px] text-gray-500 dark:text-gray-400" title={`Branched ${branchChildren.length} time(s)`}>
                                             {/* Maybe list children titles on hover? */}
                                             ({branchChildren.length})
                                         </span>
                                     )}
                                 </div>
                             </div>
                         );
                     })}

                    {isLoadingResponse && (
                      <div className="text-gray-500 italic self-start">
                        Getting response...
                      </div>
                    )}
                </div>

                {/* Model Selection (reuse existing logic) */}
                <div className="mb-4 flex flex-col sm:flex-row gap-4">
                   <div className="flex-1">
                       <label htmlFor="provider" className="block text-sm font-medium mb-1">Provider</label>
                       <select
                         id="provider"
                         className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 disabled:opacity-50"
                         value={selectedProvider}
                         onChange={handleProviderChange} // Need to implement handler
                         disabled={isLoadingModels || isLoadingResponse || !models}
                       >
                         {isLoadingModels ? ( <option>Loading...</option> ) :
                           !models ? (<option>Error loading</option>) :
                           (Object.keys(models).map(provider => (
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
                         className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 disabled:opacity-50"
                         value={selectedModelId}
                         onChange={handleModelChange} // Need to implement handler
                         disabled={isLoadingModels || isLoadingResponse || !models || !selectedProvider || !models[selectedProvider]?.models.length}
                       >
                           {isLoadingModels ? (<option>Loading...</option>) :
                            !models || !models[selectedProvider]?.models.length ? (<option>Select Provider</option>) :
                           (models[selectedProvider]?.models.map((model) => (
                             <option key={model.id} value={model.id}>
                               {model.name}
                             </option>
                           ))
                         )}
                       </select>
                   </div>
                </div>
                {selectedProvider && selectedModelId && models && (
                    <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                        <p>{getModelDescription(models, selectedProvider, selectedModelId)}</p>
                    </div>
                )}


                {/* Input Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                     <textarea
                         className="w-full p-4 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 min-h-[100px] resize-none disabled:opacity-50"
                         placeholder="Type your message here..."
                         value={userInput}
                         onChange={(e) => setUserInput(e.target.value)}
                         disabled={isLoadingResponse || isLoadingContent || !selectedModelId}
                     />
                     <button
                         type="submit"
                         disabled={isLoadingResponse || !userInput.trim() || !selectedModelId || isLoadingContent}
                         className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 md:h-12 px-5 disabled:opacity-50 disabled:cursor-not-allowed self-end"
                     >
                        {isLoadingResponse ? "Sending..." : "Send Message"}
                     </button>
                </form>
            </main>
        </div>
    </div>
  );
}