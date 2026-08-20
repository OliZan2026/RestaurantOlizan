# OLIZAN Restaurant & Pizzeria — site oficial

Site de prezentare pentru **OLIZAN Restaurant & Pizzeria**, Bulgăruș, județul Timiș.
Operat de OLIZAN FOOD&AGRO S.R.L., CUI 43808540.

Site static, fără framework și **fără pas de compilare**: fișierele din depozit sunt exact
fișierele publicate. Orice modificare devine vizibilă imediat după publicare.

---

## 1. Ce trebuie să știi în 30 de secunde

| Vrei să schimbi… | Deschide fișierul |
|---|---|
| Produse, descrieri, gramaje, **prețuri** | `data/menu.js` |
| Telefon, WhatsApp, e-mail, adresă, Facebook | `data/menu.js` **și** fișierele `.html` — vezi §4 |
| Recomandările casei de pe prima pagină | `data/menu.js` (secțiunea `recomandari`) |
| Fotografii | folderul `assets/img/` |
| Textele paginilor | fișierele `.html` din rădăcină |
| Culorile și aspectul | `assets/css/style.css` (variabilele din partea de sus) |

> După orice modificare, salvează fișierul și reîncarcă pagina cu **Ctrl+F5**
> (sau Cmd+Shift+R pe Mac), ca browserul să nu folosească versiunea veche.

---

## 2. Cum modifici produsele și prețurile

Toate produsele stau în **`data/menu.js`**. Structura este simplă și repetitivă.

### 2.1 Schimbarea unui preț

Caută produsul și modifică valoarea din ghilimele:

```js
{ nume: "Margherita", desc: "Sos de roșii, mozzarella, oregano", pret: "30", pretMare: "65" },
```

* `pret` = mărimea **normală (33 cm)** la pizza, sau prețul unic la celelalte categorii
* `pretMare` = mărimea **family (50 cm)**, doar la pizza
* Prețurile se scriu fără cuvântul „lei" și cu **virgulă** la zecimale: `"1,50"`

### 2.2 Adăugarea unui produs nou

Copiază o linie existentă, lipește-o dedesubt și modific-o. Ai grijă ca fiecare linie
să se termine cu **virgulă**, cu excepția ultimei din listă.

```js
{ nume: "Pizza Nouă", desc: "Ingredientele tale", pret: "40", pretMare: "82" },
```

Câmpuri disponibile pentru un produs:

| Câmp | Obligatoriu | Exemplu |
|---|---|---|
| `nume` | da | `"Ciorbă de burtă"` |
| `desc` | nu | `"Sos de roșii, mozzarella, șuncă"` |
| `gramaj` | nu | `"500 g"`, `"250 ml"` |
| `pret` | da | `"25"` |
| `pretMare` | doar la pizza | `"75"` |

### 2.3 Ștergerea unui produs

Șterge linia întreagă, de la `{` până la `},` inclusiv.

### 2.4 Adăugarea unei categorii noi în meniu

În lista `meniu` din același fișier, copiază un bloc de categorie existent și schimbă:

```js
{
  id: "supe",                       // apare în adresă: /meniu#supe — doar litere mici, fără diacritice
  tab: "Supe",                      // textul de pe butonul categoriei
  titlu: "Supe",                    // titlul afișat în interior
  nota: "Text scurt de prezentare.",
  imagine: "assets/img/art/ciorba.svg",
  grupe: [
    { produse: [ { nume: "Supă de legume", gramaj: "400 g", pret: "20" } ] }
  ]
},
```

### 2.5 Dacă meniul nu se mai afișează

Înseamnă că lipsește o virgulă, o acoladă sau ghilimele. Deschide pagina, apasă `F12`,
mergi la fila **Console** și vei vedea linia cu problema. Cel mai simplu este să anulezi
ultima modificare și să o refaci cu atenție.

---

## 3. Recomandările casei (prima pagină)

Tot în `data/menu.js`, secțiunea `recomandari`. Fiecare card are:

```js
{
  eticheta: "Pizza",                            // eticheta mică din colț
  nume: "Pizza Quattro Stagioni",
  desc: "Descrierea afișată pe card.",
  pret: "35 lei",                               // aici se scrie și cuvântul „lei"
  pretNota: "normală 33 cm · family 50 cm — 75 lei",   // rând mic sub preț; poate rămâne gol: ""
  comanda: "Pizza Quattro Stagioni, mărimea normală", // textul trimis pe WhatsApp
  imagine: "assets/img/art/pizza.svg"
}
```

---

## 4. Datele de contact

Datele apar în **două locuri**, care trebuie ținute la fel:

1. **`data/menu.js`**, secțiunea `contact` — de aici se generează butoanele de comandă;
2. **fișierele `.html`** — în antet, în subsol și în paginile Contact / Locație.

