import { useCallback, useMemo, useState } from "react";
import { Linking } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Fields, getContactsAsync, requestPermissionsAsync } from "expo-contacts/legacy";

import { CaptureError, importContacts } from "@/lib/api";
import { isConfigured, loadSettings } from "@/lib/settings";
import { deviceContactToCandidate } from "@/lib/contacts/map";

import type { ContactsPermissionResponse } from "expo-contacts/legacy";
import type { ImportContactInput, ImportRequest } from "@dhaga/core/src/api/import";
import type { MobileSettings } from "@/types";

/** One device contact the user can pick, keyed by its OS id. */
export interface ImportItem {
  id: string;
  name: string;
  candidate: ImportContactInput;
}

/** Result of a submitted import, rendered under the list. */
export type ImportOutcome =
  | { kind: "done"; created: number; skipped: number }
  | { kind: "error"; message: string };

/** The device fields the mapper reads; anything else is left on the phone. */
const FIELDS = [
  Fields.Name,
  Fields.FirstName,
  Fields.LastName,
  Fields.Nickname,
  Fields.Emails,
  Fields.PhoneNumbers,
  Fields.Company,
  Fields.JobTitle,
  Fields.Department,
  Fields.Addresses,
  Fields.Birthday,
  Fields.Note,
];

/**
 * State + effects behind the import screen: connection settings, the contacts
 * permission, the loaded/mapped candidate list, the user's selection, and the
 * POST to /api/import. Nothing is read from the address book until the user
 * taps "Allow contacts access" (privacy: import is user-triggered).
 */
export function useContactImport() {
  const [settings, setSettings] = useState<MobileSettings | null>(null);
  const [permission, setPermission] = useState<ContactsPermissionResponse | null>(null);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);

  useFocusEffect(
    useCallback(() => {
      void loadSettings().then((loaded) => {
        if (isConfigured(loaded)) setSettings(loaded);
        else router.replace("/setup");
      });
    }, []),
  );

  /** Ask for permission (if not already denied-for-good) and load contacts. */
  const requestAndLoad = useCallback(async (): Promise<void> => {
    setOutcome(null);
    const status = await requestPermissionsAsync();
    setPermission(status);
    if (!status.granted) return;
    setLoading(true);
    try {
      const { data } = await getContactsAsync({ fields: FIELDS });
      const loaded: ImportItem[] = [];
      for (const contact of data) {
        const candidate = deviceContactToCandidate(contact);
        if (candidate) loaded.push({ id: contact.id, name: candidate.contact.name, candidate });
      }
      setItems(loaded);
      setSelected(new Set(loaded.map((item) => item.id)));
    } finally {
      setLoading(false);
    }
  }, []);

  const toggle = useCallback((id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((): void => {
    setSelected(new Set(items.map((item) => item.id)));
  }, [items]);

  const selectNone = useCallback((): void => setSelected(new Set()), []);

  const openSettings = useCallback((): void => void Linking.openSettings(), []);

  const submit = useCallback(async (): Promise<void> => {
    if (!settings || busy || selected.size === 0) return;
    setBusy(true);
    setOutcome(null);
    const contacts = items.filter((item) => selected.has(item.id)).map((item) => item.candidate);
    const request: ImportRequest = { source: "device", contacts };
    try {
      const result = await importContacts(settings, request);
      setOutcome({ kind: "done", created: result.created, skipped: result.skipped });
    } catch (error) {
      const message =
        error instanceof CaptureError || error instanceof Error
          ? error.message
          : "Something went wrong. Try again.";
      setOutcome({ kind: "error", message });
    } finally {
      setBusy(false);
    }
  }, [settings, busy, selected, items]);

  const selectedCount = useMemo(() => selected.size, [selected]);

  return {
    permission,
    items,
    selected,
    selectedCount,
    loading,
    busy,
    outcome,
    requestAndLoad,
    toggle,
    selectAll,
    selectNone,
    openSettings,
    submit,
  };
}
