import { getSession } from "next-auth/react";

/**
 * A helper function to make authenticated API calls to the backend
 */
export async function apiClient(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get the current session from Next-Auth
  const session = await getSession();
  
  // Prepare headers with authentication if session exists
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  
  // Add the JWT token as a Bearer token if available
  if (session?.accessToken) {
    headers["Authorization"] = `Bearer ${session.accessToken}`;
  }
  
  // Construct the full API URL (relative URLs will be handled by Next.js API routes)
  const url = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  
  // Make the API call with authentication headers
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  // Handle authentication errors
  if (response.status === 401) {
    console.error("Authentication error: Token expired or invalid");
    // You might want to redirect to login page or refresh the token
  }
  
  return response;
}