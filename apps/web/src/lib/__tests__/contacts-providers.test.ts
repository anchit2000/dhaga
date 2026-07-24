import { describe, expect, it } from "vitest";
import { primaryPosition } from "@dhaga/core";
import type { ContactMethod } from "@dhaga/core";
import { googlePersonToCandidate } from "@/lib/import/providers/google";
import { graphContactToCandidate } from "@/lib/import/providers/microsoft";
import type { GooglePerson } from "@/lib/import/providers/google";
import type { GraphContact } from "@/lib/import/providers/microsoft";

/**
 * The OAuth connectors (BRD §6.7) seed the graph from a user's own Google/
 * Outlook contacts with no LLM (Rule 5). The pure mappers are the correctness
 * boundary — labels, positions, birthdays, and the nameless-skip must hold, or
 * a real import mislabels methods or drops people. Tested without the network.
 */

/** Find a ContactMethod by its value, or fail loudly (Rule 12). */
function methodByValue(methods: ContactMethod[], value: string): ContactMethod {
  const found = methods.find((m) => m.value === value);
  if (!found) throw new Error(`no contact method with value "${value}"`);
  return found;
}

describe("googlePersonToCandidate", () => {
  it("maps names, labeled methods, position, birthday, and biography receipt", () => {
    const person: GooglePerson = {
      names: [{ displayName: "Ada Lovelace" }],
      nicknames: [{ value: "Countess" }],
      emailAddresses: [
        { value: "ada@work.example", type: "work" },
        { value: "ada@home.example", formattedType: "Home" },
        { value: "ada@school.example", type: "School" },
      ],
      phoneNumbers: [
        { value: "+1 555 0100", type: "mobile" },
        { value: "+1 555 0200", type: "home" },
      ],
      organizations: [{ name: "Analytical Engines", title: "Mathematician", department: "R&D" }],
      addresses: [
        { streetAddress: "1 Ada St", city: "London", region: "England", postalCode: "SW1", country: "UK", type: "home" },
      ],
      urls: [{ value: "https://ada.example", type: "work" }],
      birthdays: [{ date: { year: 1815, month: 12, day: 10 } }],
      biographies: [{ value: "Wrote the first algorithm." }],
    };
    const candidate = googlePersonToCandidate(person);
    if (!candidate) throw new Error("expected a candidate");
    const { contact, receipt } = candidate;
    expect(contact.name).toBe("Ada Lovelace");
    expect(contact.nickname).toBe("Countess");
    expect(methodByValue(contact.emails, "ada@work.example").label).toBe("Work");
    expect(methodByValue(contact.emails, "ada@home.example").label).toBe("Home");
    // A custom type has no canonical mapping — it passes through verbatim.
    expect(methodByValue(contact.emails, "ada@school.example").label).toBe("School");
    expect(methodByValue(contact.phones, "+1 555 0100").label).toBe("Mobile");
    expect(methodByValue(contact.phones, "+1 555 0200").label).toBe("Home");
    const position = primaryPosition(contact.positions);
    expect(position?.title).toBe("Mathematician");
    expect(position?.company).toBe("Analytical Engines");
    expect(position?.department).toBe("R&D");
    expect(position?.current).toBe(true);
    expect(contact.links[0].value).toBe("https://ada.example");
    const address = contact.addresses[0];
    expect(address.label).toBe("Home");
    expect(address.city).toBe("London");
    expect(address.region).toBe("England");
    expect(contact.location).toBe("London");
    // A structured date with no `text` is assembled into YYYY-MM-DD.
    expect(contact.importantDates).toEqual([{ label: "Birthday", value: "1815-12-10", note: null }]);
    expect(receipt).toBe("Imported from Google Contacts\nNote: Wrote the first algorithm.");
  });

  it("prefers a birthday's free text over its structured date", () => {
    const person: GooglePerson = {
      names: [{ displayName: "Grace Hopper" }],
      birthdays: [{ text: "December 9", date: { month: 12, day: 9 } }],
    };
    const candidate = googlePersonToCandidate(person);
    expect(candidate?.contact.importantDates[0].value).toBe("December 9");
  });

  it("returns null for a person with no name (never a nameless contact)", () => {
    const person: GooglePerson = { emailAddresses: [{ value: "ghost@example.com" }] };
    expect(googlePersonToCandidate(person)).toBeNull();
  });
});

describe("graphContactToCandidate", () => {
  it("maps name, phone buckets, position, address, birthday, and notes receipt", () => {
    const contact: GraphContact = {
      displayName: "Alan Turing",
      nickName: "Prof",
      emailAddresses: [{ address: "alan@work.example", name: "Alan Turing" }],
      homePhones: ["+44 20 0000"],
      businessPhones: ["+44 20 1111"],
      mobilePhone: "+44 7000 2222",
      companyName: "Bletchley Park",
      jobTitle: "Cryptanalyst",
      department: "Hut 8",
      businessAddress: { street: "The Mansion", city: "Milton Keynes", state: "Bucks", postalCode: "MK3", countryOrRegion: "UK" },
      birthday: "1912-06-23T00:00:00Z",
      personalNotes: "Broke Enigma.",
    };
    const candidate = graphContactToCandidate(contact);
    if (!candidate) throw new Error("expected a candidate");
    const { contact: profile, receipt } = candidate;
    expect(profile.name).toBe("Alan Turing");
    expect(profile.nickname).toBe("Prof");
    // Graph emails carry no type — label stays null rather than guessing.
    expect(methodByValue(profile.emails, "alan@work.example").label).toBeNull();
    expect(methodByValue(profile.phones, "+44 20 0000").label).toBe("Home");
    expect(methodByValue(profile.phones, "+44 20 1111").label).toBe("Work");
    expect(methodByValue(profile.phones, "+44 7000 2222").label).toBe("Mobile");
    const position = primaryPosition(profile.positions);
    expect(position?.title).toBe("Cryptanalyst");
    expect(position?.company).toBe("Bletchley Park");
    expect(position?.department).toBe("Hut 8");
    const address = profile.addresses[0];
    expect(address.label).toBe("Work");
    expect(address.region).toBe("Bucks");
    expect(address.country).toBe("UK");
    // The ISO datetime is trimmed to its date part.
    expect(profile.importantDates).toEqual([{ label: "Birthday", value: "1912-06-23", note: null }]);
    expect(receipt).toBe("Imported from Outlook / Hotmail contacts\nNote: Broke Enigma.");
  });

  it("derives a name from givenName + surname when displayName is absent", () => {
    const contact: GraphContact = { givenName: "Katherine", surname: "Johnson" };
    expect(graphContactToCandidate(contact)?.contact.name).toBe("Katherine Johnson");
  });

  it("returns null for a contact with no derivable name", () => {
    const contact: GraphContact = { emailAddresses: [{ address: "ghost@example.com" }] };
    expect(graphContactToCandidate(contact)).toBeNull();
  });
});
