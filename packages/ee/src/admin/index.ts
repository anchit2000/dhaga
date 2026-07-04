import { isUserAdmin } from "./repo";

export const adminGate = {
  isAdmin: isUserAdmin,
};

export * from "./repo";
export * from "./usage";
