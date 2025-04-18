import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { useSession, getSession } from "next-auth/react";
import ChatPage from "../app/chat/page";
import { apiClient } from "../utils/apiClient";

// Mock the modules we need
jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
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

describe("Authentication Flow", () => {
  // Setup mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock session state
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
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  test("authenticated user sees conversation list", async () => {
    render(<ChatPage />);

    // Wait for conversations to load
    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith("/api/conversations");
    });

    // Check that conversation appears in the sidebar
    await waitFor(() => {
      expect(screen.getByText("Test Conversation 1")).toBeInTheDocument();
    });
  });

  test("unauthenticated user sees sign in prompt", async () => {
    // Mock unauthenticated session
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<ChatPage />);

    // Check that sign in message appears
    await waitFor(() => {
      expect(
        screen.getByText("Sign in to view and save conversations."),
      ).toBeInTheDocument();
    });

    // Check that Sign In link appears
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  test("apiClient uses JWT token from session", async () => {
    render(<ChatPage />);

    // Wait for models to load (which uses apiClient)
    await waitFor(() => {
      expect(apiClient).toHaveBeenCalled();
      expect(getSession).toHaveBeenCalled();
    });

    // The test for whether apiClient actually uses the token is in apiClient.test.ts
    // Here we just verify that getSession is called when making API requests
  });

  test("loading state shows correctly", async () => {
    // Mock loading session
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: "loading",
    });

    render(<ChatPage />);

    // Check that loading message appears
    expect(screen.getByText("Loading session...")).toBeInTheDocument();
  });

  test("handles API authentication errors", async () => {
    // Setup apiClient to fail with 401
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

    render(<ChatPage />);

    // Wait for conversations API call
    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith("/api/conversations");
    });

    // Check that error message appears
    await waitFor(() => {
      expect(
        screen.getByText(/Authentication error fetching conversations/i),
      ).toBeInTheDocument();
    });
  });
});
