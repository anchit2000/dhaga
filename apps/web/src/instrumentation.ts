export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { configureDhagaProviders } = await import("./dhaga.providers");
    await configureDhagaProviders();
  }
}
