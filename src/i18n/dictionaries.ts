import { getArea } from "@/lib/constants";

import type { Locale } from "./locale";

/**
 * Every word the app says, in both languages.
 *
 * One file per language rather than a folder of namespaces: it ships to the
 * browser in one piece anyway, and a translator opening it can read the app
 * top to bottom without hunting. The keys are grouped by the screen they
 * belong to, so finding the one that is wrong takes a glance at the app.
 *
 * English is the shape: `Dictionary` is taken from it, so a key added here
 * that Spanish has not caught up with is a type error rather than a word
 * missing on somebody's screen.
 */
export const en = {
  common: {
    cancel: "Cancel",
    close: "Close",
    delete: "Delete",
    save: "Save",
    saving: "Saving",
    edit: "Edit",
    add: "Add",
    remove: "Remove",
    player: "player",
    players: "players",
    each: "each",
    goal: "goal",
    goals: "goals",
    night: "night",
    nights: "nights",
    game: "game",
    games: "games",
    today: "Today",
    tomorrow: "Tomorrow",
    search: "Search",
    none: "None",
    clear: "Clear",
    actions: "Actions",
    selected: "{count} {noun} selected",
    loading: "Loading",
    preview: "Preview",
    couldNotComplete: "Could not complete",
    unknownError: "Unknown error",
    pickDate: "Pick a date",
    pickTime: "Pick a time",
    hour: "Hour",
    minute: "Min",
    versus: "vs",
    more: "{count} more",
    somethingWrong: "Something went wrong. Please try again.",
    requestFailed: "The request could not be completed",
    noActiveMatch: "There is no active match",
    partlyDeleted: "{done} of {total} deleted, {failed} failed",
    place: "place",
    placesPlural: "places",
    file: "file",
    files: "files",
    date: "date",
    dates: "dates",
  },

  /* Column headings, where a whole word would not fit. */
  table: {
    goals: "G",
    played: "Pl",
    record: "W-D-L",
    points: "Pts",
    p: "P",
    w: "W",
    d: "D",
    l: "L",
    gd: "GD",
  },

  /* What a form says when what was typed will not do. */
  form: {
    tooShort: "At least 2 characters",
    tooLong: "At most 40 characters",
    pickOnePlayer: "Pick at least one player",
    pickPlayer: "Pick a player",
    gameLength: "A game is either three minutes or more, or has no clock",
  },

  site: {
    title: "Pichangapp - Office lineup",
    description:
      "Build the lineup for the office match: create the date, add players and watch them appear on the pitch in real time.",
  },

  language: {
    label: "Language",
  },

  /** What the server says when it refuses something. */
  api: {
    aTeamCannotPlayItself: "A team cannot play itself",
    couldNotCreatePlayer: "Could not create the player",
    fileMissing: "File is missing",
    matchNotFound: "Match not found",
    missingSession: "Missing session token",
    playerGone: "One of the selected players no longer exists",
    noClockThreeSides: "Only two sides can play without a clock",
    placeNotFound: "Place not found",
    searchNotConfigured: "Place search is not configured",
    playerNotFound: "Player not found",
    authNotConfigured: "Sign-in is not configured on this server",
    fileNotHere: "That file does not belong to this gallery",
    fileNotInGallery: "That file is not in this gallery",
    gameFinished: "That game has finished; its goals stand",
    notInMatch: "That player is not in this match",
    notOnATeam: "That player is not on a team in this match",
    notOnThatSide: "That player is not on that side",
    glovesStay: "The gloves stay put while a game is on",
    notKickedOff: "The match has not kicked off yet",
    nightStarted: "The night has started; the sides stand",
    organizerSettled: "The organizer's share is always settled",
    placeGone: "The selected place no longer exists",
    teamsWindow: "The teams are drawn two hours before kick-off",
    notEnoughPlayers: "There are not enough players for two sides",
    superAdminOnly: "This is only for the super admin",
    teamsNotInMatch: "Those teams are not in this match",
    badFormat: "Unsupported format. Use JPG, PNG, WebP or AVIF.",
    enterPassword: "Enter the password",
    wrongPassword: "Wrong password",
    needSignIn: "You need to sign in to do that",
  },

  skills: {
    pace: "Pace",
    stamina: "Stamina",
    finishing: "Finishing",
    passing: "Passing",
    defending: "Defending",
    goalkeeping: "Goalkeeping",
  },

  positions: {
    gk: "Goalkeeper",
    def: "Defender",
    mid: "Midfielder",
    fwd: "Forward",
  },

  menu: {
    open: "Open menu",
    browse: "Browse",
    matches: "Matches",
    matchesHint: "Dates and lineups",
    players: "Players",
    playersHint: "Office profiles",
    places: "Places",
    placesHint: "Pitches you play at",
    stats: "Stats",
    statsHint: "Goals, games and records",
    signIn: "Sign in",
    signOut: "Sign out",
    signedOut: "Signed out",
    resetDemo: "Reset the demo",
    resetDemoHint: "Fresh squad, fresh match",
    demoRebuilt: "Demo rebuilt",
    guest:
      "You can manage players and the lineup. Changing matches and places needs the password.",
    tour: "What this does",
  },

  setup: {
    title: "Environment not configured",
    subtitle: "No credentials, or a schema behind the code.",
    copyFrom: "Copy",
    copyTo: "to",
    copyFill: "and fill in:",
    migrateWith: "Bring the schema up to date with",
    migratePlan: ". It only adds what is missing; see it first with",
    restartWith: "Restart the server with",
  },

  header: {
    share: "Share the lineup",
    gallery: "Match gallery",
    brand: "Pichangapp, current match",
  },

  hud: {
    live: "Live",
    allPaid: "All paid",
    toPay: "{count} to pay",
    weekly: "Weekly",
    repeatsWeekly: "Repeats weekly",
    splitTitle: "{money} split across {count} {players}",
    noMatch: "No match",
    noMatchLine: "Create a date from the menu",
  },

  login: {
    title: "Sign in",
    description:
      "Managing matches, players and places needs the office password.",
    password: "Password",
    signedIn: "Signed in",
  },

  pitch: {
    emptyTitle: "Empty pitch",
    emptyLine: "Add players and they line up from the center.",
    noMatchTitle: "No matches yet",
    noMatchLine: "Create a match from the menu to build the lineup.",
    organizer: "Match organizer",
    organizerShort: "Organizer",
    viewCard: "View {name}'s card",
    removeFromMatch: "Remove {name} from the match",
    inGoal: "In goal",
    putInGoal: "Put {name} in goal",
    paid: "Paid the rental",
    notPaid: "Has not paid yet",
    addPlayers: "Add players to the match",
    teams: "Teams",
    drawTeams: "Draw the teams",
    matchNight: "Match night",
    playerRemoved: "Player removed from the lineup",
    teamsDrawn: "Teams drawn",
    dropTitle: "Take {name} off the lineup?",
    dropLine:
      "They stay in the office list; this only takes them off this match.",
    dropConfirm: "Take them off",
  },

  teams: {
    title: "Teams",
    none: "Nobody has drawn the sides yet.",
    drawn: "{count} sides, drawn from the skills on each profile.",
    started: "{count} sides. The night has started, so they stand as they are.",
    keeperBorrowed: "keeper borrowed",
    keeper: "Keeper",
    inGoal: "In goal",
    keeperByChoice: "In goal by choice",
    keeperFillingIn: "Nobody volunteered, so they are filling in",
    keeperChanged: "Keeper changed",
    minutesTitle: "Minutes per game",
    minutesLine:
      "How long a game runs before the sides change. The clock on match night turns amber near it and red at it.",
    minutesTwoSides:
      " Two sides can also play with no clock at all, for as long as the pitch is rented.",
    minutesOne: "{count} minutes",
    noClock: "No clock, one game all match",
    noClockTitle: "One game, for as long as the pitch is rented",
    lengthAgreed: "Game length agreed",
    mixTitle: "Mix the areas",
    mixLine:
      "Spreads the smaller areas across the sides, so a team is not one floor of the office. Strength still comes first.",
    putAway: "Put away",
    putAwayDone: "Teams put away",
    shuffle: "Shuffle again",
    shuffled: "Teams drawn again",
    matchNight: "Match night",
  },

  live: {
    lineup: "Lineup",
    noGoalsYet: "Nobody has scored yet.",
    goalsSoFar: "{goals} so far tonight, across {count} {games}.",
    whichGame: "Which game",
    unknown: "Unknown",
    doubleTap: "double tap",
    kickOff: "Kick off",
    fullTime: "Full time",
    nextUp: "next up",
    betweenGames: "between games",
    gameNumber: "game {number}",
    watchingOne: "{count} person is watching right now",
    watchingMany: "{count} people are watching right now",
    minutes: "{count} min",
    noClock: "no clock",
    noSides: "The sides have not been drawn",
    firstGame: "The first game starts at kick-off, {time}.",
    unsent: "{count} unsent",
    goalsTitle: "Goals",
    goalsEmpty: "Nothing went in that one.",
    tableTitle: "Table",
    tableLine:
      "Three for a win, one for a draw, from the games that have finished.",
    tableTeam: "Team",
    finishTitle: "Finish the match",
    finishLine:
      "The game being played is whistled off and the night is closed. The lineup and the ledger stay as they are.",
    finishConfirm: "Finish",
    earlyTitle: "There is still time on the clock",
    earlyLine:
      "{left} left of the {minutes} minutes agreed for a game. Blow up anyway?",
    earlyConfirm: "Full time",
    undoGoal: "Take this goal off the board",
    giveGoal: "Double tap to give {name} a goal",
    soundOn: "Sound on",
    muted: "Muted",
    soundOnHint: "The goal shout plays out loud",
    mutedHint: "The goal shout is silent on this device",
    soundOnLabel: "Goal sound on",
    soundOffLabel: "Goal sound off",
    keeperStuck: "Could not change the keeper",
  },

  ledger: {
    title: "Rental",
    paid: "Paid",
    paidToggle: "{name} paid the rental",
    organizerNote:
      "The organizer pays the venue, so their share is always settled",
    eachSettled: "{money} each. {paid} of {total} settled.",
    collected: "Collected",
    pending: "Pending",
    organizer: "Organizer",
    emptyTitle: "Nobody on the pitch",
    emptyLine: "Add players to the match and their shares appear here.",
    noPrice: "This pitch has no price on it yet, so there is nothing to split.",
  },

  share: {
    title: "Share",
    heading: "Share the lineup",
    nothing: "Nothing to share yet.",
    stillToPay: "{date}, {count} still to pay.",
    lineup: "{date}, {count} {players}.",
    whatToShare: "What to share",
    cardAlt: "The match card",
    sendWhatsApp: "Send with WhatsApp",
    copyForWhatsApp: "Copy the text for WhatsApp",
    copiedLineup: "Lineup copied. Paste it into WhatsApp.",
    copiedImagePaste: "Image copied. Paste it into the chat.",
    noImageCopy: "This browser cannot copy images. Download it instead.",
    noClipboard: "The clipboard is not available here.",
    tabMatch: "Match",
    tabPayments: "Payments",
    download: "Download the image",
    copyImage: "Copy the image",
    copyText: "Copy the text",
    whatsapp: "Send on WhatsApp",
    copiedText: "Text copied",
    copiedImage: "Image copied",
    cardPitch: "{total} the pitch, {each} each",
    cardTotalLine: "{money} the pitch",
    cardEachLine: "{money} each",
    cardPaidLine: "{count} paid",
    cardPendingLine: "{count} pending{money}",
    cardOnPitch: "{count} on the pitch",
    cardAllPaid: "Everybody has paid",
    cardOwing: "{paid} paid, {owing} pending{money}",
    cardOrganizer: " (organizer)",
    cardOwes: "owes",
    cardPaid: "paid",
  },

  matches: {
    title: "Matches",
    onPitch: "On pitch",
    noPlaceYet: "No place yet",
    paidSuffix: " · {count} paid",
    openDate: "Open {date}",
    selectDate: "Select the {date} match",
    gallery: "Match gallery",
    clearAll: "Clear all",
    selectAll: "Select all",
    emptyGuest: "Signing in is needed to create the first date.",
    deletedMany: "Matches deleted",
    deleteOne: "Delete match",
    deleteMany: "Delete {count} matches",
    deleteOneLine:
      "The {date} date and its lineup will be removed{weekly}. Player profiles are kept.",
    deleteWeekly: ", and the weekly fixture stops repeating",
    deleteManyLine:
      "{count} dates and their lineups will be removed. Player profiles are kept.",
    starts: "Starts",
    ends: "Ends",
    pickPlace: "Pick a place",
    pickOrganizer: "Pick the organizer",
    noOrganizerYet: "No organizer",
    repeatWeekly: "Repeat weekly",
    repeatWeeklyLine:
      "Same weekday, time and place. The next date appears on its own with the same lineup.",
    datesCreated: "{count} {dates} created. The closest one owns the pitch.",
    saveChanges: "Save changes",
    createMatch: "Create match",
    pickDate: "Pick a date",
    pickStart: "Pick a start time",
    pickEnd: "Pick an end time",
    afterStart: "Must be after the start",
    newMatch: "New match",
    formHint:
      "Pick the date and who plays. The closest match is the one shown on the pitch.",
    playersLabel: "Players",
    emptyTitle: "No matches yet",
    emptyLine: "Create the first date and the pitch fills itself.",
    editMatch: "Edit the match",
    deleteMatch: "Delete the match",
    created: "Match created",
    updated: "Match updated",
    deleted: "Match deleted",
    formNew: "New match",
    formEdit: "Edit match",
    date: "Date",
    from: "From",
    to: "To",
    place: "Place",
    organizer: "Organizer",
    repeat: "Repeats weekly",
    noPlace: "No place",
    noOrganizer: "Nobody yet",
  },

  addPlayers: {
    title: "Add players",
    onDate: "Match on {date} - {count} already in.",
    noMatch: "Create a match first.",
    empty: "Everybody is already on the pitch.",
    confirm: "Add to the match",
    done: "Lineup updated",
  },

  players: {
    title: "Players",
    deletedMany: "Players deleted",
    deleteManyLine:
      "{count} players will be removed, and they will leave every match they are signed up for.",
    deleteOneLine:
      "{name} will also be dropped from every match they are signed up for.",
    deleteOne: "Delete player",
    deleteMany: "Delete {count} players",
    searchPlaceholder: "Search players...",
    searchByNameOrArea: "Search by name or area...",
    noResults: "No results",
    tryAnother: "Try another name or area.",
    tryAnotherName: "Try another name.",
    noneYet: "Create the first profile to start building matches.",
    noneCreated: "No players have been created yet.",
    selectAllShown: "Select every player shown",
    select: "Select {name}",
    viewName: "View {name}",
    editName: "Edit {name}",
    deleteName: "Delete {name}",
    runsTheMatch: "Runs the match",
    profileNote: "The profile is saved for future matches.",
    savedCount: "{count} {profiles} saved.",
    profile: "profile",
    profiles: "profiles",
    firstNamePlaceholder: "Diego",
    lastNamePlaceholder: "Maradona",
    photoHint: "Drag an image here or click to upload.",
    photoTypes: "JPG, PNG, WebP or AVIF - max {mb} MB",
    removePhoto: "Remove photo",
    pickArea: "Pick an area",
    pickPosition: "Pick a position",
    saveChanges: "Save changes",
    createPlayer: "Create player",
    pickPhoto: "Pick a photo",
    badFormat: "Unsupported format. Use JPG, PNG, WebP or AVIF.",
    tooBig: "The photo is over the {mb} MB limit",
    newPlayer: "New player",
    emptyTitle: "Nobody yet",
    emptyLine: "Add the first profile and they show up on the pitch.",
    formNew: "New player",
    formEdit: "Edit player",
    firstName: "First name",
    lastName: "Last name",
    area: "Area",
    position: "Position",
    photo: "Photo",
    skills: "Skills",
    created: "Player created",
    updated: "Player updated",
    deleted: "Player deleted",
    view: "View the card",
    overall: "overall {value} out of 5",
    playsAs:
      "Plays as {position}. The shape is what the balancer reads when it draws the teams.",
  },

  places: {
    title: "Places",
    deletedMany: "Places deleted",
    deleteOne: "Delete place",
    deleteMany: "Delete {count} places",
    deleteOneLine: "Matches played there keep the date and lose the pitch.",
    deleteManyLine:
      "{count} pitches go. Matches played at them keep the date and lose the pitch.",
    emptyLineGuest: "Signing in is needed to save a pitch.",
    emptyLineAdmin: "Save the pitches you usually play at.",
    selectAll: "Select every place",
    priceHint: "Split across whoever plays. Leave empty if it is free.",
    formatLabel: "Players a side",
    formatHint:
      "Decides the size of the teams, and whether a big turnout plays a triangular.",
    notSet: "Not set",
    mapsLink: "Maps link",
    searchMaps: "Search on Google Maps...",
    saveChanges: "Save changes",
    createPlace: "Create place",
    formHint:
      "Search it on Google Maps to fill everything in, or type it by hand.",
    savedCount: "{count} {places} saved.",
    namePlaceholder: "Eureka El Polo",
    addressPlaceholder: "Av. El Polo 505, Santiago de Surco",
    mapsPlaceholder: "https://maps.google.com/...",
    mapsHint: "Opens the venue in Google Maps.",
    nameTooShort: "At least 2 characters",
    badUrl: "Must be a valid URL",
    notANumber: "Must be a number",
    negative: "Cannot be negative",
    selectName: "Select {name}",
    editName: "Edit {name}",
    deleteName: "Delete {name}",
    newPlace: "New place",
    emptyTitle: "No pitches yet",
    emptyLine: "Add the one you rent and the split works itself out.",
    formNew: "New place",
    formEdit: "Edit place",
    name: "Name",
    address: "Address",
    price: "Price",
    format: "Players a side",
    maps: "Open in Google Maps",
    created: "Place created",
    updated: "Place updated",
    deleted: "Place deleted",
  },

  stats: {
    title: "Stats",
    counting: "Counting up.",
    summary: "{count} {nights} played, {goals} goals.",
    tabPlayers: "Players",
    tabNights: "Nights",
    emptyTitle: "Nothing played yet",
    emptyLine: "Keep score on a match night and the numbers show up here.",
    player: "Player",
    left: "Left the office",
    leftLine: "the office",
    noSides: "No sides were drawn that night.",
    scored: "{name} scored {count}",
  },

  gallery: {
    title: "Match gallery",
    heading: "Gallery",
    fromDate: "Photos and clips from {date}.",
    fromMatch: "Photos and clips from this match.",
    limits: "Up to {photo} MB per photo and {video} MB per clip.",
    closed: "The match has started, so the album is closed to new files.",
    addFiles: "Add photos or videos",
    uploading: "Uploading",
    added: "Added to the gallery",
    removed: "Removed",
    clearAll: "Clear all",
    selectAll: "Select all",
    nothingTitle: "Nothing here yet",
    nothingLine: "Add the first photo or clip from this match.",
    nothingEver: "This match finished without anybody adding one.",
    selectFile: "Select this file",
    deleteFile: "Delete this file",
    deleteMany: "Delete {count} files",
    deleteManyLine:
      "{count} files leave the gallery and storage. This cannot be undone.",
    deleteOneLine: "It leaves the gallery and storage. This cannot be undone.",
    clip: "Match clip",
    photo: "Match photo",
    photoFailed: "The photo could not be loaded",
    filesNotDeleted: "Those files could not be deleted",
    fileBadFormat: "{name}: unsupported format",
    fileTooBig: "{name} is over the {mb} MB limit",
    fileFailed: "{name} could not be uploaded",
    fileIncomplete: "{name} came back incomplete",
    filesPartlyDeleted: "{failed} of {total} files could not be deleted",
    add: "Add photos",
    emptyTitle: "Nothing yet",
    emptyLine: "Add the first photo of the night.",
    previous: "Previous",
    next: "Next",
  },

  tour: {
    title: "Pichangapp - What it does",
    roles: "Who is asking",
    rolePlayer: "You play",
    roleOrganizer: "You organize",
    roleNight: "You keep score",
    rolePlayerLine:
      "You turn up, you play, and you would like to know who else is coming.",
    roleOrganizerLine:
      "You book the pitch, chase nobody for the money, and read out the sides.",
    roleNightLine: "You are the one with the phone out while the game is on.",
    profileTitle: "Your card, your business",
    profileLine:
      "Photo, area, position and six skills you set yourself. That card is what the app reads when it draws even sides.",
    metaDescription:
      "The office match, sorted: the lineup on a pitch, even sides in one tap, the score kept with a thumb, the rental split and the season counting itself.",
    heroTitle: "Match day,",
    heroTitleAccent: "sorted",
    heroLine:
      "The office match: the lineup, the sides, the score and the money. One screen, on the phone that is already in your hand.",
    openPitch: "Open the pitch",
    tryDemo: "Poke around the demo",
    tryDemoAgain: "Try the demo first",

    pitchTitle: "A pitch, not a list",
    pitchLine:
      "Whoever turns up lands on the grass, in the formation, on everybody's screen at the same second.",

    sidesTitle: "Sides in one tap",
    sidesLine:
      "Six skills and a position per player. The app draws them even and gives every side a keeper, borrowing one when nobody volunteers.",

    scoreTitle: "Score with your thumb",
    scoreLine:
      "Double tap whoever scored. GOAL takes over every phone at the ground at once, out loud unless somebody wants quiet.",

    nightTitle: "The night runs itself",
    nightLine:
      "Winner stays on, nobody plays three in a row, draws settled by the app. The table keeps itself while you play.",

    moneyTitle: "Nobody chases anybody",
    moneyLine:
      "The rental splits per head. One tap marks somebody paid, and the pitch quietly shows who still owes.",

    shareTitle: "One image to the group",
    shareLine:
      "Date, place, lineup and the split, as a card built for WhatsApp. The maps link comes with it.",

    seasonTitle: "The season keeps score",
    seasonLine:
      "Goals, games, wins and a podium, from the goals you already tapped in. Nothing to fill in afterwards.",

    closeTitle: "The next one is coming.",
    closeAccent: "Somebody has to press it.",

    keeper: "keeper",
    borrowed: "borrowed",
    team: "Team",
    settled: "2 of 4 settled, and nobody had to ask twice.",
    paid: "paid",
    owes: "owes",
    scorer: "Erick Santos",
    scorerArea: "Dev",
    shareDate: "Saturday, August 29",
    shareMeta: "20:00 - 21:30 · Office pitch · 12 players",
  },
};

