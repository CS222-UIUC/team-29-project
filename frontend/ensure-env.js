// Simple script to verify environment variables
const fs = require("fs");
const path = require("path");

// Check and log critical environment variables
console.log("Environment Variable Check:");
console.log("=========================");
console.log(
  "NEXTAUTH_SECRET:",
  process.env.NEXTAUTH_SECRET ? "✅ Set" : "❌ Missing",
);
console.log(
  "NEXTAUTH_URL:",
  process.env.NEXTAUTH_URL ? "✅ Set" : "❌ Missing",
);
console.log(
  "GOOGLE_CLIENT_ID:",
  process.env.GOOGLE_CLIENT_ID ? "✅ Set" : "❌ Missing",
);
console.log(
  "GOOGLE_CLIENT_SECRET:",
  process.env.GOOGLE_CLIENT_SECRET ? "✅ Set" : "❌ Missing",
);
console.log(
  "NEXTAUTH_DEBUG:",
  process.env.NEXTAUTH_DEBUG ? "✅ Set" : "❌ Missing",
);
console.log("=========================");

// Create a temporary .env.local file if needed
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn("Warning: Missing OAuth credentials in environment variables.");
  console.warn("Checking .env file...");

  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      const envLines = envContent.split("\n");
      const envVars = {};

      // Parse .env file
      envLines.forEach((line) => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          envVars[key] = value;
        }
      });

      // Log what was found in .env
      console.log("Values from .env file:");
      console.log(
        "GOOGLE_CLIENT_ID in .env:",
        envVars.GOOGLE_CLIENT_ID ? "✅ Found" : "❌ Missing",
      );
      console.log(
        "GOOGLE_CLIENT_SECRET in .env:",
        envVars.GOOGLE_CLIENT_SECRET ? "✅ Found" : "❌ Missing",
      );
    } else {
      console.warn("No .env file found");
    }
  } catch (error) {
    console.error("Error reading .env file:", error);
  }
}
