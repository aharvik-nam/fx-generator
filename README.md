# fx-generator

Et lokalt, nettleserbasert bildeeffekt-laboratorium og presentasjonsverktøy. Last opp et bilde,
bygg en ikke-destruktiv effektkjede, og presenter transformasjonen som en interaktiv showcase —
alt kjøres i din egen nettleser. Ingen bilder eller metadata forlater maskinen din.

> **Status:** tidlig utvikling (milepæl M4 — Showcase del 1). Opplasting, en ikke-destruktiv
> effektkjede med alle 9 Prioritet-1-effekter, metadata-lesing/-visning, full oppløsning-eksport,
> en redigerbar AI Image Recipe, og lokal prosjektlagring (IndexedDB) med ZIP-eksport fungerer.
> Showcase-modus er nå implementert med en editor for navngitte states og en **Vertical
> Story**-visningsmodus; Before/After Explorer kommer i M5. Se [Veikart](#veikart) for planen.
>
> **Live:** [fx-generator.vercel.app](https://fx-generator.vercel.app)

## Innhold

- [Funksjonalitet (planlagt)](#funksjonalitet-planlagt)
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
  dithering.
- Angre/gjøre om med tastatursnarveier.
- Metadata-panel: viser EXIF/GPS når tilgjengelig, med tydelig varsel for sensitive felt.
- Eksporter til PNG/JPG/WebP i full oppløsning, med eksplisitt kontroll over om EXIF-metadata
  fjernes helt, delvis (sensitive felt fjernet), eller beholdes (kun JPEG).
- Redigerbar **AI Image Recipe**: strukturerte felt (motiv/komposisjon/lys/stemning/stil) eller
  direkte Markdown-redigering, automatisk uttrekk av fargepalett og effektkjede, kopier/last ned
  `.md`, og formatering av prompten for Flux/SDXL/Midjourney/Gemini — med tydelig forbehold om at
  en AI-prompt ikke garanterer en presis reproduksjon.
- Lagre og åpne prosjekter lokalt (IndexedDB) — inkludert originalbildet, hele effektkjeden og
  recipe-feltene.
- Eksporter en komplett ZIP-pakke (bilde + `recipe.md` + `project.json`).
- **Showcase-modus:** bygg en presentasjon av et bildes transformasjon som en sekvens av navngitte,
  uavhengige states (hver med egen effektkjede, kamera og miniatyrbilde). Showcase-editor med
  dra-og-slipp-omrokkering, dupliser/slett, start/slutt-markering, intro/outro-tekst og
  visningsinnstillinger (metadata/recipe/parametere). Lagres lokalt (IndexedDB), ett showcase per
  prosjekt. **Vertical Story**-visningsmodus: scroll-drevet presentasjon med
  fremdriftsindikator og hopp-til-state-navigasjon.

Planlagt (se [Veikart](#veikart)):

- Presets lokalt.
- **Before/After Explorer**-visningsmodus og `interpolateShowcaseState` for glidende overganger.

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
    effects/      # EffectDefinition-registry + pixel-transform-implementasjoner (canvas2d)
    pipeline/     # RenderPipeline (kompositering + inkrementell cache), renderToCanvas
                  # (DOM-blit for preview), render.worker.ts + exportRenderer.ts (full-res
                  # eksport i en Web Worker via OffscreenCanvas)
    random/        # Seedet PRNG (mulberry32) for generative effekter
    color/         # Blend mode-mapping, blend mode-labels
    image/          # Bildeavkoding + nedskalert forhåndsvisning
  state/         # Zustand-stores (view, project — inkl. historikk, lagre/åpne prosjekt — og showcase)
  persistence/   # db.ts (idb-schema), projectRepository.ts, showcaseRepository.ts (lagre/hent/slett)
  metadata/      # exifr-basert EXIF/XMP/IPTC/GPS-lesing, strip/keep-sensitiv-policy
  export/        # imageExport (orkestrering + nedlasting), jpegMetadataInject (piexifjs),
                  # recipeGenerator (Markdown + provider-prompts), zipExport (jszip),
                  # ExportDialog-UI
  showcase/       # thumbnail.ts (state-miniatyrbilder), scrollModes/verticalStory/ (M4);
                  # interpolateShowcaseState + before-after (M5)
  components/     # UI: layout, editor (inkl. params/), metadata, recipe, project, showcase, ui (shadcn)
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
  `project.json`.
- ✅ **M4 — Showcase del 1:** showcase-datamodell (`ShowcaseProject`/`ShowcaseState`), lokal
  lagring i IndexedDB (ett showcase per prosjekt); showcase-editor med opprett-fra-gjeldende-
  redigering, dra-og-slipp-omrokkering, dupliser/slett, navngiving/beskrivelse/notater,
  start/slutt-state-markering, intro/outro-tekst og visningsinnstillinger (metadata/recipe/
  parametere); automatisk miniatyrbilde-generering per state; **Vertical Story**-visningsmodus
  (`IntersectionObserver`-drevet aktiv-state-sporing, fremdriftsindikator, hopp-til-state-
  navigasjon via sidepanel med prikker).
- ⬜ **M5 — Showcase del 2 + tilgjengelighet:** Before/After Explorer,
  `interpolateShowcaseState`, a11y- og mobiltilpasning. Fullfører MVP-en.
- ⬜ **M6 — Deploy-herding:** ferdigstille README, bekrefte live Vercel-deploy.

Post-MVP (ikke bygget uten egen godkjenning): pinned-canvas/scrollytelling, resten av
Prioritet-2-effektkatalogen, presets-UI, masker-UI, horizontal-gallery/parallax/free-explore,
deling av showcase via URL, video/GIF-eksport, sandkassekjørt egendefinert shader/JS.

## Deploy til Vercel

Prosjektet er en ren statisk Vite-app uten backend, og krever ingen `vercel.json` eller
miljøvariabler for å kjøre. Push til `main` på GitHub-repositoryet trigger automatisk deploy når
Vercel-prosjektet er koblet til repoet.
