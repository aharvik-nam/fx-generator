# fx-generator

Et lokalt, nettleserbasert bildeeffekt-laboratorium og presentasjonsverktøy. Last opp et bilde,
bygg en ikke-destruktiv effektkjede, og presenter transformasjonen som en interaktiv showcase —
alt kjøres i din egen nettleser. Ingen bilder eller metadata forlater maskinen din.

> **Status:** MVP-en er komplett og ferdigstilt (M0–M6). Opplasting, en ikke-destruktiv effektkjede
> med alle 9 Prioritet-1-effekter, metadata-lesing/-visning, full oppløsning-eksport, en
> en Effect Recipe som genererer ekte kjørbar JavaScript for effektkjeden, lokal prosjektlagring
> (IndexedDB) med ZIP-eksport, og Showcase-modus
> med **Vertical Story**- og **Before/After Explorer**-visningsmoduser fungerer — verifisert
> både lokalt og på den live Vercel-deployen. Se [Veikart](#veikart) for hva som er planlagt
> post-MVP (bygges kun etter egen godkjenning).
>
> **Live:** [fx-generator.vercel.app](https://fx-generator.vercel.app)

## Innhold

- [Funksjonalitet](#funksjonalitet)
- [Teknologi](#teknologi)
- [Kom i gang](#kom-i-gang)
- [Prosjektstruktur](#prosjektstruktur)
- [Arkitektur](#arkitektur)
- [Personvern](#personvern)
- [Veikart](#veikart)
- [Deploy til Vercel](#deploy-til-vercel)

## Funksjonalitet

Implementert så langt:

- Last opp JPG, PNG og WebP (drag-and-drop eller filvelger), med live forhåndsvisning på canvas.
- Bygg en ubegrenset, ikke-destruktiv effektkjede (rekkefølge, synlighet, opacity, blend mode,
  parametere) uten å røre originalfilen. Alle 9 Prioritet-1-effekter: Exposure, Contrast,
  Duotone, Film grain (seedet), Vignette, Posterize, RGB channel shift, Pixelation, Ordered
  dithering — pluss et voksende Prioritet-2-katalog: Halftone (prikkrutenett med størrelse/
  prikkfarge/bakgrunn), Pixel sort (sorterer sammenhengende lyse pikselrekker etter lyshet for et
  glitch-uttrykk), **Outline** (kantdeteksjon med Sobel-operator — tegner konturene i bildet
  som linjer på en ensfarget bakgrunn), **Threshold** (reduserer bildet til to flate farger
  basert på en lyshetsterskel, for et grafisk plakat-/skjermtrykk-uttrykk), **Cross-hatch**
  (penntegning-skravering — flere lag med linjer i ulik retning legges over hverandre jo mørkere
  et område er), **Stippling** (prikk-kunst — tettheten av jitrede, seedet-tilfeldige prikker
  følger bildets lyshet), **Painterly** (males på nytt som korte penselstrøk i farger hentet
  fra originalen, som følger kantene der bildet har tydelig struktur og et jevnt "flow field" der
  det er flatt), **Flow field** (buede linjer som følger et jevnt, generativt strømningsfelt over
  hele bildet — samme flow-field-matte som Painterly, men som selve effekten i stedet for en
  fallback), **Voronoi-mosaikk** (deler bildet inn i uregelmessige celler rundt tilfeldige punkter,
  hver celle fylt med sin gjennomsnittsfarge), **Partikkelsystem** (fri, tilfeldig spredning av
  partikler — tettest i bildets lyseste områder — på en mørk bakgrunn, som et stjernefelt),
  **Celleautomat** (leser bildets mørke områder som et startmønster for "Game of Life" og lar det
  utvikle seg et gitt antall generasjoner), **Fargekvantisering** (finner bildets egne dominerende
  farger med k-means-klynging, i motsetning til Posterize sine faste nivåer), **Kaleidoskop**
  (speilvendte kiler rundt et senterpunkt), **Kuwahara** (kant-bevarende utjevning — glatter ut
  flate områder uten å myke opp kantene, i motsetning til vanlig uskarphet), **Uskarphet /
  skarphet** (én glidebryter fra full Gaussisk uskarphet, via ingen endring, til skarptegning med
  unsharp mask) og **Analogt filmkorn** (prosedyregenerert korn i tre frekvensbånd — fint, middels,
  grovt — blandet etter en Fine/Balanced/Coarse-profil, lagt til som luminans i lineært lys, og
  formet av uavhengige skygge-, høylys- og detaljmasker pluss egne kontroller for kornstørrelse,
  mykhet, klumping og monokrom/farge-balanse; et mer analogt-tro og finmasket alternativ til det
  enklere `Film grain`), **Halation** (varm glød rundt sterke høylys, som lys som spres tilbake
  gjennom filmens emulsjon og base — en myk terskel/knekk plukker ut høylysene, blures separat fra
  resten av bildet, tones til en valgt fargetone, og kantbevaring holder gløden nær kilden i
  stedet for at det blir en generell bloom-effekt) og **Papiroverflate** (simulerer en fysisk
  Matte/Satin/Gloss-overflate — mikrokontrast, løftet svart og myk høylys-kompresjon for papirets
  smalere dynamiske omfang, pluss en prosedyregenerert papirstruktur og varm papirtone; aldri en
  skannet tredjepartstekstur).
- Angre/gjøre om med tastatursnarveier.
- Metadata-panel: viser EXIF/GPS når tilgjengelig, med tydelig varsel for sensitive felt.
- Eksporter til PNG/JPG/WebP i full oppløsning, med eksplisitt kontroll over om EXIF-metadata
  fjernes helt, delvis (sensitive felt fjernet), eller beholdes (kun JPEG).
- **Effect Recipe:** genererer ekte, kjørbar JavaScript (Canvas 2D) som gjenskaper effektkjeden
  utenfor appen — ikke en AI-prompt. For hver aktive effekt: en selvstendig kodeblokk (hentet
  live via `.toString()` fra den faktiske funksjonen appen selv kjører, aldri en frikoblet
  beskrivelse som kan gli ut av synk) pluss et lite eksempel på hvordan den kalles alene, og til
  slutt ett samlet, dedupliserte skript som komponerer alle effektene i rekkefølge — med riktig
  opacity, blend mode og maske mellom hvert steg, akkurat slik `RenderPipeline` gjør det internt.
  Kopier koden rett inn i en nettside, eller last ned `.js`/`.md`. Verifisert til å faktisk kjøre
  feilfritt både i dev-serveren og i en ekte `vite preview`-produksjonsbygg (minifisering endrer
  navnene på delte hjelpefunksjoner — derfor er alle interne konstanter erklært inni funksjonen
  som bruker dem i stedet for delt på modul-nivå, se `export/effectImplementations.ts`).
- Lagre og åpne prosjekter lokalt (IndexedDB) — inkludert originalbildet og hele effektkjeden.
- Eksporter en komplett ZIP-pakke (bilde + `recipe.md` + `project.json`).
- **Showcase-modus:** bygg en presentasjon av et bildes transformasjon som en sekvens av navngitte,
  uavhengige states (hver med egen effektkjede, kamera og miniatyrbilde). Showcase-editor med
  dra-og-slipp-omrokkering, dupliser/slett, start/slutt-markering, intro/outro-tekst og
  visningsinnstillinger (metadata/parametere). Lagres lokalt (IndexedDB), ett showcase per
  prosjekt. To visningsmoduser: **Vertical Story** (scroll-drevet presentasjon med
  fremdriftsindikator og hopp-til-state-navigasjon) og **Before/After Explorer** (delt
  før/etter-sammenligning av showcasets start- og slutt-state, med en dra-i-bildet-glidebryter
  og en tilgjengelig `<Slider>`-kontroll — begge styrer samme posisjon — pluss valgfri
  loddrett/vannrett delelinje).
- Tilgjengelighet: hopp-til-innhold-lenke, `<main>`-landemerker per visning, tastaturstyrt
  dra-og-slipp (effektstakk og showcase-stateliste). Mobiltilpasning: effektbibliotek og
  effektstakk/metadata/recipe åpnes som sideskuffer (`Sheet`) under `lg`-brytepunktet i stedet for
  faste sidepaneler, og topplinjen beholder visningsbryteren (Editor/Showcase/Forhåndsvis)
  synlig mens resten av knapperaden kan scrolles horisontalt ved behov.
- **Presets:** lagre gjeldende parametere for en effekt som en navngitt preset (lokalt i
  IndexedDB), bruk den på et eksisterende effekt-node, eller legg til en helt ny effekt
  ferdig-fylt med presetens parametere direkte fra effektbiblioteket. Presets er ikke knyttet
  til ett bilde eller prosjekt — de er tilgjengelige uansett hvilket bilde du jobber med.
- **Masker:** begrens en hvilken som helst effekt til deler av bildet — per-effekt maske med
  lineær gradient (vinkel + myking), radial gradient (senter, radius, myking), eller lyshet
  (bruker bildets egne toner, med valgfri invertering). Rent kompositert (masken klipper kun
  effektens alfakanal før den legges over grunnlaget), så samme maske virker uansett hvilken
  effekt den ligger på.

Planlagt (se [Veikart](#veikart)):

- Flere Prioritet-2-effekter (flow fields m.fl.), flere scroll-moduser, bitmap-masker (last opp
  et egendefinert maskebilde).

## Teknologi

| Område          | Valg                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------- |
| Rammeverk       | Vite + React 19 + TypeScript (strict)                                                         |
| UI              | Tailwind CSS v4 + shadcn/ui (Radix-baserte primitiver)                                        |
| State           | Zustand                                                                                       |
| Lokal lagring   | IndexedDB via `idb`                                                                           |
| Bildebehandling | Canvas 2D (MVP), med `EffectDefinition.rendererKind` klargjort for WebGL/WebGPU/Worker senere |
| Metadata        | `exifr` (EXIF/XMP/IPTC-lesing), `piexifjs` (EXIF-reinjeksjon ved JPEG-eksport)                |
| Zip-eksport     | `jszip`                                                                                       |
| Drag-and-drop   | `@dnd-kit`                                                                                    |
| Test            | Vitest + React Testing Library (+ `fake-indexeddb` for persistence-tester)                    |
| Lint/format     | oxlint (inkl. `jsx-a11y`, `typescript`, `react`-regelsett) + Prettier                         |

Appen er en ren statisk frontend uten backend — det er ikke nødvendig med noen server- eller
API-komponent, og ingen miljøvariabler/hemmeligheter kreves.

## Kom i gang

Krever Node.js 20+ og npm.

```bash
npm install
npm run dev
```

Åpne `http://localhost:5173`.

### Andre kommandoer

```bash
npm run typecheck   # TypeScript-sjekk (tsc -b)
npm run lint         # oxlint
npm run test         # Vitest (engangskjøring)
npm run test:watch   # Vitest i watch-modus
npm run format        # Prettier, skriver endringer
npm run build         # Produksjonsbygg (typecheck + vite build)
npm run preview       # Forhåndsvis produksjonsbygget lokalt
```

## Prosjektstruktur

```
src/
  types/        # Delt TypeScript-type-overflate (ImageProject, EffectNode, Showcase, ...)
  engine/
    effects/      # EffectDefinition-registry + pixel-transform-implementasjoner (canvas2d),
                  # inkl. canvas2d/sobelGradient.ts (delt Sobel-gradient-matte for
                  # Outline/Painterly), canvas2d/flowField.ts (delt flow-field-vinkelfunksjon
                  # for Painterly/Flow field) og tegne-baserte renderere (Cross-hatch/Stippling/
                  # Painterly/Flow field/Partikkelsystem: en ren geometri-funksjon + en tynn
                  # ctx.*-tegne-wrapper)
    pipeline/     # RenderPipeline (kompositering + inkrementell cache), renderToCanvas
                  # (DOM-blit for preview), render.worker.ts + exportRenderer.ts (full-res
                  # eksport i en Web Worker via OffscreenCanvas)
    mask/          # maskMath.ts (ren maske-verdi-funksjon per type), applyMask.ts (klipper et
                  # effektlags alfakanal — brukt av RenderPipeline, ikke av effektene selv)
    random/        # Seedet PRNG (mulberry32) for generative effekter
    color/         # Blend mode-mapping, blend mode-labels
    image/          # Bildeavkoding + nedskalert forhåndsvisning
  state/         # Zustand-stores (view, project — inkl. historikk, lagre/åpne prosjekt — showcase,
                  # og presets)
  persistence/   # db.ts (idb-schema), projectRepository.ts, showcaseRepository.ts,
                  # presetRepository.ts (lagre/hent/slett)
  metadata/      # exifr-basert EXIF/XMP/IPTC/GPS-lesing, strip/keep-sensitiv-policy
  export/        # imageExport (orkestrering + nedlasting), jpegMetadataInject (piexifjs),
                  # effectImplementations.ts (kobler hver effekt-id til de faktiske
                  # implementasjonsfunksjonene, for Recipe-kodegenerering), recipeGenerator
                  # (bygger kjørbar JS-kode + samlet effektkjede-skript fra `.toString()` på
                  # live funksjonsreferanser — aldri en frikoblet beskrivelse), zipExport
                  # (jszip), ExportDialog-UI
  showcase/       # thumbnail.ts, formatMetadataExcerpt.ts, interpolateShowcaseState.ts (ren
                  # funksjon for fremtidig scroll-interpolering), scrollModes/verticalStory/,
                  # scrollModes/beforeAfter/
  components/     # UI: layout (inkl. MobilePanelBar), editor (inkl. params/), metadata, recipe,
                  # project, showcase, ui (shadcn, inkl. sheet.tsx for mobil sidepanel-tilgang)
  hooks/          # Delte React-hooks (tastatursnarveier)
  lib/            # Small utilities (cn-helper, filvalidering, blob/data-URL-konvertering)
```

## Arkitektur

- **Ikke-destruktiv effektkjede:** hvert bilde har en original som aldri endres, pluss en
  ordnet liste av `EffectNode`-er (type, parametere, opacity, blend mode, valgfri `seed` for
  reproduserbare generative effekter). Rendering skjer i et eget pipeline-lag, separat fra
  UI-kontrollene og fra selve effekt-definisjonene.
- **Preview vs. eksport:** redigering skjer mot et nedskalert forhåndsvisningsbilde for god
  ytelse; eksport kjører hele effektkjeden på nytt i full oppløsning mot originalen, i en Web
  Worker med `OffscreenCanvas` slik at UI-et ikke fryser.
- **Showcase-states:** en showcase er en navngitt sekvens av komplette, uavhengige snapshots av
  en effektkjede + kamera (zoom/pan). Det finnes ingen skjult delt state mellom states — å
  duplisere og endre én state kan aldri påvirke en annen.
- **Renderer-agnostisk:** `EffectDefinition.rendererKind` (`canvas2d` / `webgl` / `webgpu` /
  `worker`) lar nye effekttyper legges til uten å endre rendering-pipelinens kontrakt.

## Personvern

All ordinær bildebehandling skjer lokalt i nettleseren din. Originalfilen lastes aldri opp noe
sted og endres aldri. Metadata (EXIF/XMP/IPTC/GPS) leses kun lokalt for visning i
metadata-panelet; ved eksport fjernes all metadata som standard, og du kan eksplisitt velge å
beholde generelle felt (kamera/objektiv/eksponering) eller alt. Full metadata-bevaring er kun
teknisk mulig for JPEG — nettleserens canvas-eksport fjerner alltid metadata ved re-koding for
PNG/WebP, og eksport-dialogen viser dette tydelig når det er relevant. Ingenting sendes til noen
ekstern server i denne appen.

## Veikart

Milepæler markert ✅ er implementert og verifisert (typecheck/lint/test/build + manuell
nettleserverifisering); resten er planlagt.

- ✅ **M0 — Prosjektskjelett:** Vite/React/TS/Tailwind/shadcn-oppsett, full TypeScript-type-
  overflate, tomt layout-skall (TopBar/venstre-/høyre-panel/canvas-område).
- ✅ **M1 — Kjerneeditor:** drag-and-drop-opplasting med validering, ikke-destruktiv effektmotor
  (registry, kompositering med opacity/blend mode, seedet PRNG, inkrementell "dirty index"-cache),
  effektbibliotek og effektstakk-UI (dnd-kit-omrokkering, aktiver/deaktiver, opacity, blend mode,
  parameterkontroller, nullstill/dupliser/slett), canvas zoom/pan/tilpass-til-skjerm/før-etter,
  angre/gjøre om med tastatursnarveier. Effekter: Exposure, Contrast, Duotone, Film grain (seedet).
- ✅ **M2 — Resten av Prioritet-1-effektene + metadata + eksport:** Vignette, Posterize, RGB
  channel shift, Pixelation, Ordered dithering (fullfører 9-effekts P1-katalogen);
  metadata-panel (exifr, sensitive-felt-varsel); full oppløsning-eksport til PNG/JPEG/WebP i en
  Web Worker (OffscreenCanvas), med EXIF-reinjeksjon for JPEG via `piexifjs` — fjern alt / fjern
  sensitivt / behold alt.
- ✅ **M3 — AI Image Recipe + prosjektlagring:** Markdown-oppskrift generert fra kildedata,
  metadata, fargepalett og effektkjede, med redigerbare motiv/komposisjon/lys/stemning/stil-felt,
  en direkte-redigerbar Markdown-visning, kopier/last ned, og prompt-formatering for
  Flux/SDXL/Midjourney/Gemini; lokal prosjektlagring i IndexedDB (originalbilde + effektkjede +
  recipe) med en Prosjekter-dialog for å åpne/slette; ZIP-eksport av bilde + `recipe.md` +
  `project.json`. (Recipe-funksjonen ble senere fullstendig erstattet — se "Etter MVP".)
- ✅ **M4 — Showcase del 1:** showcase-datamodell (`ShowcaseProject`/`ShowcaseState`), lokal
  lagring i IndexedDB (ett showcase per prosjekt); showcase-editor med opprett-fra-gjeldende-
  redigering, dra-og-slipp-omrokkering, dupliser/slett, navngiving/beskrivelse/notater,
  start/slutt-state-markering, intro/outro-tekst og visningsinnstillinger (metadata/
  parametere); automatisk miniatyrbilde-generering per state; **Vertical Story**-visningsmodus
  (`IntersectionObserver`-drevet aktiv-state-sporing, fremdriftsindikator, hopp-til-state-
  navigasjon via sidepanel med prikker).
- ✅ **M5 — Showcase del 2 + tilgjengelighet:** **Before/After Explorer**-visningsmodus (delt
  sammenligning av start-/slutt-state, dra-i-bildet + tilgjengelig `Slider`-kontroll, loddrett/
  vannrett delelinje); `interpolateShowcaseState` som en ren, enhetstestet funksjon (lerpe
  numeriske og fargeparametere, snappe boolean/select/seed ved 50 %, matche effekter på stabil
  id med inn/ut-toning for effekter som kun finnes i én av states); tilgjengelighetsgjennomgang
  (hopp-til-innhold-lenke, `<main>`-landemerker per visning); mobiltilpasning
  (`Sheet`-sidepaneler for effektbibliotek/-stakk under `lg`, en alltid synlig visningsbryter i
  topplinjen). Fullfører MVP-en.
- ✅ **M6 — Deploy-herding:** ferdigstilt README (rettet et gammelt TOC-anker-avvik), en full
  verifiseringsrunde (typecheck/lint/test/build), og en manuell gjennomgang av den faktiske live
  Vercel-deployen (ikke bare lokal dev) — opplasting, effektkjede, metadata, Showcase-editor,
  Vertical Story og Before/After Explorer, og mobillayout, alt bekreftet fungerende på
  [fx-generator.vercel.app](https://fx-generator.vercel.app).

### Etter MVP

- ✅ **Presets:** lagre/bruke/slette lokale parameter-presets per effekttype (se
  [Funksjonalitet](#funksjonalitet)).
- ✅ **Masker:** lineær gradient, radial gradient og lyshetsmasker, pluss selve
  maske-kompositeringen i `RenderPipeline` (fantes bare som type før — `EffectRenderContext`
  hadde et `mask`-felt ingen effekt faktisk leste). Bitmap-masker (eget opplastet maskebilde) er
  ikke bygget ennå — krever en egen asset-opplasting/-lagring, se Planlagt.
- ✅ **Prioritet-2-effekter:** Halftone, Pixel sort, Outline (Sobel-kantdeteksjon) og Threshold
  (grafisk to-fargers lyshetsterskel) — samme `PixelTransform`-arkitektur og param-/preset-/
  maske-støtte som alle andre effekter.
- ✅ **Kreativ programmering / generativ kunst-effekter (batch 1):** Cross-hatch, Stippling og
  Painterly — de første effektene som tegner direkte med Canvas-primitiver
  (`ctx.stroke()`/`ctx.arc()`) i stedet for å transformere piksler, hver med en ren, enhetstestet
  geometri-funksjon atskilt fra selve tegningen. Masking virker automatisk på disse også, siden
  masker komposisteres generisk i `RenderPipeline` og ikke inne i den enkelte effekten.
- ✅ **Kreativ programmering / generativ kunst / pixelmanipulasjon-effekter (batch 2):** Flow
  field, Voronoi-mosaikk, Partikkelsystem, Celleautomat, Fargekvantisering (k-means), Kaleidoskop,
  Kuwahara og Uskarphet/skarphet (unsharp mask) — samme arkitektur- og test-mønster som batch 1
  (tegne-baserte effekter: ren geometri + tynn `ctx.*`-wrapper; pixel-baserte effekter:
  `PixelTransform`), pluss to nye rene algoritmer verifisert med klassiske testtilfeller
  (Celleautomat mot kjente Game of Life-mønstre som blinker/block; Kuwahara mot en syntetisk
  hard kant for å bevise kant-bevaring kontra vanlig uskarphet).
- ⬜ Flere generative/pixel-manipulasjons-effekter (se idéliste i prosjekthistorikken):
  Delaunay-triangulering (low-poly), ASCII-/tekst-mosaikk, glitch/datamosh-varianter m.fl.
- ⬜ Flere scroll-moduser: horizontal-gallery, parallax, free-explore, pinned-canvas/scrollytelling
  (sistnevnte er det `interpolateShowcaseState` primært er bygget for).
- ⬜ Bitmap-masker (last opp et egendefinert maskebilde som fjerde maske-type).

Ikke bygget uten egen godkjenning (større arkitektur-avveininger): deling av showcase via URL
(bryter "alt lokalt"-prinsippet uten en backend), video/GIF-eksport (krever en ny
enkoder-avhengighet), sandkassekjørt egendefinert shader/JS (kjøring av vilkårlig brukerkode må
sandboxes forsvarlig).

## Deploy til Vercel

Prosjektet er en ren statisk Vite-app uten backend, og krever ingen `vercel.json` eller
miljøvariabler for å kjøre. Push til `main` på GitHub-repositoryet trigger automatisk deploy når
Vercel-prosjektet er koblet til repoet.
