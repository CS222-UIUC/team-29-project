export type ModelConfig = {
  id: string;
  name: string;
  description: string;
};

export type ProviderConfig = {
  available: boolean;
  models: ModelConfig[];
};

export type ModelsResponse = {
  [provider: string]: ProviderConfig;
};

export type MessageItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO Date string from backend
};

export type Conversation = {
  id: string;
  user_id: string;
  title: string;
  messages: MessageItem[];
  created_at: string; // ISO Date string
  updated_at: string; // ISO Date string
  parent_conversation_id: string | null;
  branch_point_message_id: string | null;
};

// Metadata for a conversation (excluding messages), used for lists/trees
export type ConversationMetadata = Omit<Conversation, 'messages'>;

// Response type from the modified POST /chat endpoint
export type ChatApiResponse = {
    response: string;
    conversation_id: string;
    user_message_id: string;
    assistant_message_id: string;
};