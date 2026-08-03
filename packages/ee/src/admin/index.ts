import { isUserAdmin } from "./repo";

export const adminGate = {
  isAdmin: isUserAdmin,
};

export * from "./repo";
export * from "./usage";
export * from "./spend";
export * from "./subscription-admin";
export * from "./ai-grants";
