export type Language = 'en' | 'nl' | 'sv';

export const translations = {
  en: {
    // General
    appName: 'Paper & Ink',
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    continue: 'Continue',
    back: 'Back',
    next: 'Next',
    settings: 'Settings',
    language: 'Language',
    delete: 'Delete',
    confirm: 'Confirm',
    
    // Landing Page
    heroTitle: 'The Bedtime Story that',
    heroTitleHighlight: 'Grows',
    heroTitleEnd: 'with Your Child',
    heroSubtitle: 'AI-powered personalized adventures that adapt to your child\'s age, remember their journey, and gently guide them to peaceful sleep.',
    startFree: 'Start Free Adventure',
    login: 'Login',
    whyParentsLove: 'Why Parents Love Paper & Ink',
    whyParentsLoveSubtitle: 'Every story is crafted with science-backed techniques to help your child drift off to dreamland.',
    sleepEngineered: 'Sleep Engineered',
    sleepEngineeredDesc: 'Uses psychological pacing to induce sleep. Stories feature rhythmic language and progressively calming scenes.',
    infiniteMemory: 'Infinite Memory',
    infiniteMemoryDesc: 'Leo remembers the dragon he met yesterday. Each adventure builds on the last, creating a rich continuous world.',
    stealthEducation: 'Stealth Education',
    stealthEducationDesc: 'Vocabulary scales automatically (ages 3-12). They learn new words without even realizing it.',
    readyForDreams: 'Ready for Sweet Dreams?',
    readyForDreamsSubtitle: 'Create your child\'s first magical character and watch as their personalized adventure unfolds.',
    beginStory: 'Begin Your Story',
    madeWithLove: 'Made with love for bedtime.',
    
    // Auth
    signIn: 'Sign In',
    signUp: 'Create Account',
    signOut: 'Sign Out',
    email: 'Email',
    password: 'Password',
    welcomeBack: 'Welcome back',
    createAccount: 'Create your story space',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    
    // Home
    yourCharacters: 'Your Characters',
    chooseHero: 'Choose a hero for tonight\'s adventure',
    createCharacter: 'Create Character',
    newCharacter: 'New Character',
    continueStory: 'Continue',
    newAdventure: 'New Adventure',
    noCharacters: 'No Characters Yet',
    noCharactersDesc: 'Create your first magical character and start their bedtime adventure tonight.',
    startJourney: 'Create your first character to begin the adventure',
    createFirstHero: 'Create Your First Hero',
    
    // Character Creator
    createHero: 'Create Your Hero',
    step1Title: 'Name Your Hero',
    step1Subtitle: 'Every great story begins with a name',
    step2Title: 'Choose Their Spirit',
    step2Subtitle: 'What makes them special?',
    step3Title: 'Add a Companion',
    step3Subtitle: 'Every hero needs a friend (optional)',
    heroName: 'Hero Name',
    heroNamePlaceholder: 'Enter a heroic name...',
    sidekickName: 'Companion Name',
    sidekickNamePlaceholder: 'Enter companion name...',
    skipSidekick: 'Skip for now',
    finishCreating: 'Create Character',
    selectAgeBand: 'Select Age Band',
    selectTraits: 'Select Traits',
    
    // Age Bands
    ageBand35: '3-5 years',
    ageBand35Desc: 'Simple words, cozy stories',
    ageBand68: '6-8 years',
    ageBand68Desc: 'Richer vocabulary, small adventures',
    ageBand912: '9-12 years',
    ageBand912Desc: 'Complex tales, deeper themes',
    
    // Archetypes
    knight: 'Knight',
    wizard: 'Wizard',
    bear: 'Bear',
    robot: 'Robot',
    princess: 'Princess',
    dragon: 'Dragon',
    pirate: 'Pirate',
    astronaut: 'Astronaut',
    fairy: 'Fairy',
    cat: 'Cat',
    owl: 'Owl',
    bunny: 'Bunny',
    
    // Traits
    brave: 'Brave',
    curious: 'Curious',
    funny: 'Funny',
    kind: 'Kind',
    clever: 'Clever',
    creative: 'Creative',
    adventurous: 'Adventurous',
    gentle: 'Gentle',
    
    // Story Length
    storyLengthTitle: 'How long is tonight\'s story?',
    storyLengthShort: 'Short',
    storyLengthShortDesc: '5 minutes',
    storyLengthMedium: 'Medium',
    storyLengthMediumDesc: '10 minutes',
    storyLengthLong: 'Long',
    storyLengthLongDesc: '15+ minutes',
    
    // Reader
    pageOf: 'Page {current} of {total}',
    theEnd: 'The End',
    directorMode: 'Director Mode',
    moodCalm: 'Calm',
    moodExciting: 'Exciting',
    humorSerious: 'Serious',
    humorFunny: 'Funny',
    generateNext: 'Continue the story...',
    weavingStory: 'Weaving the story...',
    tapToContinue: 'Tap to continue...',
    generatingPortrait: 'Generating portrait...',
    
    // Sleep Well Screen
    sleepWell: 'Sleep well',
    memorySaved: 'Memory Saved',
    goodnight: 'Goodnight',
    backToLibrary: 'Back to Library',
    tomorrowsAdventure: 'Tomorrow\'s Adventure',
    chooseNextAdventure: 'What will {name} do tomorrow?',
    pickForMe: 'Child is asleep (Pick for me)',
    choiceSaved: 'Saved! {name} will do this tomorrow.',
    
    // Character Management
    editCharacter: 'Edit Character',
    deleteCharacter: 'Delete Character',
    deleteWarning: 'Delete {name}? All memories will be lost.',
    characterDeleted: 'Character deleted',
  },
  
  nl: {
    // General
    appName: 'Papier & Inkt',
    loading: 'Laden...',
    save: 'Opslaan',
    cancel: 'Annuleren',
    continue: 'Doorgaan',
    back: 'Terug',
    next: 'Volgende',
    settings: 'Instellingen',
    language: 'Taal',
    delete: 'Verwijderen',
    confirm: 'Bevestigen',
    
    // Landing Page
    heroTitle: 'Het Slaapverhaaltje dat',
    heroTitleHighlight: 'Meegroeit',
    heroTitleEnd: 'met Je Kind',
    heroSubtitle: 'AI-aangedreven gepersonaliseerde avonturen die zich aanpassen aan de leeftijd van je kind, hun reis onthouden en hen zachtjes naar een vredige slaap leiden.',
    startFree: 'Start Gratis Avontuur',
    login: 'Inloggen',
    whyParentsLove: 'Waarom Ouders van Papier & Inkt Houden',
    whyParentsLoveSubtitle: 'Elk verhaal is gemaakt met wetenschappelijk onderbouwde technieken om je kind naar dromenland te brengen.',
    sleepEngineered: 'Slaap Ontworpen',
    sleepEngineeredDesc: 'Gebruikt psychologische pacing om slaap te induceren. Verhalen bevatten ritmische taal en geleidelijk kalmerende scènes.',
    infiniteMemory: 'Oneindig Geheugen',
    infiniteMemoryDesc: 'Leo herinnert zich de draak die hij gisteren ontmoette. Elk avontuur bouwt voort op het vorige.',
    stealthEducation: 'Verborgen Educatie',
    stealthEducationDesc: 'Woordenschat schaalt automatisch (3-12 jaar). Ze leren nieuwe woorden zonder het te beseffen.',
    readyForDreams: 'Klaar voor Zoete Dromen?',
    readyForDreamsSubtitle: 'Maak het eerste magische personage van je kind en kijk hoe hun gepersonaliseerde avontuur zich ontvouwt.',
    beginStory: 'Begin Je Verhaal',
    madeWithLove: 'Met liefde gemaakt voor het slapengaan.',
    
    // Auth
    signIn: 'Inloggen',
    signUp: 'Account aanmaken',
    signOut: 'Uitloggen',
    email: 'E-mail',
    password: 'Wachtwoord',
    welcomeBack: 'Welkom terug',
    createAccount: 'Maak je verhaalruimte',
    noAccount: 'Nog geen account?',
    hasAccount: 'Heb je al een account?',
    
    // Home
    yourCharacters: 'Jouw Personages',
    chooseHero: 'Kies een held voor het avontuur van vanavond',
    createCharacter: 'Personage Maken',
    newCharacter: 'Nieuw Personage',
    continueStory: 'Doorgaan',
    newAdventure: 'Nieuw Avontuur',
    noCharacters: 'Nog Geen Personages',
    noCharactersDesc: 'Maak je eerste magische personage en begin vanavond met hun slaapavontuur.',
    startJourney: 'Maak je eerste personage om het avontuur te beginnen',
    createFirstHero: 'Maak Je Eerste Held',
    
    // Character Creator
    createHero: 'Maak Je Held',
    step1Title: 'Geef Je Held Een Naam',
    step1Subtitle: 'Elk groot verhaal begint met een naam',
    step2Title: 'Kies Hun Geest',
    step2Subtitle: 'Wat maakt hen speciaal?',
    step3Title: 'Voeg Een Metgezel Toe',
    step3Subtitle: 'Elke held heeft een vriend nodig (optioneel)',
    heroName: 'Heldennaam',
    heroNamePlaceholder: 'Voer een heldhaftige naam in...',
    sidekickName: 'Naam Metgezel',
    sidekickNamePlaceholder: 'Voer naam metgezel in...',
    skipSidekick: 'Nu overslaan',
    finishCreating: 'Personage Maken',
    selectAgeBand: 'Selecteer Leeftijdsgroep',
    selectTraits: 'Selecteer Eigenschappen',
    
    // Age Bands
    ageBand35: '3-5 jaar',
    ageBand35Desc: 'Eenvoudige woorden, gezellige verhalen',
    ageBand68: '6-8 jaar',
    ageBand68Desc: 'Rijkere woordenschat, kleine avonturen',
    ageBand912: '9-12 jaar',
    ageBand912Desc: 'Complexe verhalen, diepere thema\'s',
    
    // Archetypes
    knight: 'Ridder',
    wizard: 'Tovenaar',
    bear: 'Beer',
    robot: 'Robot',
    princess: 'Prinses',
    dragon: 'Draak',
    pirate: 'Piraat',
    astronaut: 'Astronaut',
    fairy: 'Fee',
    cat: 'Kat',
    owl: 'Uil',
    bunny: 'Konijn',
    
    // Traits
    brave: 'Dapper',
    curious: 'Nieuwsgierig',
    funny: 'Grappig',
    kind: 'Vriendelijk',
    clever: 'Slim',
    creative: 'Creatief',
    adventurous: 'Avontuurlijk',
    gentle: 'Zachtaardig',
    
    // Story Length
    storyLengthTitle: 'Hoe lang is het verhaal vanavond?',
    storyLengthShort: 'Kort',
    storyLengthShortDesc: '5 minuten',
    storyLengthMedium: 'Middel',
    storyLengthMediumDesc: '10 minuten',
    storyLengthLong: 'Lang',
    storyLengthLongDesc: '15+ minuten',
    
    // Reader
    pageOf: 'Pagina {current} van {total}',
    theEnd: 'Einde',
    directorMode: 'Regisseur Modus',
    moodCalm: 'Rustig',
    moodExciting: 'Spannend',
    humorSerious: 'Serieus',
    humorFunny: 'Grappig',
    generateNext: 'Ga verder met het verhaal...',
    weavingStory: 'Het verhaal wordt geweven...',
    tapToContinue: 'Tik om verder te gaan...',
    generatingPortrait: 'Portret wordt gemaakt...',
    
    // Sleep Well Screen
    sleepWell: 'Slaap lekker',
    memorySaved: 'Herinnering Opgeslagen',
    goodnight: 'Welterusten',
    backToLibrary: 'Terug naar Bibliotheek',
    tomorrowsAdventure: 'Morgens Avontuur',
    chooseNextAdventure: 'Wat gaat {name} morgen doen?',
    pickForMe: 'Kind slaapt (Kies voor mij)',
    choiceSaved: 'Opgeslagen! {name} gaat dit morgen doen.',
    
    // Character Management
    editCharacter: 'Personage Bewerken',
    deleteCharacter: 'Personage Verwijderen',
    deleteWarning: '{name} verwijderen? Alle herinneringen gaan verloren.',
    characterDeleted: 'Personage verwijderd',
  },
  
  sv: {
    // General
    appName: 'Papper & Bläck',
    loading: 'Laddar...',
    save: 'Spara',
    cancel: 'Avbryt',
    continue: 'Fortsätt',
    back: 'Tillbaka',
    next: 'Nästa',
    settings: 'Inställningar',
    language: 'Språk',
    delete: 'Radera',
    confirm: 'Bekräfta',
    
    // Landing Page
    heroTitle: 'Godnattsagan som',
    heroTitleHighlight: 'Växer',
    heroTitleEnd: 'med Ditt Barn',
    heroSubtitle: 'AI-drivna personliga äventyr som anpassar sig till ditt barns ålder, minns deras resa och leder dem varsamt till fridfull sömn.',
    startFree: 'Starta Gratis Äventyr',
    login: 'Logga in',
    whyParentsLove: 'Varför Föräldrar Älskar Papper & Bläck',
    whyParentsLoveSubtitle: 'Varje saga är skapad med vetenskapligt beprövade tekniker för att hjälpa ditt barn att somna.',
    sleepEngineered: 'Sömndesignad',
    sleepEngineeredDesc: 'Använder psykologisk pacing för att främja sömn. Sagor har rytmiskt språk och gradvis lugnande scener.',
    infiniteMemory: 'Oändligt Minne',
    infiniteMemoryDesc: 'Leo minns draken han träffade igår. Varje äventyr bygger på det förra och skapar en rik sammanhängande värld.',
    stealthEducation: 'Dold Utbildning',
    stealthEducationDesc: 'Ordförrådet skalas automatiskt (3-12 år). De lär sig nya ord utan att ens märka det.',
    readyForDreams: 'Redo för Söta Drömmar?',
    readyForDreamsSubtitle: 'Skapa ditt barns första magiska karaktär och se hur deras personliga äventyr utvecklas.',
    beginStory: 'Börja Din Saga',
    madeWithLove: 'Gjord med kärlek för läggdags.',
    
    // Auth
    signIn: 'Logga in',
    signUp: 'Skapa konto',
    signOut: 'Logga ut',
    email: 'E-post',
    password: 'Lösenord',
    welcomeBack: 'Välkommen tillbaka',
    createAccount: 'Skapa ditt berättelseutrymme',
    noAccount: 'Har du inget konto?',
    hasAccount: 'Har du redan ett konto?',
    
    // Home
    yourCharacters: 'Dina Karaktärer',
    chooseHero: 'Välj en hjälte för kvällens äventyr',
    createCharacter: 'Skapa Karaktär',
    newCharacter: 'Ny Karaktär',
    continueStory: 'Fortsätt',
    newAdventure: 'Nytt Äventyr',
    noCharacters: 'Inga Karaktärer Än',
    noCharactersDesc: 'Skapa din första magiska karaktär och börja deras godnattäventyr ikväll.',
    startJourney: 'Skapa din första karaktär för att börja äventyret',
    createFirstHero: 'Skapa Din Första Hjälte',
    
    // Character Creator
    createHero: 'Skapa Din Hjälte',
    step1Title: 'Namnge Din Hjälte',
    step1Subtitle: 'Varje stor berättelse börjar med ett namn',
    step2Title: 'Välj Deras Ande',
    step2Subtitle: 'Vad gör dem speciella?',
    step3Title: 'Lägg Till En Kompis',
    step3Subtitle: 'Varje hjälte behöver en vän (valfritt)',
    heroName: 'Hjältens Namn',
    heroNamePlaceholder: 'Ange ett hjältenamn...',
    sidekickName: 'Kompisens Namn',
    sidekickNamePlaceholder: 'Ange kompisens namn...',
    skipSidekick: 'Hoppa över för nu',
    finishCreating: 'Skapa Karaktär',
    selectAgeBand: 'Välj Åldersgrupp',
    selectTraits: 'Välj Egenskaper',
    
    // Age Bands
    ageBand35: '3-5 år',
    ageBand35Desc: 'Enkla ord, mysiga sagor',
    ageBand68: '6-8 år',
    ageBand68Desc: 'Rikare ordförråd, små äventyr',
    ageBand912: '9-12 år',
    ageBand912Desc: 'Komplexa berättelser, djupare teman',
    
    // Archetypes
    knight: 'Riddare',
    wizard: 'Trollkarl',
    bear: 'Björn',
    robot: 'Robot',
    princess: 'Prinsessa',
    dragon: 'Drake',
    pirate: 'Pirat',
    astronaut: 'Astronaut',
    fairy: 'Älva',
    cat: 'Katt',
    owl: 'Uggla',
    bunny: 'Kanin',
    
    // Traits
    brave: 'Modig',
    curious: 'Nyfiken',
    funny: 'Rolig',
    kind: 'Snäll',
    clever: 'Klok',
    creative: 'Kreativ',
    adventurous: 'Äventyrlig',
    gentle: 'Varsam',
    
    // Story Length
    storyLengthTitle: 'Hur lång är kvällens saga?',
    storyLengthShort: 'Kort',
    storyLengthShortDesc: '5 minuter',
    storyLengthMedium: 'Medium',
    storyLengthMediumDesc: '10 minuter',
    storyLengthLong: 'Lång',
    storyLengthLongDesc: '15+ minuter',
    
    // Reader
    pageOf: 'Sida {current} av {total}',
    theEnd: 'Slut',
    directorMode: 'Regissörsläge',
    moodCalm: 'Lugn',
    moodExciting: 'Spännande',
    humorSerious: 'Allvarlig',
    humorFunny: 'Rolig',
    generateNext: 'Fortsätt berättelsen...',
    weavingStory: 'Sagan vävs...',
    tapToContinue: 'Tryck för att fortsätta...',
    generatingPortrait: 'Genererar porträtt...',
    
    // Sleep Well Screen
    sleepWell: 'Sov gott',
    memorySaved: 'Minne Sparat',
    goodnight: 'Godnatt',
    backToLibrary: 'Tillbaka till Biblioteket',
    tomorrowsAdventure: 'Morgondagens Äventyr',
    chooseNextAdventure: 'Vad ska {name} göra imorgon?',
    pickForMe: 'Barnet sover (Välj åt mig)',
    choiceSaved: 'Sparat! {name} kommer göra detta imorgon.',
    
    // Character Management
    editCharacter: 'Redigera Karaktär',
    deleteCharacter: 'Radera Karaktär',
    deleteWarning: 'Radera {name}? Alla minnen kommer att gå förlorade.',
    characterDeleted: 'Karaktär raderad',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function t(key: TranslationKey, lang: Language = 'en', params?: Record<string, string | number>): string {
  let text: string = (translations[lang][key] || translations.en[key] || key) as string;
  
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(`{${paramKey}}`, String(value));
    });
  }
  
  return text;
}