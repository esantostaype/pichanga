"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api-client";
import type { PlaceInput } from "@/lib/validators";
import type { PlaceSuggestion } from "@/types";

/**
 * Google Places autocomplete.
 *
 * Renders nothing when the server has no API key configured, so the place form
 * degrades to plain manual entry instead of showing a dead search box.
 */
export function PlaceSearchField({
  onPicked,
  disabled,
}: {
  onPicked: (place: PlaceInput) => void;
  disabled?: boolean;
}) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(true);

  // Groups the keystrokes of one search with its details lookup: that is what
  // Google bills as a single session.
  const session = useRef(crypto.randomUUID());

  // Probe once on mount so a server without an API key hides the field right
  // away instead of letting it vanish after the first keystrokes. A blank
  // query is answered before Google is ever called, so it costs nothing.
  useEffect(() => {
    let cancelled = false;

    api.places.search("", session.current).catch((error: unknown) => {
      if (!cancelled && /not configured/i.test(String(error))) {
        setAvailable(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < 3) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await api.places.search(needle, session.current);
        if (!cancelled) setSuggestions(results);
      } catch (error) {
        if (cancelled) return;
        if (/not configured/i.test(String(error))) setAvailable(false);
        setSuggestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  if (!available) return null;

  const pick = async (suggestion: PlaceSuggestion) => {
    setSuggestions([]);
    setQuery("");
    setLoading(true);
    try {
      const details = await api.places.details(
        suggestion.googlePlaceId,
        session.current,
      );
      onPicked(details);
    } finally {
      // A new session starts once the previous one is billed.
      session.current = crypto.randomUUID();
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {loading ? (
            <Spinner size={15} />
          ) : (
            <Icon icon={Search01Icon} size={16} />
          )}
        </span>
        <Input
          value={query}
          disabled={disabled}
          onChange={(event) => {
            setQuery(event.target.value);
            if (event.target.value.trim().length < 3) setSuggestions([]);
          }}
          placeholder={t.places.searchMaps}
          className="pl-9"
        />
      </div>

      {suggestions.length ? (
        <ul className="max-h-48 space-y-1 overflow-y-auto scrollbar-thin rounded-xl border border-border/60 bg-muted/25 p-1">
          {suggestions.map((suggestion) => (
            <li key={suggestion.googlePlaceId}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => void pick(suggestion)}
                className="w-full cursor-pointer rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent"
              >
                <span className="block truncate text-sm font-medium">
                  {suggestion.title}
                </span>
                {suggestion.subtitle ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {suggestion.subtitle}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
