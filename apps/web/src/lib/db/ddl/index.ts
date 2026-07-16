import { CORE_DDL } from "./core";
import { KG_DDL } from "./kg";
import { AUTH_DDL } from "./auth";
import { SEARCH_DDL } from "./search";
import { VECTOR_DDL } from "./vector";
import { CALENDAR_DDL } from "./calendar";

const usesPgVector = !process.env.DHAGA_VECTOR_STORE || process.env.DHAGA_VECTOR_STORE === "pgvector";

export const DDL = `${CORE_DDL}\n${KG_DDL}\n${AUTH_DDL}\n${SEARCH_DDL}\n${CALENDAR_DDL}\n${usesPgVector ? VECTOR_DDL : ""}`;
