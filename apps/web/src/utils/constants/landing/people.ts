export type HairStyle = "crop" | "long" | "bun";

export interface Person {
  id: string;
  name: string;
  accent: string;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
}

export const PEOPLE: Record<string, Person> = {
  you: { id: "you", name: "You", accent: "#e2a44c", skin: "#e8b98a", hair: "#2b2118", hairStyle: "crop" },
  priya: { id: "priya", name: "Priya Nair", accent: "#7fb98a", skin: "#c68863", hair: "#1a1a1a", hairStyle: "long" },
  mei: { id: "mei", name: "Mei Tanaka", accent: "#8aa8d8", skin: "#f0c9a5", hair: "#1a1a1a", hairStyle: "bun" },
  sarah: { id: "sarah", name: "Sarah Chen", accent: "#c98a9e", skin: "#e8b98a", hair: "#4a3620", hairStyle: "long" },
  rohan: { id: "rohan", name: "Rohan Mehta", accent: "#8aa8d8", skin: "#a06a42", hair: "#1a1a1a", hairStyle: "crop" },
  alice: { id: "alice", name: "Alice Krejčová", accent: "#a49a8a", skin: "#edc39b", hair: "#8a5a2b", hairStyle: "bun" },
  dan: { id: "dan", name: "Darren Adams", accent: "#a49a8a", skin: "#8d5a3b", hair: "#1a1a1a", hairStyle: "crop" },
  kavya: { id: "kavya", name: "Kavya Singh", accent: "#7fb98a", skin: "#b57a4e", hair: "#2b2118", hairStyle: "long" },
  nisha: { id: "nisha", name: "Nisha Shah", accent: "#e2a44c", skin: "#c68863", hair: "#2b2118", hairStyle: "bun" },
};

export function getPerson(id: string): Person {
  const person = PEOPLE[id];
  if (!person) throw new Error(`Unknown person: ${id}`);
  return person;
}
