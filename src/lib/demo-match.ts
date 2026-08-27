import { AREA_IDS } from "./constants";
import type { Match, Player } from "@/types";

/**
 * A full match that exists only in memory: twenty-four players, a priced
 * venue, an organizer and a half-paid rental.
 *
 * Nothing here is written to the database. It is a fixed set of data for
 * trying the share card against a full squad -- the case that is awkward to
 * reproduce with real people and real payments.
 */

const NAMES: Array<[string, string]> = [
  ["Diego", "Maradona"],
  ["Martin", "Reed"],
  ["Ivan", "Salazar"],
  ["Bruno", "Hale"],
  ["Thomas", "Vega"],
  ["Rafael", "Ortega"],
  ["Pablo", "Guerrero"],
  ["Nicolas", "Ibarra"],
  ["Andres", "Del Solar"],
  ["Felipe", "Aguirre"],
  ["Hugo", "Ramirez"],
  ["Marco", "Zevallos"],
  ["Julio", "Bermudez"],
  ["Esteban", "Cordova"],
  ["Gabriel", "Navarro"],
  ["Ramiro", "Estrada"],
  ["Alonso", "Bustamante"],
  ["Ernesto", "Palacios"],
  ["Sergio", "Rivas"],
  ["Ignacio", "Barreto"],
  ["Leonardo", "Ferrer"],
  ["Cristian", "Maldonado"],
  ["Emilio", "Cardenas"],
  ["Adrian", "Villalobos"],
];

/**
 * Faces from pravatar, through this app so the share card can draw them: the
 * canvas needs an image its own origin will hand over. Every fourth player has
 * none, so the card is exercised with initials as well as photographs.
 */
const face = (seed: string) => `/api/demo/avatar/${seed}`;

const HOUR = 60 * 60 * 1000;

const players: Player[] = NAMES.map(([firstName, lastName], index) => ({
  id: `demo-player-${index}`,
  firstName,
  lastName,
  area: AREA_IDS[index % AREA_IDS.length],
  photoUrl: index % 4 === 3 ? null : face(`men-${index}`),
  photoPublicId: null,
  createdAt: 0,
}));

/**
 * Built from a timestamp so the page can be rendered on the server and the
 * client without them disagreeing about "now".
 */
export function demoMatch(now: number): Match {
  const playedAt = now - 26 * HOUR;

  return {
    id: "demo-match",
    playedAt,
    endsAt: playedAt + 1.5 * HOUR,
    place: {
      id: "demo-place",
      name: "Complejo Los Olivos",
      address: "Av. Ejemplo 123",
      googlePlaceId: null,
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Los+Olivos",
      price: 240,
      lat: null,
      lng: null,
      createdAt: 0,
    },
    organizerId: players[0].id,
    recurrence: "weekly",
    seriesId: "demo-series",
    createdAt: 0,
    players,
    // Two in three have settled, so the card shows both marks.
    paidPlayerIds: players.filter((_, i) => i % 3 !== 1).map((p) => p.id),
  };
}
