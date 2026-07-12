/**
 * Application-owned provider bootstrap.
 *
 * Self-hosters can import provider packages here and call their register
 * functions. Keeping this file free of built-in imports makes the default
 * install zero-config and prevents optional SDKs from entering the bundle.
 * See docs/PROVIDERS.md for complete examples.
 */
export async function configureDhagaProviders(): Promise<void> {
  // Example:
  // const { myProvider } = await import("@your-scope/dhaga-provider");
  // const { registerLLMProvider } = await import("@dhaga/core");
  // registerLLMProvider(myProvider);
}