Cel mai sigur mod de a schimba un număr peste tot: folosește funcția **Caută și înlocuiește**
a editorului, pe tot folderul, pentru fiecare formă în care apare numărul.

| Ce cauți | Unde apare |
|---|---|
| `+40 720 409 320` | text afișat |
| `tel:+40720409320` | linkul de apelare |
| `40723639875` | numărul de WhatsApp din linkuri (`wa.me/40723639875`) |
| `+40 723 639 875` | numărul de WhatsApp afișat |
| `olizan1@yahoo.com` | e-mail |
| `245/A, 307241 Bulgăruș` | adresa |

Mesajul precompletat trimis pe WhatsApp se schimbă în `data/menu.js`, la `mesaje.general`
și `mesaje.produs` (în al doilea, `{produs}` este înlocuit automat cu numele produsului).

### 4.1 Numărul comenzii

Fiecare comandă trimisă din coșul site-ului primește un număr de ordine pe ziua
respectivă — `01`, `02`, `03`… — care apare în mesajul de WhatsApp, în panoul de
administrare și în istoricul contului clientului. Numerotarea repornește singură
de la `01` la fiecare miezul nopții, după ora României; nu ai nimic de resetat
manual. Comenzile înregistrate înainte de introducerea numerotării se afișează în
continuare cu numărul lor intern din baza de date.

---

## 5. Fotografii

### 5.1 Unde stau imaginile

```
assets/img/
├── logo-olizan.svg          sigla completă (fundal transparent)
├── mark.svg                 doar simbolul
├── favicon.svg              pictograma din fila browserului
├── apple-touch-icon.png     pictograma pentru telefoane
├── og-image.jpg             imaginea afișată la distribuirea pe Facebook
├── meniu/                   fotografiile meniului tipărit
└── art/                     imaginile ilustrative ale preparatelor (`.webp`) și desenele originale (`.svg`)
```

### 5.2 Cum înlocuiești ilustrațiile cu fotografii reale

Imaginile din `assets/img/art/` sunt ilustrații (fișiere `.webp` cu preparate și desene `.svg`),
folosite **până la sesiunea foto**.
Nu sunt și nu trebuie prezentate ca fotografii ale preparatelor noastre.

Ca să pui fotografii adevărate:

1. Pregătește fotografia: format **pătrat** (de ex. 1200 × 1200 px) pentru cardurile de produs
   și **4:3** sau **16:9** pentru scenele mari (cuptor, interior, terasă).
2. Salveaz-o preferabil ca **`.webp`** (fișier mai mic) sau `.jpg`.
3. Pune fișierul în `assets/img/art/`.
4. Schimbă calea în locul unde este folosit:
   * pentru recomandări și pentru categoriile din meniu → în `data/menu.js`, câmpul `imagine`;
   * pentru restul paginilor → caută în fișierul `.html` respectiv linia `<img src="/assets/img/art/...">`
     și înlocuiește numele fișierului.
5. **Actualizează textul `alt`** al imaginii, ca să descrie ce se vede cu adevărat.
   Este important pentru persoanele care folosesc cititoare de ecran și pentru Google.
