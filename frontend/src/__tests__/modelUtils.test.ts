import {
  findBestModelForProvider,
  getModelDescription,
  isProviderAvailable,
} from "../utils/modelUtils";
import { ModelsResponse } from "../types/models";

const mockModelsResponse: ModelsResponse = {
  google: {
    available: true,
    models: [
      {
        id: "gemini-2.5-pro-exp-03-25",
        name: "Gemini 2.5 Pro Experimental",
        description:
          "Latest experimental Gemini model with advanced capabilities",
      },
      {
        id: "gemini-2.0-flash",
        name: "Gemini 2.0 Flash",
        description: "Fast, efficient model with strong performance",
      },
    ],
  },
  anthropic: {
    available: true,
    models: [
      {
        id: "claude-3-7-sonnet-20250219",
        name: "Claude 3.7 Sonnet",
        description: "Latest and most capable Claude Sonnet model",
      },
      {
        id: "claude-3-5-sonnet-20241022",
        name: "Claude 3.5 Sonnet v2",
        description: "Balanced performance and cost Sonnet model",
      },
    ],
  },
  openai: {
    available: true,
    models: [
      {
        id: "gpt-4o",
        name: "GPT-4o",
        description:
          "OpenAI's latest multimodal model with optimal performance",
      },
    ],
  },
  unavailable: {
    available: false,
    models: [],
  },
};

describe("Model Utilities", () => {
  describe("findBestModelForProvider", () => {
    test("returns the best Anthropic model", () => {
      const result = findBestModelForProvider(mockModelsResponse, "anthropic");
      expect(result).toBe("claude-3-7-sonnet-20250219");
    });

    test("returns the best Google model", () => {
      const result = findBestModelForProvider(mockModelsResponse, "google");
      expect(result).toBe("gemini-2.5-pro-exp-03-25");
    });

    test("returns the best OpenAI model", () => {
      const result = findBestModelForProvider(mockModelsResponse, "openai");
      expect(result).toBe("gpt-4o");
    });

    test("returns first model if preferred model not found", () => {
      // Create a modified response without the preferred model
      const modifiedResponse = {
        ...mockModelsResponse,
        google: {
          available: true,
          models: [
            {
              id: "gemini-2.0-flash",
              name: "Gemini 2.0 Flash",
              description: "Fast, efficient model with strong performance",
            },
          ],
        },
      };

      const result = findBestModelForProvider(modifiedResponse, "google");
      expect(result).toBe("gemini-2.0-flash");
    });

    test("returns undefined for unavailable provider", () => {
      const result = findBestModelForProvider(
        mockModelsResponse,
        "unavailable",
      );
      expect(result).toBeUndefined();
    });

    test("returns undefined for null models", () => {
      const result = findBestModelForProvider(null, "google");
      expect(result).toBeUndefined();
    });
  });

  describe("getModelDescription", () => {
    test("returns description for a specific model", () => {
      const result = getModelDescription(
        mockModelsResponse,
        "anthropic",
        "claude-3-7-sonnet-20250219",
      );
      expect(result).toBe("Latest and most capable Claude Sonnet model");
    });

    test("returns empty string for non-existent model", () => {
      const result = getModelDescription(
        mockModelsResponse,
        "anthropic",
        "non-existent-model",
      );
      expect(result).toBe("");
    });

    test("returns empty string for non-existent provider", () => {
      const result = getModelDescription(
        mockModelsResponse,
        "non-existent",
        "claude-3-7-sonnet-20250219",
      );
      expect(result).toBe("");
    });

    test("returns empty string for null models", () => {
      const result = getModelDescription(
        null,
        "anthropic",
        "claude-3-7-sonnet-20250219",
      );
      expect(result).toBe("");
    });
  });

  describe("isProviderAvailable", () => {
    test("returns true for available provider", () => {
      const result = isProviderAvailable(mockModelsResponse, "google");
      expect(result).toBe(true);
    });

    test("returns false for unavailable provider", () => {
      const result = isProviderAvailable(mockModelsResponse, "unavailable");
      expect(result).toBe(false);
    });

    test("returns false for non-existent provider", () => {
      const result = isProviderAvailable(mockModelsResponse, "non-existent");
      expect(result).toBe(false);
    });

    test("returns false for null models", () => {
      const result = isProviderAvailable(null, "google");
      expect(result).toBe(false);
    });
  });
});
