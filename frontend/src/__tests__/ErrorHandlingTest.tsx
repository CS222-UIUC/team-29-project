import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// This is a simplified test component just for error handling
function ErrorHandlingDemo() {
  const [error, setError] = React.useState<string | null>(null);
  const [response, setResponse] = React.useState<string>("");

  const triggerError = async () => {
    try {
      throw new Error("Test error message");
    } catch (err) {
      setResponse("Error connecting to the server. Please try again.");
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      {error && (
        <div className="error-box" role="alert">
          <p>Error: {error}</p>
        </div>
      )}

      <div className="response-area">
        <p>{response}</p>
      </div>

      <button onClick={triggerError}>Trigger Error</button>
    </div>
  );
}

describe("Error Handling", () => {
  test("displays error message in both locations", async () => {
    const user = userEvent.setup();
    render(<ErrorHandlingDemo />);

    // Trigger the error
    const button = screen.getByRole("button", { name: /trigger error/i });
    await user.click(button);

    // Check for error in the error box
    await waitFor(() => {
      const errorBox = screen.getByRole("alert");
      expect(errorBox).toBeInTheDocument();
      expect(
        screen.getByText(/Error: Test error message/i),
      ).toBeInTheDocument();
    });

    // Check for error message in the response area
    await waitFor(() => {
      const responseText = screen.getByText(/Error connecting to the server/i);
      expect(responseText).toBeInTheDocument();
    });
  });
});
