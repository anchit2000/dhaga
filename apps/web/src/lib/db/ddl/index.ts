import { CORE_DDL } from "./core";
import { KG_DDL } from "./kg";
import { CONFIRMATIONS_DDL } from "./confirmations";
import { AUTH_DDL } from "./auth";
import { SEARCH_DDL } from "./search";
import { VECTOR_DDL } from "./vector";
import { CALENDAR_DDL } from "./calendar";
import { GEOCODE_DDL } from "./geocode";
import { SYNC_DDL } from "./sync";
import { CONTACT_CONNECTIONS_DDL } from "./contact-connections";

const usesPgVector = !process.env.DHAGA_VECTOR_STORE || process.env.DHAGA_VECTOR_STORE === "pgvector";

// SYNC_DDL trails CORE_DDL because contact_links carries an FK to contacts(id).
export const DDL = `${CORE_DDL}\n${KG_DDL}\n${CONFIRMATIONS_DDL}\n${AUTH_DDL}\n${SEARCH_DDL}\n${CALENDAR_DDL}\n${GEOCODE_DDL}\n${SYNC_DDL}\n${CONTACT_CONNECTIONS_DDL}\n${usesPgVector ? VECTOR_DDL : ""}`;
