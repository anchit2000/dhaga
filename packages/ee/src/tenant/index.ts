import { openTenantConnection } from "./scoped-db";

export const tenantGate = {
  scopedDb: (userId: string) => openTenantConnection(userId),
};
