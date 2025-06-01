# MeucciHub

Una piattaforma web pensata principalmente per gli studenti dell'ITIS Meucci, realizzata con tecnologie moderne come SvelteKit, TypeScript, Prisma e SQLite.

## Panoramica

MeucciHub offre orari delle lezioni personalizzati, un elenco classi ricercabile, annunci, calendario e materiali condivisi per migliorare l’esperienza degli studenti.

## Caratteristiche

- Autenticazione Google sicura (in programma)
- Dashboard personalizzata con orario delle lezioni in tempo reale
- Menu a tendina per cambiare orario tra le classi
- Elenco classi ricercabile
- Annunci e integrazione calendario (in programma)
- Repository per materiali condivisi  (in programma)

## Tecnologie Utilizzate

- Frontend: SvelteKit, Tailwind CSS, TypeScript
- Backend: Node.js, Express, Prisma ORM
- Database: SQLite

## Come Iniziare

### Prerequisiti

- Node.js v16 o superiore  
- pnpm o npm  
- SQLite

### Installazione

```bash
git clone https://github.com/Lieno2/MeucciHub.git
cd MeucciHub
pnpm install
```
FrontEnd:
```bash
cd frontend
pnpm run dev -- --open
```
BackEnd:
```bash
cd backend
pnpm seed
pnpm start
```

