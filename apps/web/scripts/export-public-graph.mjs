#!/usr/bin/env node
/**
 * Bakes the two STATIC, anonymized graph assets the public landing sandbox
 * loads on demand (components/landing/NetworkSandbox):
 *
 *   public/network-sandbox/graph-full.json  — the whole synthetic network (~21k nodes)
 *   public/network-sandbox/graph-core.json  — a representative ~4,500-node subset
 *
 * Everything is generated from the SAME deterministic seed the load-test seeder
 * uses (scripts/seed-lib/generate.mjs), so names are entirely synthetic — no
 * PII. ForceAtlas2 is run here, offline, and x/y are baked into every node so
 * the client never computes layout. Both files share ONE coordinate space.
 *
 * Usage (from apps/web):  node scripts/export-public-graph.mjs
 * (The orchestrator runs it; this script only reads code + writes the two JSON
 *  files — no database, no network.)
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { generateLifeNetwork } from "./seed-lib/generate.mjs";

const SEED = 20260716; // fixed → reproducible bake
const CONTACT_COUNT = 20000;
const TARGET_CORE_NODES = 4500;

// FA2 knobs mirrored from src/utils/constants/graph.ts + logic/iterations.ts so
// the offline bake matches what the app's worker (layout/fa2.worker.ts) produces.
const FA2_ITERATION_TIERS = [
  [1000, 300],
  [5000, 200],
  [20000, 120],
  [Number.POSITIVE_INFINITY, 80],
];
const FA2_CHUNK_ITERATIONS = 10;
const FA2_SETTLE_RATIO = 0.0005;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const round2 = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0);

/* ── 1. Generate + flatten into FullGraphNode / FullGraphEdge shapes ──────── */

/** Row-array column indices (see toRows() in seed-lib/generate.mjs). */
function buildGraph(net) {
  const typeName = new Map(net.nodeTypes.map((t) => [t[0], t[1]]));

  const nodes = [];
  for (const c of net.contacts) nodes.push({ id: c[0], kind: "contact", label: c[1], sublabel: c[2] ?? null });
  for (const c of net.companies) nodes.push({ id: c[0], kind: "company", label: c[1], sublabel: c[3] ?? null });
  for (const e of net.events) nodes.push({ id: e[0], kind: "event", label: e[1], sublabel: null });
  for (const en of net.entities) {
    nodes.push({ id: en[0], kind: "entity", typeId: en[1], label: en[2], sublabel: typeName.get(en[1]) ?? null });
  }

  const known = new Set(nodes.map((n) => n.id));
  const edges = [];
  // Explicit stored edges (endpoint-checked, exactly like repo/graph-data/full.ts).
  for (const e of net.edges) {
    if (known.has(e[2]) && known.has(e[5])) {
      edges.push({ id: e[0], source: e[2], target: e[5], predicate: e[3], kind: "explicit" });
    }
  }
  // Synthesized works_at (from contact.companyId).
  for (const c of net.contacts) {
    if (c[3] && known.has(c[3])) {
      edges.push({ id: `works-at:${c[0]}`, source: c[0], target: c[3], predicate: "works_at", kind: "works_at" });
    }
  }
  // Synthesized attended (from event_contacts).
  for (const a of net.eventContacts) {
    if (known.has(a[0]) && known.has(a[1])) {
      edges.push({ id: `attended:${a[0]}:${a[1]}`, source: a[1], target: a[0], predicate: "attended", kind: "attended" });
    }
  }

  const nodeTypes = net.nodeTypes.map((t) => ({ id: t[0], name: t[1], slug: t[2], color: t[3] }));
  const relationshipTypes = net.relationshipTypes.map((r) => ({ id: r[0], slug: r[1], forwardLabel: r[2], inverseLabel: r[3] }));
  return { nodes, edges, nodeTypes, relationshipTypes };
}

/** Undirected adjacency + degree — mirrors logic/indexes.ts (minus the app-only maps). */
function buildIndexes(nodes, edges) {
  const neighbors = new Map();
  const degree = new Map();
  for (const n of nodes) {
    neighbors.set(n.id, new Set());
    degree.set(n.id, 0);
  }
  for (const e of edges) {
    if (!neighbors.has(e.source) || !neighbors.has(e.target)) continue;
    neighbors.get(e.source).add(e.target);
    neighbors.get(e.target).add(e.source);
    degree.set(e.source, degree.get(e.source) + 1);
    degree.set(e.target, degree.get(e.target) + 1);
  }
  return { neighbors, degree };
}

/* ── 2. Deterministic cluster seed (mirror of logic/seeding.ts) ──────────── */