export type Dictionary = typeof en;

/** The same words, in the language the match is actually shouted in. */
export const es: Dictionary = {
  common: {
    cancel: "Cancelar",
    close: "Cerrar",
    delete: "Eliminar",
    save: "Guardar",
    saving: "Guardando",
    edit: "Editar",
    add: "Agregar",
    remove: "Quitar",
    player: "jugador",
    players: "jugadores",
    each: "cada uno",
    goal: "gol",
    goals: "goles",
    night: "fecha",
    nights: "fechas",
    game: "partido",
    games: "partidos",
    today: "Hoy",
    tomorrow: "Mañana",
    search: "Buscar",
    none: "Ninguno",
    clear: "Limpiar",
    actions: "Acciones",
    selected: "{count} {noun} seleccionados",
    loading: "Cargando",
    preview: "Vista previa",
    couldNotComplete: "No se pudo completar",
    unknownError: "Error desconocido",
    pickDate: "Elegir fecha",
    pickTime: "Elegir hora",
    hour: "Hora",
    minute: "Min",
    versus: "vs",
    more: "{count} más",
    somethingWrong: "Algo salió mal. Vuelve a intentarlo.",
    requestFailed: "No se pudo completar la petición",
    noActiveMatch: "No hay ningún partido activo",
    partlyDeleted: "{done} de {total} eliminados, {failed} fallaron",
    place: "cancha",
    placesPlural: "canchas",
    file: "archivo",
    files: "archivos",
    date: "fecha",
    dates: "fechas",
  },

  table: {
    goals: "G",
    played: "PJ",
    record: "G-E-P",
    points: "Pts",
    p: "PJ",
    w: "PG",
    d: "PE",
    l: "PP",
    gd: "DG",
  },

  form: {
    tooShort: "Al menos 2 caracteres",
    tooLong: "Máximo 40 caracteres",
    pickOnePlayer: "Elige al menos un jugador",
    pickPlayer: "Elige un jugador",
    gameLength: "Un partido dura tres minutos o más, o no tiene reloj",
  },

  site: {
    title: "Pichangapp - La pichanga de la oficina",
    description:
      "Arma la alineación de la pichanga de la oficina: crea la fecha, agrega jugadores y velos aparecer en la cancha en tiempo real.",
  },

  language: {
    label: "Idioma",
  },

  api: {
    aTeamCannotPlayItself: "Un equipo no puede jugar contra sí mismo",
    couldNotCreatePlayer: "No se pudo crear el jugador",
    fileMissing: "Falta el archivo",
    matchNotFound: "No se encontró el partido",
    missingSession: "Falta el token de sesión",
    playerGone: "Uno de los jugadores seleccionados ya no existe",
    noClockThreeSides: "Solo dos equipos pueden jugar sin reloj",
    placeNotFound: "No se encontró la cancha",
    searchNotConfigured: "La búsqueda de canchas no está configurada",
    playerNotFound: "No se encontró al jugador",
    authNotConfigured:
      "El inicio de sesión no está configurado en este servidor",
    fileNotHere: "Ese archivo no pertenece a esta galería",
    fileNotInGallery: "Ese archivo no está en esta galería",
    gameFinished: "Ese partido ya terminó; sus goles quedan",
    notInMatch: "Ese jugador no está en este partido",
    notOnATeam: "Ese jugador no está en ningún equipo de este partido",
    notOnThatSide: "Ese jugador no está en ese equipo",
    glovesStay: "Los guantes no se mueven mientras se juega",
    notKickedOff: "El partido todavía no empieza",
    nightStarted: "El partido ya empezó; los equipos quedan como están",
    organizerSettled: "La parte del organizador siempre está saldada",
    placeGone: "La cancha seleccionada ya no existe",
    teamsWindow: "Los equipos se arman dos horas antes del partido",
    notEnoughPlayers: "No hay jugadores suficientes para dos equipos",
    superAdminOnly: "Esto es solo para el super admin",
    teamsNotInMatch: "Esos equipos no son de este partido",
    badFormat: "Formato no admitido. Usa JPG, PNG, WebP o AVIF.",
    enterPassword: "Escribe la contraseña",
    wrongPassword: "Contraseña incorrecta",
    needSignIn: "Tienes que iniciar sesión para hacer eso",
  },

  skills: {
    pace: "Velocidad",
    stamina: "Resistencia",
    finishing: "Definición",
    passing: "Pase",
    defending: "Marca",
    goalkeeping: "Arco",
  },

  positions: {
    gk: "Arquero",
    def: "Defensa",
    mid: "Mediocampista",
    fwd: "Delantero",
  },

  menu: {
    open: "Abrir menú",
    browse: "Explorar",
    matches: "Partidos",
    matchesHint: "Fechas y alineaciones",
    players: "Jugadores",
    playersHint: "Perfiles de la oficina",
    places: "Canchas",
    placesHint: "Dónde juegan",
    stats: "Estadísticas",
    statsHint: "Goles, partidos y récords",
    signIn: "Iniciar sesión",
    signOut: "Cerrar sesión",
    signedOut: "Sesión cerrada",
    resetDemo: "Rehacer el demo",
    resetDemoHint: "Plantel nuevo, partido nuevo",
    demoRebuilt: "Demo rehecho",
    guest:
      "Puedes manejar jugadores y la alineación. Cambiar partidos y canchas necesita la clave.",
    tour: "Qué hace esto",
  },

  setup: {
    title: "Entorno sin configurar",
    subtitle: "Faltan credenciales, o el esquema quedó atrás del código.",
    copyFrom: "Copia",
    copyTo: "a",
    copyFill: "y completa:",
    migrateWith: "Actualiza el esquema con",
    migratePlan: ". Solo agrega lo que falta; míralo antes con",
    restartWith: "Reinicia el servidor con",
  },

  header: {
    share: "Compartir la alineación",
    gallery: "Galería del partido",
    brand: "Pichangapp, partido actual",
  },

  hud: {
    live: "En vivo",
    allPaid: "Todos pagaron",
    toPay: "Faltan {count}",
    weekly: "Semanal",
    repeatsWeekly: "Se repite cada semana",
    splitTitle: "{money} dividido entre {count} {players}",
    noMatch: "Sin partido",
    noMatchLine: "Crea una fecha desde el menú",
  },

  login: {
    title: "Iniciar sesión",
    description:
      "Manejar partidos, jugadores y canchas necesita la clave de la oficina.",
    password: "Contraseña",
    signedIn: "Sesión iniciada",
  },

  pitch: {
    emptyTitle: "Cancha vacía",
    emptyLine: "Agrega jugadores y se acomodan desde el centro.",
    noMatchTitle: "Todavía no hay partidos",
    noMatchLine: "Crea un partido desde el menú para armar la alineación.",
    organizer: "Organiza el partido",
    organizerShort: "Organizador",
    viewCard: "Ver la tarjeta de {name}",
    removeFromMatch: "Sacar a {name} del partido",
    inGoal: "Al arco",
    putInGoal: "Poner a {name} al arco",
    paid: "Pagó la cancha",
    notPaid: "Todavía no paga",
    addPlayers: "Agregar jugadores al partido",
    teams: "Equipos",
    drawTeams: "Armar los equipos",
    matchNight: "Partido en vivo",
    playerRemoved: "Jugador sacado de la alineación",
    teamsDrawn: "Equipos armados",
    dropTitle: "¿Sacar a {name} de la alineación?",
    dropLine:
      "Sigue en la lista de la oficina; esto solo lo saca de este partido.",
    dropConfirm: "Sacarlo",
  },

  teams: {
    title: "Equipos",
    none: "Todavía nadie armó los equipos.",
    drawn: "{count} equipos, armados con las habilidades de cada perfil.",
    started:
      "{count} equipos. El partido ya empezó, así que quedan como están.",
    keeperBorrowed: "arquero prestado",
    keeper: "Arquero",
    inGoal: "Al arco",
    keeperByChoice: "Al arco por elección",
    keeperFillingIn: "Nadie se ofreció, así que está tapando",
    keeperChanged: "Arquero cambiado",
    minutesTitle: "Minutos por partido",
    minutesLine:
      "Cuánto dura un partido antes de cambiar los equipos. El reloj se pone ámbar cerca del final y rojo al llegar.",
    minutesTwoSides:
      " Con dos equipos también pueden jugar sin reloj, lo que dure la cancha.",
    minutesOne: "{count} minutos",
    noClock: "Sin reloj, un solo partido",
    noClockTitle: "Un solo partido, lo que dure la cancha",
    lengthAgreed: "Duración acordada",
    mixTitle: "Mezclar las áreas",
    mixLine:
      "Reparte las áreas chicas entre los equipos, para que uno no sea todo el mismo piso de la oficina. La fuerza sigue mandando.",
    putAway: "Deshacer",
    putAwayDone: "Equipos deshechos",
    shuffle: "Armar de nuevo",
    shuffled: "Equipos armados de nuevo",
    matchNight: "Partido en vivo",
  },

  live: {
    lineup: "Alineación",
    noGoalsYet: "Todavía no anotó nadie.",
    goalsSoFar: "{goals} en la noche, en {count} {games}.",
    whichGame: "Qué partido",
    unknown: "Desconocido",
    doubleTap: "doble toque",
    kickOff: "Arrancar",
    fullTime: "Terminar",
    nextUp: "sigue",
    betweenGames: "entre partidos",
    gameNumber: "partido {number}",
    watchingOne: "{count} persona está viendo ahora",
    watchingMany: "{count} personas están viendo ahora",
    minutes: "{count} min",
    noClock: "sin reloj",
    noSides: "Todavía no hay equipos armados",
    firstGame: "El primer partido arranca a las {time}.",
    unsent: "{count} sin enviar",
    goalsTitle: "Goles",
    goalsEmpty: "En ese no entró ninguno.",
    tableTitle: "Tabla",
    tableLine: "Tres por ganar, uno por empatar, de los partidos terminados.",
    tableTeam: "Equipo",
    finishTitle: "Terminar el partido",
    finishLine:
      "Se corta el partido que se está jugando y se cierra la fecha. La alineación y las cuentas quedan como están.",
    finishConfirm: "Terminar",
    earlyTitle: "Todavía queda tiempo",
    earlyLine:
      "Faltan {left} de los {minutes} minutos acordados. ¿Cortar igual?",
    earlyConfirm: "Terminar",
    undoGoal: "Quitar este gol del marcador",
    giveGoal: "Doble toque para darle un gol a {name}",
    soundOn: "Con sonido",
    muted: "Silenciado",
    soundOnHint: "El grito del gol suena",
    mutedHint: "El grito del gol va sin sonido en este dispositivo",
    soundOnLabel: "Sonido del gol activado",
    soundOffLabel: "Sonido del gol apagado",
    keeperStuck: "No se pudo cambiar el arquero",
  },

  ledger: {
    title: "La cancha",
    paid: "Pagó",
    paidToggle: "{name} pagó la cancha",
    organizerNote:
      "El organizador paga la cancha, así que su parte siempre está saldada",
    eachSettled: "{money} cada uno. {paid} de {total} pagaron.",
    collected: "Cobrado",
    pending: "Pendiente",
    organizer: "Organizador",
    emptyTitle: "No hay nadie en la cancha",
    emptyLine: "Agrega jugadores al partido y sus cuentas aparecen acá.",
    noPrice:
      "Esta cancha todavía no tiene precio, así que no hay nada que dividir.",
  },

  share: {
    title: "Compartir",
    heading: "Compartir la alineación",
    nothing: "Todavía no hay nada que compartir.",
    stillToPay: "{date}, faltan {count} por pagar.",
    lineup: "{date}, {count} {players}.",
    whatToShare: "Qué compartir",
    cardAlt: "La tarjeta del partido",
    sendWhatsApp: "Enviar por WhatsApp",
    copyForWhatsApp: "Copiar el texto para WhatsApp",
    copiedLineup: "Alineación copiada. Pégala en WhatsApp.",
    copiedImagePaste: "Imagen copiada. Pégala en el chat.",
    noImageCopy: "Este navegador no puede copiar imágenes. Descárgala mejor.",
    noClipboard: "El portapapeles no está disponible acá.",
    tabMatch: "Partido",
    tabPayments: "Pagos",
    download: "Descargar la imagen",
    copyImage: "Copiar la imagen",
    copyText: "Copiar el texto",
    whatsapp: "Enviar por WhatsApp",
    copiedText: "Texto copiado",
    copiedImage: "Imagen copiada",
    cardPitch: "{total} la cancha, {each} cada uno",
    cardTotalLine: "{money} la cancha",
    cardEachLine: "{money} cada uno",
    cardPaidLine: "{count} pagaron",
    cardPendingLine: "{count} pendientes{money}",
    cardOnPitch: "{count} en la cancha",
    cardAllPaid: "Ya pagaron todos",
    cardOwing: "{paid} pagaron, {owing} pendientes{money}",
    cardOrganizer: " (organiza)",
    cardOwes: "debe",
    cardPaid: "pagó",
  },

  matches: {
    title: "Partidos",
    onPitch: "En cancha",
    noPlaceYet: "Sin cancha todavía",
    paidSuffix: " · {count} pagaron",
    openDate: "Abrir {date}",
    selectDate: "Seleccionar el partido del {date}",
    gallery: "Galería del partido",
    clearAll: "Quitar todo",
    selectAll: "Seleccionar todo",
    emptyGuest: "Hay que iniciar sesión para crear la primera fecha.",
    deletedMany: "Partidos eliminados",
    deleteOne: "Eliminar partido",
    deleteMany: "Eliminar {count} partidos",
    deleteOneLine:
      "Se eliminan la fecha del {date} y su alineación{weekly}. Los perfiles de los jugadores quedan.",
    deleteWeekly: ", y el partido semanal deja de repetirse",
    deleteManyLine:
      "Se eliminan {count} fechas y sus alineaciones. Los perfiles de los jugadores quedan.",
    starts: "Empieza",
    ends: "Termina",
    pickPlace: "Elige una cancha",
    pickOrganizer: "Elige al organizador",
    noOrganizerYet: "Sin organizador",
    repeatWeekly: "Repetir cada semana",
    repeatWeeklyLine:
      "Mismo día, hora y cancha. La siguiente fecha aparece sola, con la misma alineación.",
    datesCreated:
      "{count} {dates} creadas. La más cercana se queda con la cancha.",
    saveChanges: "Guardar cambios",
    createMatch: "Crear partido",
    pickDate: "Elige una fecha",
    pickStart: "Elige la hora de inicio",
    pickEnd: "Elige la hora de fin",
    afterStart: "Tiene que ser después del inicio",
    newMatch: "Nuevo partido",
    formHint:
      "Elige la fecha y quiénes juegan. El partido más cercano es el que se ve en la cancha.",
    playersLabel: "Jugadores",
    emptyTitle: "Todavía no hay partidos",
    emptyLine: "Crea la primera fecha y la cancha se llena sola.",
    editMatch: "Editar el partido",
    deleteMatch: "Eliminar el partido",
    created: "Partido creado",
    updated: "Partido actualizado",
    deleted: "Partido eliminado",
    formNew: "Nuevo partido",
    formEdit: "Editar partido",
    date: "Fecha",
    from: "Desde",
    to: "Hasta",
    place: "Cancha",
    organizer: "Organizador",
    repeat: "Se repite cada semana",
    noPlace: "Sin cancha",
    noOrganizer: "Todavía nadie",
  },

  addPlayers: {
    title: "Agregar jugadores",
    onDate: "Partido del {date} - {count} ya están.",
    noMatch: "Primero crea un partido.",
    empty: "Ya están todos en la cancha.",
    confirm: "Agregar al partido",
    done: "Alineación actualizada",
  },

  players: {
    title: "Jugadores",
    deletedMany: "Jugadores eliminados",
    deleteManyLine:
      "Se eliminan {count} jugadores, y salen de todos los partidos donde estaban anotados.",
    deleteOneLine:
      "{name} también sale de todos los partidos donde estaba anotado.",
    deleteOne: "Eliminar jugador",
    deleteMany: "Eliminar {count} jugadores",
    searchPlaceholder: "Buscar jugadores...",
    searchByNameOrArea: "Buscar por nombre o área...",
    noResults: "Sin resultados",
    tryAnother: "Prueba con otro nombre o área.",
    tryAnotherName: "Prueba con otro nombre.",
    noneYet: "Crea el primer perfil para empezar a armar partidos.",
    noneCreated: "Todavía no se creó ningún jugador.",
    selectAllShown: "Seleccionar todos los mostrados",
    select: "Seleccionar a {name}",
    viewName: "Ver a {name}",
    editName: "Editar a {name}",
    deleteName: "Eliminar a {name}",
    runsTheMatch: "Organiza el partido",
    profileNote: "El perfil queda guardado para los próximos partidos.",
    savedCount: "{count} {profiles} guardados.",
    profile: "perfil",
    profiles: "perfiles",
    firstNamePlaceholder: "Diego",
    lastNamePlaceholder: "Maradona",
    photoHint: "Arrastra una imagen aquí o haz clic para subirla.",
    photoTypes: "JPG, PNG, WebP o AVIF - máx {mb} MB",
    removePhoto: "Quitar foto",
    pickArea: "Elige un área",
    pickPosition: "Elige una posición",
    saveChanges: "Guardar cambios",
    createPlayer: "Crear jugador",
    pickPhoto: "Elegir una foto",
    badFormat: "Formato no admitido. Usa JPG, PNG, WebP o AVIF.",
    tooBig: "La foto pasa el límite de {mb} MB",
    newPlayer: "Nuevo jugador",
    emptyTitle: "Todavía no hay nadie",
    emptyLine: "Agrega el primer perfil y aparece en la cancha.",
    formNew: "Nuevo jugador",
    formEdit: "Editar jugador",
    firstName: "Nombre",
    lastName: "Apellido",
    area: "Área",
    position: "Posición",
    photo: "Foto",
    skills: "Habilidades",
    created: "Jugador creado",
    updated: "Jugador actualizado",
    deleted: "Jugador eliminado",
    view: "Ver la tarjeta",
    overall: "general {value} de 5",
    playsAs:
      "Juega de {position}. La forma es lo que lee el balanceador cuando arma los equipos.",
  },

  places: {
    title: "Canchas",
    deletedMany: "Canchas eliminadas",
    deleteOne: "Eliminar cancha",
    deleteMany: "Eliminar {count} canchas",
    deleteOneLine:
      "Los partidos jugados ahí conservan la fecha y pierden la cancha.",
    deleteManyLine:
      "Se van {count} canchas. Los partidos jugados ahí conservan la fecha y pierden la cancha.",
    emptyLineGuest: "Hay que iniciar sesión para guardar una cancha.",
    emptyLineAdmin: "Guarda las canchas donde suelen jugar.",
    selectAll: "Seleccionar todas las canchas",
    priceHint: "Se divide entre los que juegan. Déjalo vacío si es gratis.",
    formatLabel: "Jugadores por lado",
    formatHint:
      "Define el tamaño de los equipos, y si una asistencia grande juega triangular.",
    notSet: "Sin definir",
    mapsLink: "Link del mapa",
    searchMaps: "Buscar en Google Maps...",
    saveChanges: "Guardar cambios",
    createPlace: "Crear cancha",
    formHint: "Búscala en Google Maps para llenar todo, o escríbelo a mano.",
    savedCount: "{count} {places} guardadas.",
    namePlaceholder: "Eureka El Polo",
    addressPlaceholder: "Av. El Polo 505, Santiago de Surco",
    mapsPlaceholder: "https://maps.google.com/...",
    mapsHint: "Abre la cancha en Google Maps.",
    nameTooShort: "Al menos 2 caracteres",
    badUrl: "Tiene que ser un URL válido",
    notANumber: "Tiene que ser un número",
    negative: "No puede ser negativo",
    selectName: "Seleccionar {name}",
    editName: "Editar {name}",
    deleteName: "Eliminar {name}",
    newPlace: "Nueva cancha",
    emptyTitle: "Todavía no hay canchas",
    emptyLine: "Agrega la que alquilan y la división se resuelve sola.",
    formNew: "Nueva cancha",
    formEdit: "Editar cancha",
    name: "Nombre",
    address: "Dirección",
    price: "Precio",
    format: "Jugadores por lado",
    maps: "Abrir en Google Maps",
    created: "Cancha creada",
    updated: "Cancha actualizada",
    deleted: "Cancha eliminada",
  },

  stats: {
    title: "Estadísticas",
    counting: "Sacando cuentas.",
    summary: "{count} {nights} jugadas, {goals} goles.",
    tabPlayers: "Jugadores",
    tabNights: "Fechas",
    emptyTitle: "Todavía no se jugó nada",
    emptyLine: "Lleva los goles de una fecha y los números aparecen acá.",
    player: "Jugador",
    left: "Ya no está en la oficina",
    leftLine: "la oficina",
    noSides: "Esa noche no se armaron equipos.",
    scored: "{name} anotó {count}",
  },

  gallery: {
    title: "Galería del partido",
    heading: "Galería",
    fromDate: "Fotos y clips del {date}.",
    fromMatch: "Fotos y clips de este partido.",
    limits: "Hasta {photo} MB por foto y {video} MB por clip.",
    closed: "El partido ya empezó, así que el álbum está cerrado.",
    addFiles: "Agregar fotos o videos",
    uploading: "Subiendo",
    added: "Agregado a la galería",
    removed: "Quitado",
    clearAll: "Quitar todo",
    selectAll: "Seleccionar todo",
    nothingTitle: "Todavía no hay nada",
    nothingLine: "Agrega la primera foto o clip de este partido.",
    nothingEver: "Este partido terminó sin que nadie subiera nada.",
    selectFile: "Seleccionar este archivo",
    deleteFile: "Eliminar este archivo",
    deleteMany: "Eliminar {count} archivos",
    deleteManyLine:
      "{count} archivos salen de la galería y del almacenamiento. Esto no se puede deshacer.",
    deleteOneLine:
      "Sale de la galería y del almacenamiento. Esto no se puede deshacer.",
    clip: "Clip del partido",
    photo: "Foto del partido",
    photoFailed: "No se pudo cargar la foto",
    filesNotDeleted: "No se pudieron eliminar esos archivos",
    fileBadFormat: "{name}: formato no admitido",
    fileTooBig: "{name} pasa el límite de {mb} MB",
    fileFailed: "No se pudo subir {name}",
    fileIncomplete: "{name} llegó incompleto",
    filesPartlyDeleted: "{failed} de {total} archivos no se pudieron eliminar",
    add: "Agregar fotos",
    emptyTitle: "Todavía no hay nada",
    emptyLine: "Agrega la primera foto de la noche.",
    previous: "Anterior",
    next: "Siguiente",
  },

  tour: {
    title: "Pichangapp - Qué hace",
    roles: "Quién pregunta",
    rolePlayer: "Juegas",
    roleOrganizer: "Organizas",
    roleNight: "Llevas el partido",
    rolePlayerLine: "Llegas, juegas, y te gustaría saber quién más va a caer.",
    roleOrganizerLine:
      "Reservas la cancha, no persigues a nadie por la plata, y lees los equipos.",
    roleNightLine: "Eres el que tiene el celular en la mano mientras se juega.",
    profileTitle: "Tu tarjeta, tu asunto",
    profileLine:
      "Foto, área, posición y seis habilidades que pones tú. Esa tarjeta es la que lee la app para armar equipos parejos.",
    metaDescription:
      "La pichanga de la oficina, resuelta: la alineación en una cancha, equipos parejos en un toque, los goles con el pulgar, la cuenta dividida y la temporada contándose sola.",
    heroTitle: "La pichanga,",
    heroTitleAccent: "resuelta",
    heroLine:
      "La pichanga de la oficina: la alineación, los equipos, los goles y la plata. Una sola pantalla, en el celular que ya tienes en la mano.",
    openPitch: "Ir a la cancha",
    tryDemo: "Probar el demo",
    tryDemoAgain: "Mejor prueba el demo",

    pitchTitle: "Una cancha, no una lista",
    pitchLine:
      "El que llega aparece en el pasto, en la formación, en la pantalla de todos al mismo segundo.",

    sidesTitle: "Equipos en un toque",
    sidesLine:
      "Seis habilidades y una posición por jugador. La app los arma parejos y le da arquero a cada lado, prestando uno cuando nadie se ofrece.",

    scoreTitle: "Anota con el pulgar",
    scoreLine:
      "Doble toque al que anotó. El GOL se apodera de todos los celulares de la cancha a la vez, con sonido salvo que alguien quiera silencio.",

    nightTitle: "La noche se maneja sola",
    nightLine:
      "El que gana se queda, nadie juega tres seguidos, los empates los decide la app. La tabla se lleva sola mientras juegan.",

    moneyTitle: "Nadie persigue a nadie",
    moneyLine:
      "La cancha se divide por cabeza. Un toque marca al que pagó, y la pantalla muestra sin drama quién debe.",

    shareTitle: "Una imagen al grupo",
    shareLine:
      "Fecha, lugar, alineación y la división, como una tarjeta hecha para WhatsApp. El link del mapa va incluido.",

    seasonTitle: "La temporada se cuenta sola",
    seasonLine:
      "Goles, partidos, victorias y un podio, con los goles que ya marcaste. Nada que llenar después.",

    closeTitle: "Ya viene la próxima.",
    closeAccent: "Alguien tiene que apretarlo.",

    keeper: "arquero",
    borrowed: "prestado",
    team: "Equipo",
    settled: "2 de 4 pagaron, y nadie tuvo que preguntar dos veces.",
    paid: "pagó",
    owes: "debe",
    scorer: "Erick Santos",
    scorerArea: "Dev",
    shareDate: "Sábado 29 de agosto",
    shareMeta: "20:00 - 21:30 · Cancha de la oficina · 12 jugadores",
  },
};

