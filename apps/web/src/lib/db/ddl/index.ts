import { CORE_DDL } from "./core";
import { AUTH_DDL } from "./auth";
import { SEARCH_DDL } from "./search";

export const DDL = `${CORE_DDL}\n${AUTH_DDL}\n${SEARCH_DDL}`;
