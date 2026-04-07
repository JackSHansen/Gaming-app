# 🎮 GameFinder – Gaming Web App

## 📌 Projektbeskrivelse

Dette projekt går ud på at udvikle en mobilvenlig webapplikation med fokus på computerspil. Applikationen skal fungere som en platform, hvor brugeren kan søge efter og udforske forskellige spil.

Projektet er en del af et forløb, hvor formålet er at opbygge grundstenene til en app ved først at udvikle en hjemmeside med **mobile-first design**, som senere kan konverteres til en rigtig app.

Applikationen vil hente data fra et eksternt API og præsentere det i et brugervenligt interface.

---

## 🛠️ Teknologier

* Next.js
* TypeScript
* SCSS
* REST API (RAWG Video Games Database)
* GitHub

---

## 🌐 API

Projektet benytter RAWG Video Games Database API til at hente data om computerspil.

```
https://api.rawg.io/api/games?key=c7bc67596b634837a361aa095fbdfd2d
```

---

## ⚙️ Funktionalitet

### 🏠 Forside

* Viser en liste over populære spil
* Data hentes fra API
* Mobile-first layout

### 🔍 Søgning

* Brugeren kan søge efter spil
* Resultater opdateres dynamisk

### 🎮 Spildetaljer

* Viser information om et valgt spil:

  * Titel
  * Billede
  * Beskrivelse
  * Genre
  * Rating

### ⭐ Favoritter

* Mulighed for at gemme spil
* Gemmes i localStorage

---

## 📱 Mobile-first design

Applikationen er designet med fokus på mobilbrugere:

* Responsivt layout
* Touch-venlig navigation
* Enkel og overskuelig UI

---

## 🚀 Ekstra features (mulige udvidelser)

* Dark mode
* Filtrering efter genre/platform
* Infinite scroll
* Loading indikatorer