function hashCode(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) hash = (hash * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function neighborCentroid(nodeId, neighbors, positions) {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (const nb of neighbors.get(nodeId) ?? []) {
    const pos = positions.get(nb);
    if (!pos) continue;
    sumX += pos.x;
    sumY += pos.y;
    count += 1;
  }
  if (count === 0) return null;
  const jitter = (hashCode(nodeId) % 100) / 50;
  return { x: sumX / count + jitter, y: sumY / count + jitter };
}

function seedPositions(nodes, edges, neighbors) {
  const positions = new Map();
  const primaryCompany = new Map();
  for (const e of edges) {
    if (e.kind === "works_at" && !primaryCompany.has(e.source)) primaryCompany.set(e.source, e.target);
  }
  const groups = new Map();
  for (const node of nodes) {
    if (node.kind !== "contact") continue;
    const key = primaryCompany.get(node.id) ?? "__ungrouped__";
    const members = groups.get(key);
    if (members) members.push(node.id);
    else groups.set(key, [node.id]);
  }
  const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  ordered.forEach(([, members], groupIndex) => {
    const groupRadius = Math.sqrt(members.length) * 12;
    const centerDistance = Math.sqrt(groupIndex + 0.5) * (groupRadius + 60) * 1.6;
    const centerAngle = groupIndex * GOLDEN_ANGLE;
    const cx = Math.cos(centerAngle) * centerDistance;
    const cy = Math.sin(centerAngle) * centerDistance;
    members.forEach((contactId, memberIndex) => {
      const r = Math.sqrt(memberIndex + 0.5) * (groupRadius / Math.sqrt(members.length + 1)) * 2;
      const angle = memberIndex * GOLDEN_ANGLE;
      positions.set(contactId, { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    });
  });
  let outerIndex = 0;
  const outerBase = Math.sqrt(nodes.length + 1) * 40;
  for (const node of nodes) {
    if (positions.has(node.id)) continue;
    const centroid = neighborCentroid(node.id, neighbors, positions);
    if (centroid) {
      positions.set(node.id, centroid);
    } else {
      const angle = outerIndex * GOLDEN_ANGLE;
      const r = outerBase + Math.sqrt(outerIndex + 1) * 30;
      positions.set(node.id, { x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      outerIndex += 1;
    }
  }
  return positions;
}

/* ── 3. Bounded, chunked ForceAtlas2 (mirror of layout/fa2.worker.ts) ────── */

function fa2IterationsFor(nodeCount) {
  for (const [maxNodes, iterations] of FA2_ITERATION_TIERS) if (nodeCount <= maxNodes) return iterations;
  return FA2_ITERATION_TIERS[FA2_ITERATION_TIERS.length - 1][1];
}

function readPositions(graph, nodes) {
  const out = new Float64Array(nodes.length * 2);
  nodes.forEach((n, i) => {
    const a = graph.getNodeAttributes(n.id);
    out[i * 2] = a.x;
    out[i * 2 + 1] = a.y;
  });
  return out;
}

function meanMovement(a, b) {
  let total = 0;
  const count = a.length / 2;
  for (let i = 0; i < count; i += 1) total += Math.hypot(b[i * 2] - a[i * 2], b[i * 2 + 1] - a[i * 2 + 1]);
  return count > 0 ? total / count : 0;
}

function layoutRadius(positions) {
  let max = 1;
  for (let i = 0; i < positions.length; i += 2) max = Math.max(max, Math.abs(positions[i]), Math.abs(positions[i + 1]));
  return max;
}

function runLayout(nodes, edges, seed) {
  const graph = new Graph({ multi: true, type: "directed" });
  for (const node of nodes) {
    const p = seed.get(node.id) ?? { x: 0, y: 0 };
    graph.addNode(node.id, { x: p.x, y: p.y });
  }
  for (const e of edges) {
    if (e.source === e.target || !graph.hasNode(e.source) || !graph.hasNode(e.target)) continue;
    graph.addEdge(e.source, e.target);
  }
  const nodeCount = nodes.length;
  const settings = { ...forceAtlas2.inferSettings(nodeCount), barnesHutOptimize: nodeCount > 2000 };
  const iterations = fa2IterationsFor(nodeCount);

  let previous = readPositions(graph, nodes);
  let completed = 0;
  while (completed < iterations) {
    const chunk = Math.min(FA2_CHUNK_ITERATIONS, iterations - completed);
    forceAtlas2.assign(graph, { iterations: chunk, settings });
    completed += chunk;
    const current = readPositions(graph, nodes);
    const settled = meanMovement(previous, current) < layoutRadius(current) * FA2_SETTLE_RATIO;
    previous = current;
    if (settled) break;
  }

  const positions = new Map();
  for (const node of nodes) {
    const a = graph.getNodeAttributes(node.id);
    positions.set(node.id, { x: a.x, y: a.y });
  }
  return { positions, iterations, completed };
}

/* ── 4. Representative subset + compact-id baking ────────────────────────── */

/** All hubs (company/event/entity) + highest-degree contacts and their
 *  immediate neighbours until ~TARGET, then edges among the kept nodes with
 *  true orphans (no incident kept edge) pruned so no lone dots ship. */
function selectCore(nodes, edges, neighbors, degree) {
  const kept = new Set();
  for (const node of nodes) if (node.kind !== "contact") kept.add(node.id);
  if (kept.size > TARGET_CORE_NODES) {
    console.warn(`Warning: ${kept.size} hub nodes already exceed the ${TARGET_CORE_NODES} target.`);
  }
  const contacts = nodes
    .filter((n) => n.kind === "contact")
    .sort((a, b) => degree.get(b.id) - degree.get(a.id) || a.id.localeCompare(b.id));
  for (const contact of contacts) {
    if (kept.size >= TARGET_CORE_NODES) break;
    kept.add(contact.id);
    for (const nb of neighbors.get(contact.id) ?? []) {
      kept.add(nb);
      if (kept.size >= TARGET_CORE_NODES) break;
    }
  }
  const keptEdges = edges.filter((e) => kept.has(e.source) && kept.has(e.target));
  const connected = new Set();
  for (const e of keptEdges) {
    connected.add(e.source);
    connected.add(e.target);
  }
  const subNodes = nodes.filter((n) => kept.has(n.id) && connected.has(n.id));
  return { nodes: subNodes, edges: keptEdges };
}

/** Remap node ids to compact "0","1",… (consistent across nodes+edges within a
 *  file), bake positions, drop null sublabels. Only anonymized fields survive. */
function bakeFile(nodes, edges, positions, nodeTypes, relationshipTypes) {
  const idMap = new Map();
  nodes.forEach((n, i) => idMap.set(n.id, String(i)));
  const outNodes = nodes.map((n) => {
    const p = positions.get(n.id) ?? { x: 0, y: 0 };
    const out = { id: idMap.get(n.id), kind: n.kind, label: n.label, x: round2(p.x), y: round2(p.y) };
    if (n.sublabel) out.sublabel = n.sublabel;
    if (n.typeId) out.typeId = n.typeId;
    return out;
  });
  const outEdges = edges.map((e, i) => ({
    id: `e${i}`,
    source: idMap.get(e.source),
    target: idMap.get(e.target),
    predicate: e.predicate,
    kind: e.kind,
  }));
  return { nodes: outNodes, edges: outEdges, nodeTypes, relationshipTypes };
}

/* ── 5. Run ──────────────────────────────────────────────────────────────── */

function emit(path, payload) {
  const json = JSON.stringify(payload);
  writeFileSync(path, json);
  return Buffer.byteLength(json, "utf8");
}

function main() {
  const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "../public/network-sandbox");

  console.log(`Generating synthetic network (seed=${SEED}, contacts=${CONTACT_COUNT})…`);
  const net = generateLifeNetwork({ seed: SEED, userId: "public-sandbox", contactCount: CONTACT_COUNT, withNotes: false, stress: false });
  const { nodes, edges, nodeTypes, relationshipTypes } = buildGraph(net);
  const { neighbors, degree } = buildIndexes(nodes, edges);
  console.log(`Graph: ${nodes.length} nodes, ${edges.length} edges.`);

  console.log("Seeding positions + running ForceAtlas2 offline…");
  const seed = seedPositions(nodes, edges, neighbors);
  const { positions, iterations, completed } = runLayout(nodes, edges, seed);
  console.log(`FA2 settled after ${completed}/${iterations} iterations.`);

  const core = selectCore(nodes, edges, neighbors, degree);
  console.log(`Core subset: ${core.nodes.length} nodes, ${core.edges.length} edges.`);

  const fullBytes = emit(resolve(outDir, "graph-full.json"), bakeFile(nodes, edges, positions, nodeTypes, relationshipTypes));
  const coreBytes = emit(resolve(outDir, "graph-core.json"), bakeFile(core.nodes, core.edges, positions, nodeTypes, relationshipTypes));

  const kb = (b) => `${(b / 1024).toFixed(1)} KB`;
  console.log(`\nWrote ${outDir}`);
  console.log(`  graph-full.json  ${nodes.length} nodes / ${edges.length} edges  →  ${kb(fullBytes)} (${fullBytes} bytes)`);
  console.log(`  graph-core.json  ${core.nodes.length} nodes / ${core.edges.length} edges  →  ${kb(coreBytes)} (${coreBytes} bytes)`);
}

main();