6. În `galerie.html`, mută fotografiile reale în prima secțiune („Fotografii reale") și
   ajustează nota explicativă, ca vizitatorii să știe ce privesc.

### 5.3 Recomandare privind mărimea fișierelor

Ține fiecare fotografie sub ~300 KB. Un instrument gratuit precum
[squoosh.app](https://squoosh.app/) face conversia în WebP în câteva secunde.

---

## 6. Programul de funcționare și livrarea

Programul, informațiile despre livrare, zonele deservite, comanda minimă, metodele de plată
și alergenii **nu au fost furnizate** și, prin urmare, nu au fost inventate nicăieri în site.

Locurile pregătite pentru ele, marcate cu galben în pagini:

* `locatie.html` — caseta „Programul de funcționare urmează să fie completat…"
* `despre.html` — nota similară
* `termeni-si-conditii.html` — pasajul marcat `<span class="todo">` despre livrare și plată

Când primești informațiile, înlocuiește textul din casetă. Dacă adaugi programul, este util
să îl treci și în datele structurate pentru Google: în `index.html`, în blocul
`<script type="application/ld+json">`, poți adăuga un câmp `openingHoursSpecification`.
**Nu adăuga un program pe care nu îl respecți** — Google îl afișează în rezultatele căutării.

---

## 7. Formularul de contact (Netlify Forms)

Formularul din `contact.html` funcționează prin **Netlify Forms** și este deja activat.

* Mesajele primite se văd în panoul Netlify → **Forms** → formularul `contact`.
* Protecția anti-spam este dublă: un câmp-capcană invizibil (`bot-field`) și verificarea
  făcută de Netlify.
* După trimitere, vizitatorul vede confirmarea direct în pagină; dacă JavaScript este
  dezactivat, este dus la pagina `/mesaj-trimis`.
* Ca să primești mesajele pe e-mail: Netlify → **Forms** → **Form notifications** →
  *Add notification* → *Email notification* → scrie adresa `olizan1@yahoo.com`.

Dacă redenumești formularul, schimbă în același timp atributul `name="contact"` și câmpul
ascuns `<input type="hidden" name="form-name" value="contact">` — trebuie să fie identice.

---

## 8. Cookie-uri și statistici

Bannerul de cookie-uri apare la prima vizită, cu trei opțiuni: *Accept toate*,
*Refuz cookie-urile opționale* și *Personalizează*. Opțiunea se salvează în browserul
vizitatorului, sub cheia `olizan_cookie_consent_v1`.

**Harta Google Maps se încarcă doar după acord.** Până atunci se afișează un chenar cu buton
de activare și un link direct către Google Maps.

Dacă vrei să adaugi un instrument de statistici (de exemplu Google Analytics sau Plausible),
respectă regula: **codul nu trebuie să pornească înainte de acord**. Site-ul are un cârlig
pregătit — adaugă în paginile `.html`, **înainte** de `<script src="/assets/js/site.js" defer></script>`:

```html
<script>
  window.olizanPornesteAnalitice = function () {
    // aici pui codul instrumentului de statistici
  };
</script>
```

Funcția este apelată automat, o singură dată, doar dacă vizitatorul a bifat
„Statistici de trafic". Actualizează apoi și tabelul din `politica-cookie.html`.

---

## 9. Textele legale

Paginile `politica-de-confidentialitate.html`, `politica-cookie.html`,
`protectia-datelor-gdpr.html` și `termeni-si-conditii.html` conțin **numai informații
confirmate** despre societate.

Pasajele evidențiate cu galben (`<span class="todo">…</span>`) sunt lucruri pe care
**trebuie să le completezi sau să le confirmi cu un consultant juridic** înainte de
publicarea oficială:

* perioada exactă de păstrare a mesajelor primite;
* lista completă a furnizorilor care primesc date ale clienților;
* dacă este necesară desemnarea unui responsabil cu protecția datelor (DPO);
* informațiile despre livrare, plată și program din Termeni și condiții.

Data „Ultima actualizare" din capul fiecărei pagini legale se schimbă manual, în fișierul
respectiv, atunci când modifici textul.

### Plăcuțele ANPC și SAL

În subsol sunt trei plăcuțe-text care trimit către paginile oficiale ANPC
(`anpc.ro`, `eservicii.anpc.ro`, `anpc.ro/ce-este-sal/`). Nu au fost folosite imagini
inventate. Dacă vrei plăcuțele grafice oficiale, descarcă-le de pe site-ul ANPC, pune
fișierele în `assets/img/` și înlocuiește în subsolul fiecărei pagini blocul
`<a class="anpc-plate" …>…</a>` cu:

```html
<a href="https://anpc.ro/" target="_blank" rel="noopener noreferrer">
  <img src="/assets/img/anpc-sol.png" alt="ANPC — Autoritatea Națională pentru Protecția Consumatorilor" width="250" height="55" loading="lazy">
</a>
```

Vechea platformă europeană SOL/ODR **nu** a fost inclusă, fiind închisă.

---

## 10. Adresa site-ului (domeniul)

În fișiere apare adresa implicită Netlify:

```
https://magical-tulumba-d275f5.netlify.app
```

Când conectezi un domeniu propriu (de ex. `https://olizan.ro`), înlocuiește această adresă
peste tot cu funcția *Caută și înlocuiește pe tot folderul*. Apare în:

* eticheta `<link rel="canonical">` și în etichetele `og:*` din fiecare pagină `.html`;
* `sitemap.xml`;
* `robots.txt`;
* datele structurate (`application/ld+json`) din `index.html`.

---

## 11. Structura fișierelor

```
.
├── index.html                          Acasă
├── meniu.html                          Meniul cu categorii
├── despre.html                         Despre noi
├── galerie.html                        Galerie
├── locatie.html                        Locație + hartă
├── contact.html                        Contact + formular
├── mesaj-trimis.html                   Confirmare după trimiterea formularului
├── 404.html                            Pagina de eroare
├── politica-de-confidentialitate.html
├── politica-cookie.html
├── protectia-datelor-gdpr.html
├── termeni-si-conditii.html
├── data/menu.js                        ⬅ FIȘIERUL DE EDITAT (produse, prețuri, contact)
├── assets/
│   ├── css/style.css                   aspectul site-ului
│   ├── css/fonts.css                   fonturile găzduite local
│   ├── fonts/                          fișierele de font (.woff2)
│   ├── js/site.js                      comportamentul (meniu, galerie, cookie-uri, formular)
│   └── img/                            sigle, ilustrații, fotografii
├── netlify.toml                        antete de securitate și memorare în cache
├── _headers                            ⚠ GENERAT — politica de securitate (vezi cap. 14)
├── scripts/csp.mjs                     scrie /_headers la fiecare publicare
├── scripts/csp-test.mjs                verifică politica față de tot ce încarcă site-ul
├── robots.txt
└── sitemap.xml
```

---

## 12. Listă de verificare înainte de publicare

- [ ] Butonul de telefon deschide aplicația de apelare cu numărul corect
- [ ] Butoanele WhatsApp deschid conversația cu mesajul precompletat corect
- [ ] Adresa de e-mail deschide programul de e-mail
- [ ] Formularul de contact trimite și mesajul apare în panoul Netlify → Forms
- [ ] Harta se activează după acord și butonul „Deschide traseul" duce la locația corectă
- [ ] Toate cele nouă categorii din meniu se deschid, iar prețurile corespund meniului tipărit
- [ ] Cele patru pagini legale se deschid din subsol
- [ ] Bannerul de cookie-uri apare la prima vizită și reține opțiunea aleasă
- [ ] Site-ul arată bine pe telefon, pe tabletă și pe calculator
- [ ] Diacriticele (ă, â, î, ș, ț) sunt afișate corect peste tot
- [ ] `node scripts/csp-test.mjs` se termină fără nicio problemă (vezi capitolul 14)

---

## 13. Publicare

Depozitul este conectat la Netlify. Site-ul se publică automat la fiecare modificare
salvată în ramura principală. Nu există un pas de compilare: înainte de publicare
rulează doar două scripturi scurte, care marchează versiunea aplicației instalabile
în `sw.js` și rescriu politica de securitate din `/_headers` (vezi capitolul 14).

---

## 14. Politica de securitate a conținutului (CSP)

Site-ul trimite browserului o listă cu locurile din care are voie să încarce ceva.
Dacă o pagină ar fi vreodată modificată de altcineva — printr-un cont compromis, un
text introdus într-un formular, o extensie de browser — codul străin pur și simplu
nu pornește: browserul îl refuză înainte să apuce să fure date de card, comenzi sau
parole. Este ultima plasă de siguranță, sub validările din server.

**Nu se scrie de mână.** Antetul stă în fișierul `/_headers`, care este generat la
fiecare publicare de `scripts/csp.mjs`, din paginile reale. Motivul: politica nu
acceptă cod inline la întâmplare, ci doar bucățile de cod cunoscute din paginile
site-ului, fiecare identificată printr-o amprentă (SHA-256) a conținutului ei.
Amprenta se schimbă la orice modificare, fie ea și un spațiu.

### Ce este permis

| Ce încarcă pagina | De unde are voie |
| --- | --- |
| Scripturi | doar de pe acest domeniu, plus codul scris în pagini (prin amprentă) |
| Stiluri | doar de pe acest domeniu; atributele `style=` din pagini rămân permise |
| Imagini | de pe acest domeniu (inclusiv fotografiile din panoul de administrare, servite din `/media/`) și imaginile scrise direct în foaia de stil |
| Fonturi | doar din `/assets/fonts` |
| Cereri de rețea | doar către acest domeniu (meniu, comenzi, cont, administrare) |
| Cadre încorporate | doar harta Google din pagina de locație |
| Formulare | trimit datele doar către acest domeniu |
| Restul | interzis (`<object>`, `<embed>`, atribute `onclick=`, `eval()`) |

Legăturile obișnuite nu sunt atinse de politică: WhatsApp, Facebook, ANPC și butonul
„Deschide traseul în Google Maps" funcționează neschimbat, pentru că duc vizitatorul
pe alt site, nu încarcă nimic în pagina noastră.

### Comenzi

```bash
node scripts/csp.mjs             # rescrie /_headers din paginile actuale
node scripts/csp.mjs --verifica  # spune doar dacă fișierul din depozit este la zi
node scripts/csp-test.mjs        # trece toate paginile prin politică și raportează ce ar fi blocat
```

### Când trebuie să intervii

- **Ai adăugat un serviciu extern** (statistici, un chat, un video de pe YouTube, o
  hartă de la alt furnizor): adaugă adresa lui în lista din `scripts/csp.mjs`, la
  directiva potrivită, altfel browserul îl blochează fără niciun mesaj vizibil.
- **Ai scris cod nou direct într-o pagină**: nu ai nimic de făcut la publicare —
  amprenta se calculează automat. Local însă, rulează `node scripts/csp.mjs`, altfel
  `/_headers` rămâne în urmă.
- **Ceva a dispărut din pagină după o modificare**: deschide consola browserului
  (F12). Un mesaj care începe cu „Refused to load…" arată exact resursa blocată și
  directiva care a refuzat-o.
