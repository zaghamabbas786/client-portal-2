/** Server-only MetaAPI REST configuration. */

export function getMetaApiToken(): string {
  return (
    process.env.METAAPI_TOKEN?.trim() ||
    process.env.METAAPI_ACCESS_TOKEN?.trim() ||
    process.env.META_API_TOKEN?.trim() ||
    ""
  );
}

export function getMetaApiBaseUrl(): string {
  return (
    process.env.METAAPI_API_URL?.trim() ||
    "https://mt-client-api-v1.new-york.agiliumtrade.ai"
  );
}

export function getMetaApiProvisioningUrl(): string {
  return (
    process.env.METAAPI_PROVISIONING_URL?.trim() ||
    "https://mt-provisioning-api-v1.new-york.agiliumtrade.ai"
  );
}

export function metaApiConfigured(): boolean {
  return getMetaApiToken().length > 0;
}
