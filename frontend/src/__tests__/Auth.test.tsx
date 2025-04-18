import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { signIn, useSession } from "next-auth/react";
import SignIn from "../app/auth/signin/page";

// Mock the next-auth/react module
jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
  useSession: jest.fn(),
}));

describe("Authentication", () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
  });

  test("Sign In page renders correctly", () => {
    render(<SignIn />);

    // Check for sign in heading
    expect(screen.getByText("Sign in to ThreadFlow")).toBeInTheDocument();

    // Check for Google sign in button
    expect(screen.getByText("Sign in with Google")).toBeInTheDocument();
  });

  test("Google sign in button calls signIn function", async () => {
    render(<SignIn />);

    // Find and click the Google sign in button
    const signInButton = screen.getByText("Sign in with Google");
    fireEvent.click(signInButton);

    // Check if signIn was called with the right parameters
    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
    });
  });

  test("Shows loading state when signing in", async () => {
    render(<SignIn />);

    // Find and click the Google sign in button
    const signInButton = screen.getByText("Sign in with Google");
    fireEvent.click(signInButton);

    // Wait for loading state to appear
    await waitFor(() => {
      expect(screen.getByText("Signing in...")).toBeInTheDocument();
    });
  });
});