export const DICTIONARIES: Record<Locale, Dictionary> = { en, es };

/**
 * Puts the numbers and the names into a line.
 *
 * `fill(t.hud.toPay, { count: 3 })`. Deliberately the dullest possible
 * substitution: the alternative is a formatting library for a job that is one
 * regular expression, in an app whose longest sentence is fourteen words.
 */
export function fill(
  line: string,
  values: Record<string, string | number>,
): string {
  return line.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

/**
 * The name of an area. The one thing on screen that never changes language.
 *
 * These are the company's own departments -- what is on the org chart and what
 * people call them out loud -- so translating them would be renaming somebody's
 * team. They live in `AREAS` and nowhere else, which also means an area the app
 * has never heard of falls back to the id it was saved under rather than to an
 * empty space where a word should be.
 */
export function areaLabel(id: string): string {
  return getArea(id).label;
}

/** And for the six numbers on a profile. */
export function skillLabel(t: Dictionary, id: string): string {
  return (t.skills as Record<string, string>)[id] ?? id;
}

/**
 * What a validator complained about, in the reader's language.
 *
 * The schemas are built once when the module loads, long before anybody has a
 * language, so what they carry is the key -- "places.badUrl" -- and the form
 * looks it up when it draws the error. Anything that is not a key it has comes
 * back untouched, which covers the messages zod writes itself.
 */
export function problem(t: Dictionary, message?: string): string | undefined {
  if (!message) return message;
  const [group, key] = message.split(".");
  if (!key) return message;
  const bag = (t as unknown as Record<string, Record<string, string>>)[group];
  return bag?.[key] ?? message;
}

/** The same, for the four positions, which are not free text. */
export function positionLabel(t: Dictionary, id: string): string {
  return (t.positions as Record<string, string>)[id] ?? id;
}
