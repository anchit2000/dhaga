// Split per the 150-line rule; import paths unchanged (@/lib/repo/relationships).
export { listContactRelationships, type ContactRelationship } from "./list";
export { listEntityRelationships, type EntityRelationship } from "./entity-list";
export {
  createRelationshipEdge,
  deleteRelationshipEdge,
  updateRelationshipEdge,
  validateRelationshipInput,
  type RelationshipEndpointKind,
  type RelationshipEndpoints,
  type RelationshipInput,
} from "./mutations";
