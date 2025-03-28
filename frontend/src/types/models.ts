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