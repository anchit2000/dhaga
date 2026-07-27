// Companies repo, split per the 150-line rule; import paths stay
// @/lib/repo/companies. companyWithCountColumns is an internal shared
// projection (duplicates.ts imports it from ./queries) — not part of the
// public repo surface, so it is intentionally not re-exported here.
export {
  listCompaniesPage,
  getCompaniesForMerge,
  type CompanyListItem,
  type CompanyMergeRecord,
} from "./queries";
export { createCompany, renameCompany, deleteCompany } from "./mutations";
export { mergeCompanies } from "./merge";
export { findDuplicateCompanyClusters, type DuplicateCompanyCluster } from "./duplicates";
