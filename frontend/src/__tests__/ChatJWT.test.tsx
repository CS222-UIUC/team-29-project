import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession, getSession } from "next-auth/react";
import Chat from "../app/chat/page";
import { apiClient } from "../utils/apiClient";

// Mock the modules we need
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
  getSession: jest.fn(),
}));

jest.mock("../utils/apiClient", () => ({
  apiClient: jest.fn(),
}));

// Create mock data
const mockSession = {
  user: {
    id: "user123",
    name: "Test User",
    email: "test@example.com",
    image: "https://example.com/avatar.jpg",
  },
  accessToken: "mock-jwt-token",
  expires: "2099-01-01T00:00:00.000Z",
};

const mockModelsResponse = {
  google: {
    available: true,
    models: [
      {
        id: "gemini-2.5-pro-exp-03-25",
        name: "Gemini 2.5 Pro Experimental",
        description:
          "Latest experimental Gemini model with advanced capabilities",
      },
    ],
  },
  anthropic: {
    available: true,
    models: [],
  },
  openai: {
    available: false,
    models: [],
  },
};

const mockConversations = [
  {
    id: "conv1",
    user_id: "user123",
    title: "Test Conversation 1",
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
  },
];

// Mock chat response
const mockChatResponse = {
  response: "This is a test response from the AI.",
  conversation_id: "new-conv123",
  user_message_id: "user-msg-123",
  assistant_message_id: "assistant-msg-123",
};

describe("Chat Component with JWT Authentication", () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock session state as authenticated
    (useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: "authenticated",
    });

    // Mock getSession for apiClient
    (getSession as jest.Mock).mockResolvedValue(mockSession);

    // Mock apiClient responses
    (apiClient as jest.Mock).mockImplementation((url) => {
      if (url === "/api/models") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockModelsResponse),
        });
      } else if (url === "/api/conversations") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockConversations),
        });
      } else if (url === "/api/chat") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockChatResponse),
        });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  test("renders chat component with authenticated user", async () => {
    render(<Chat />);

    // Wait for models and conversations to load
    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith("/api/models");
      expect(apiClient).toHaveBeenCalledWith("/api/conversations");
    });

    // Check that conversation appears in the sidebar
    expect(screen.getByText("Test Conversation 1")).toBeInTheDocument();

    // Check that provider and model dropdowns are populated
    expect(screen.getByText("Gemini 2.5 Pro Experimental")).toBeInTheDocument();
  });

  test("sends chat message with JWT authentication", async () => {
    const user = userEvent.setup();
    render(<Chat />);

    // Wait for models to load
    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith("/api/models");
    });

    // Type a message
    const textarea = screen.getByPlaceholderText("Type your message here...");
    await user.type(textarea, "Hello AI!");

    // Submit the form
    const sendButton = screen.getByRole("button", { name: /send message/i });
    await user.click(sendButton);

    // Verify apiClient was called with the right data and no user_id
    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith(
        "/api/chat",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Hello AI!"),
        }),
      );

      // Extract the body and parse it to verify no user_id was sent
      const callArgs = (apiClient as jest.Mock).mock.calls.find(
        (call) => call[0] === "/api/chat",
      );
      const bodyJson = JSON.parse(callArgs[1].body);

      // Verify user_id is not in the request body
      expect(bodyJson).not.toHaveProperty("user_id");

      // Verify required fields are present
      expect(bodyJson).toHaveProperty("message", "Hello AI!");
      expect(bodyJson).toHaveProperty("provider");
      expect(bodyJson).toHaveProperty("model_id");
    });

    // Verify the response is shown
    await waitFor(() => {
      expect(
        screen.getByText("This is a test response from the AI."),
      ).toBeInTheDocument();
    });
  });

  test("gets conversation metadata without sending user_id query param", async () => {
    render(<Chat />);

    // Wait for conversations to load
    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith("/api/conversations");
    });

    // Verify the user_id was not included in the URL
    const conversationsCall = (apiClient as jest.Mock).mock.calls.find(
      (call) => call[0] === "/api/conversations",
    );
    expect(conversationsCall[0]).not.toContain("user_id=");
  });

  test("gets conversation details without sending user_id query param", async () => {
    // Mock selecting conversation from sidebar
    const user = userEvent.setup();
    render(<Chat />);

    // Wait for conversations to load
    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith("/api/conversations");
    });

    // Find and click the conversation in the sidebar
    const conversationButton = screen.getByText("Test Conversation 1");
    await user.click(conversationButton);

    // Verify apiClient was called with conversation ID but without user_id
    await waitFor(() => {
      const conversationDetailCalls = (
        apiClient as jest.Mock
      ).mock.calls.filter((call) =>
        call[0].startsWith("/api/conversations/conv1"),
      );
      expect(conversationDetailCalls.length).toBeGreaterThan(0);
      expect(conversationDetailCalls[0][0]).not.toContain("user_id=");
    });
  });

  test("handles unauthorized errors from API", async () => {
    // Mock apiClient to return 401 for conversations
    (apiClient as jest.Mock).mockImplementation((url) => {
      if (url === "/api/conversations") {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ detail: "Not authenticated" }),
        });
      }

      // Other endpoints work normally
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    render(<Chat />);

    // Wait for error message
    await waitFor(() => {
      expect(
        screen.getByText(/Authentication error fetching conversations/i),
      ).toBeInTheDocument();
    });
  });
});
