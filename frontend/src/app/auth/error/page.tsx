"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  // Map error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    Configuration: "There is a problem with the server configuration.",
    AccessDenied: "You do not have permission to sign in.",
    Verification: "The verification link may have been used or has expired.",
    OAuthSignin: "Error in the OAuth sign-in process.",
    OAuthCallback: "Error in the OAuth callback process.",
    OAuthCreateAccount: "Could not create an OAuth provider account.",
    EmailCreateAccount: "Could not create an email provider account.",
    Callback: "Error in the OAuth callback.",
    OAuthAccountNotLinked: "This account is already linked to another sign-in method.",
    EmailSignin: "Error sending the verification email.",
    CredentialsSignin: "The sign in failed. Check the details you provided are correct.",
    SessionRequired: "Please sign in to access this page.",
    default: "An unknown error occurred during authentication."
  };

  // Get the appropriate error message
  const errorMessage = error && errorMessages[error] 
    ? errorMessages[error]
    : errorMessages.default;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-600">Authentication Error</h1>
          <div className="mt-4">
            <p className="text-gray-700">{errorMessage}</p>
            <p className="mt-2 text-sm text-gray-500">
              Error code: {error || "unknown"}
            </p>
          </div>
          <div className="mt-6">
            <Link 
              href="/auth/signin"
              className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Try Again
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}