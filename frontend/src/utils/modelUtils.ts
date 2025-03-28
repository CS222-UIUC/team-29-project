import { ModelsResponse } from '../types/models';

/**
 * Finds the best available model for a given provider
 * @param models The available models response
 * @param provider The provider to find models for
 * @returns The ID of the best model, or undefined if no models available
 */
export function findBestModelForProvider(
  models: ModelsResponse | null,
  provider: string
): string | undefined {
  if (!models || !models[provider]?.models.length) {
    return undefined;
  }
  
  // Special handling for different providers
  if (provider === 'anthropic') {
    // Prefer Claude 3.7 Sonnet
    const claude37 = models[provider].models.find(m => m.id === 'claude-3-7-sonnet-20250219');
    if (claude37) return claude37.id;
  }
  else if (provider === 'google') {
    // Prefer Gemini 2.5 Pro
    const gemini25 = models[provider].models.find(m => m.id === 'gemini-2.5-pro-exp-03-25');
    if (gemini25) return gemini25.id;
  }
  else if (provider === 'openai') {
    // Prefer GPT-4o
    const gpt4o = models[provider].models.find(m => m.id === 'gpt-4o');
    if (gpt4o) return gpt4o.id;
  }
  
  // Default to first model
  return models[provider].models[0].id;
}

/**
 * Gets the description for a specific model
 * @param models The available models response
 * @param provider The provider of the model
 * @param modelId The model ID
 * @returns The model description or empty string if not found
 */
export function getModelDescription(
  models: ModelsResponse | null,
  provider: string,
  modelId: string
): string {
  if (!models || !models[provider]) return '';
  
  const model = models[provider].models.find(m => m.id === modelId);
  return model?.description || '';
}

/**
 * Checks if the provider has any available models
 * @param models The available models response
 * @param provider The provider to check
 * @returns True if the provider has available models
 */
export function isProviderAvailable(
  models: ModelsResponse | null,
  provider: string
): boolean {
  return Boolean(models?.[provider]?.available && models[provider].models.length > 0);
}