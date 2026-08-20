/* ==========================================================================
   OLIZAN Restaurant & Pizzeria — fișierul cu date editabile
   --------------------------------------------------------------------------
   ACESTA ESTE SINGURUL FIȘIER PE CARE TREBUIE SĂ ÎL MODIFICI pentru:
     • produse, ingrediente, gramaje, prețuri și fotografii
     • datele de contact (telefon, WhatsApp, e-mail, adresă, Facebook)
     • recomandările casei de pe prima pagină

   Reguli simple:
     1. Fiecare produs se scrie între acolade { }, separate prin virgulă.
     2. Textele se scriu între ghilimele duble "...".
     3. Prețurile se scriu ca NUMERE, fără ghilimele și cu punct zecimal:
        35 sau 1.5 (pe site vor apărea automat ca „35,00 lei" și „1,50 lei").
     4. Pentru pizza, "pret" = mărimea normală (33 cm),
        iar "pretMare" = mărimea family (50 cm).
     5. "id" trebuie să fie unic — el leagă produsul de fotografia lui
        din /assets/img/produse/ și de coșul de cumpărături.
     6. Nu șterge virgulele și acoladele — altfel meniul nu se mai afișează.
   După orice modificare, salvează fișierul și reîncarcă pagina (Ctrl+F5).

   Ingredientele sunt preluate exact din meniul tipărit OLIZAN
   (fotografiile din /assets/img/meniu/).
   ========================================================================== */

window.OLIZAN = {

  /* ---------------------------------------------------------------- CONTACT */
  contact: {
    numeComercial: "OLIZAN Restaurant & Pizzeria",
    firma: "OLIZAN FOOD&AGRO S.R.L.",
    cui: "43808540",
    adresa: "245/A, 307241 Bulgăruș, județul Timiș",
    reper: "vizavi de Biserica Catolică",
    telefon: "+40 720 409 320",
    telefonLink: "tel:+40720409320",
    whatsapp: "40723639875",
    whatsappAfisat: "+40 723 639 875",
    email: "olizan1@yahoo.com",
    facebook: "https://www.facebook.com/byOliviaZan",
    maps: "https://www.google.com/maps/place//data=!4m2!3m1!1s0x47451bbc4e1e6c1f:0x454e48f3946a813?sa=X&ved=1t:8290&ictx=111"
  },

  /* ------------------------------------------------- MESAJE PENTRU WHATSAPP */
  /* {produs} este înlocuit automat cu numele produsului comandat.            */
  mesaje: {
    general: "Bună ziua! Doresc să plasez o comandă la OLIZAN Restaurant & Pizzeria.",
    produs: "Bună ziua! Doresc să comand {produs}.",
    comandaSalut: "Bună ziua! Doresc să plasez următoarea comandă la OLIZAN Restaurant & Pizzeria:",
    comandaFinal: "Vă rog să-mi confirmați comanda și timpul estimat de pregătire. Mulțumesc!",
    livrareNota: "Disponibilitatea și costul livrării se confirmă prin WhatsApp.",
    notaFoto: "Fotografiile produselor sunt ilustrative."
  },

  /* --------------------------------------------------- MĂRIMILE PENTRU PIZZA
     "camp" arată din ce preț al produsului se ia valoarea.                   */
  marimiPizza: [
    { cod: "33", eticheta: "Normală 33 cm", scurt: "33 cm", camp: "pret" },
    { cod: "50", eticheta: "Family 50 cm", scurt: "50 cm", camp: "pretMare" }
  ],

  /* ------------------------------------------------ COSTUL AMBALAJULUI
     Produsele care pleacă ambalate primesc automat taxa de mai jos. Ea se
     adaugă separat în coș („Ambalaj: 3,00 lei"), nu se ascunde în prețul
     produsului, și se înmulțește cu numărul de bucăți.

     "categorii" — cheia este id-ul categoriei din meniul de mai jos
       (ex. "burgeri"), iar valoarea este:
         • un număr — aceeași taxă pentru toată categoria, sau
         • o listă pe mărimi de pizza — { "33": 3, "50": 5 }.
     "produse" — taxa pentru un singur produs; are prioritate față de categorie.

     O categorie care NU apare aici nu primește nicio taxă (ex. băuturile de
     la bar, care se dau la sticlă). Ca să scutești un singur produs dintr-o
     categorie taxată, treci-l în "produse" cu valoarea 0.

     IMPORTANT: aceleași sume sunt scrise și în netlify/lib/ambalaj.mts,
     de unde le recalculează serverul la înregistrarea comenzii. Dacă
     schimbi un preț aici, schimbă-l și acolo.                              */
  ambalaje: {
    eticheta: "Ambalaj",
    categorii: {
      pizza: { "33": 3, "50": 5 },
      burgeri: 3,
      paste: 2,
      deserturi: 2,
      sosuri: 1
    },
    produse: {
      "sos-de-ciuperci": 1
    }
  },

  /* ------------------------------------------- RECOMANDĂRILE CASEI (5 card-uri)
     "produs" = id-ul produsului din meniu, ca butonul să adauge direct în coș. */
  recomandari: [
    {
      eticheta: "Pizza",
      nume: "Pizza Quattro Stagioni",
      desc: "Mozzarella, sos roșii, salam, prosciutto, ciuperci, gogoșari, măsline — pe blat copt la comandă.",
      produs: "pizza-quattro-stagioni",
      imagine: "/assets/img/produse/pizza-quattro-stagioni.webp"
    },
    {
      eticheta: "Burger",
      nume: "Burger Vită",
      desc: "Chiflă, carne vită Angus, sos burger, bacon, brânză cheddar, ceapă roșie, salată, cartofi prăjiți.",
      produs: "burger-vita",
      imagine: "/assets/img/produse/burger-vita.webp"
    },
    {
      eticheta: "Zilnic",
      nume: "Meniul zilei",
      desc: "Ciorbă plus felul 2, pregătite proaspăt în bucătăria noastră. Sună-ne pentru preparatul de azi.",
      produs: "meniul-zilei",
      imagine: "/assets/img/produse/meniul-zilei.webp"
    },
    {
      eticheta: "Desert",
      nume: "Papanași",
      desc: "Desertul românesc pe care nu îl refuză nimeni — pufoși, cu smântână și dulceață.",
      produs: "papanasi",
      imagine: "/assets/img/produse/papanasi.webp"
    },
    {
      eticheta: "Băutură",
      nume: "Limonadă",
      desc: "Răcoritoare, 400 ml. Perfectă alături de o pizza abia scoasă din cuptor.",
      produs: "limonada",
      imagine: "/assets/img/produse/limonada.webp"
    }
  ],

  /* ------------------------------------------------------------------ MENIU
     Fiecare categorie are: id (folosit în adresa paginii, ex. /meniu#burgeri),
     tab (textul de pe buton), titlu, nota (text scurt), imagine (ilustrație)
     și una sau mai multe "grupe" cu produse.                                */
  meniu: [
    {
      id: "pizza",
      tab: "Pizza",
      titlu: "Pizza",
      nota: "Blat pregătit în casă și copt la comandă. Toate pizzele sunt disponibile în două mărimi: normală 33 cm și family 50 cm.",
      imagine: "/assets/img/art/pizza.svg",
      grupe: [
        {
          prefixComanda: "Pizza ",
          cuMarimi: true,
          produse: [
            { id: "pizza-margherita", nume: "Margherita", ing: "mozzarella, sos de roșii", pret: 30, pretMare: 65, imagine: "/assets/img/produse/pizza-margherita.webp" },
            { id: "pizza-prosciutto", nume: "Prosciutto", ing: "mozzarella, sos de roșii, prosciutto", pret: 32, pretMare: 73, imagine: "/assets/img/produse/pizza-prosciutto.webp" },
            { id: "pizza-salami", nume: "Salami", ing: "mozzarella, sos de roșii, salam", pret: 32, pretMare: 73, imagine: "/assets/img/produse/pizza-salami.webp" },
            { id: "pizza-diavola", nume: "Diavola", ing: "mozzarella, sos de roșii, salam picant, ardei iute", pret: 35, pretMare: 75, imagine: "/assets/img/produse/pizza-diavola.webp" },
            { id: "pizza-quattro-stagioni", nume: "Quattro Stagioni", ing: "mozzarella, sos roșii, salam, prosciutto, ciuperci, gogoșari, măsline", pret: 35, pretMare: 75, imagine: "/assets/img/produse/pizza-quattro-stagioni.webp" },
            { id: "pizza-capriciosa", nume: "Capriciosa", ing: "mozzarella, sos de roșii, prosciutto, carciofi/anghinare, măsline felii", pret: 37, pretMare: 78, imagine: "/assets/img/produse/pizza-capriciosa.webp" },
            { id: "pizza-salami-funghi", nume: "Salami Funghi", ing: "mozzarella, sos de roșii, salam, ciuperci", pret: 35, pretMare: 75, imagine: "/assets/img/produse/pizza-salami-funghi.webp" },
            { id: "pizza-prosciutto-funghi", nume: "Prosciutto Funghi", ing: "mozzarella, sos de roșii, prosciutto, ciuperci, măsline", pret: 35, pretMare: 75, imagine: "/assets/img/produse/pizza-prosciutto-funghi.webp" },
            { id: "pizza-polo", nume: "Polo", ing: "mozzarella, sos de roșii, ciuperci, piept de pui", pret: 38, pretMare: 80, imagine: "/assets/img/produse/pizza-polo.webp" },
            { id: "pizza-tonno", nume: "Tonno", ing: "mozzarella, sos de roșii, ceapă roșie, ton", pret: 38, pretMare: 80, imagine: "/assets/img/produse/pizza-tonno.webp" },
            { id: "pizza-rustica", nume: "Rustica", ing: "mozzarella, sos de roșii, prosciutto, salam, cârnat, ciuperci, ceapă roșie, gogoșar, porumb, ou, măsline", pret: 40, pretMare: 83, imagine: "/assets/img/produse/pizza-rustica.webp" },
            { id: "pizza-quattro-formaggi", nume: "Quattro Formaggi", ing: "mozzarella, sos roșii, emmentaler, gorgonzola, parmezan", pret: 40, pretMare: 83, imagine: "/assets/img/produse/pizza-quattro-formaggi.webp" },
            { id: "pizza-quattro-formaggi-salamino", nume: "Quattro Formaggi Salamino", ing: "mozzarella, sos roșii, emmentaler, gorgonzola, parmezan, salam picant", pret: 45, pretMare: 86, imagine: "/assets/img/produse/pizza-quattro-formaggi-salamino.webp" },
            { id: "pizza-prosciutto-crudo-rucola", nume: "Prosciutto Crudo Rucola", ing: "mozzarella, sos de roșii, șuncă afumată, rucola, parmezan, roșii cherry", pret: 45, pretMare: 86, imagine: "/assets/img/produse/pizza-prosciutto-crudo-rucola.webp" },
            { id: "pizza-hawaii", nume: "Hawaii", ing: "mozzarella, sos de roșii, prosciutto, ananas", pret: 35, pretMare: 75, imagine: "/assets/img/produse/pizza-hawaii.webp" },
            { id: "pizza-vegetariana", nume: "Vegetariană", ing: "mozzarella, sos de roșii, ciuperci, gogoșar, porumb, măsline, capere, ceapă roșie", pret: 35, pretMare: 75, imagine: "/assets/img/produse/pizza-vegetariana.webp" },
            { id: "pizza-fructe-de-mare", nume: "Fructe de mare", ing: "mozzarella, sos de roșii, mix fructe de mare", pret: 50, pretMare: 100, imagine: "/assets/img/produse/pizza-fructe-de-mare.webp" }
          ]
        }
      ]
    },

    {
      id: "paste",
      tab: "Paste",
      titlu: "Paste",
      nota: "Paste proaspete, preparate zilnic în porții generoase.",
      imagine: "/assets/img/art/paste.svg",
      grupe: [
        {
          produse: [
            { id: "paste-carbonara", nume: "Carbonara", ing: "guanciale, ou, piper, parmezan", gramaj: "400 g", pret: 45, imagine: "" },
            { id: "paste-arrabbiata", nume: "Arrabbiata", ing: "sos roșii, ardei iute, usturoi", gramaj: "400 g", pret: 30, imagine: "" },
            { id: "paste-aglio-olio-peperoncino", nume: "Aglio-Olio-Peperoncino", ing: "usturoi, ardei iute, ulei, pătrunjel", gramaj: "400 g", pret: 30, imagine: "" },
            { id: "paste-pesto", nume: "Pesto", ing: "sos pesto, busuioc, parmezan", gramaj: "400 g", pret: 35, imagine: "" },
            { id: "paste-bolognese", nume: "Bolognese", ing: "sos Bolognez, pătrunjel, parmezan", gramaj: "400 g", pret: 45, imagine: "" },
            { id: "paste-quattro-formaggi", nume: "Quattro Formaggi", ing: "gorgonzola, parmezan, ementaller, taleggio", gramaj: "400 g", pret: 45, imagine: "" },
            { id: "paste-cu-creveti", nume: "Paste cu creveți", ing: "creveți, vin alb, pătrunjel, ulei măsline", gramaj: "400 g", pret: 60, imagine: "" },
            { id: "paste-cu-fructe-de-mare", nume: "Paste cu Fructe de Mare", ing: "mix fructe de mare, vin alb, pătrunjel, ulei măsline", gramaj: "450 g", pret: 70, imagine: "" },
            { id: "paste-cu-vongole", nume: "Paste cu Vongole", ing: "scoici, vin alb, pătrunjel, ulei măsline", gramaj: "500 g", pret: 60, imagine: "" },
            { id: "taitei-de-orez-cu-crispy", nume: "Teiței de orez cu Crispy", ing: "teiței orez, legume, sos soia, piept pui, sos dulce-acrișor", gramaj: "400 g", pret: 50, imagine: "" }
          ]
        }
      ]
    },

    {
      id: "meniuri",
      tab: "Meniuri",
      titlu: "Meniuri",
      nota: "Meniuri complete, pregătite pentru pauza de prânz sau pentru o masă rapidă.",
      imagine: "/assets/img/art/gratar.svg",
      grupe: [
        {
          produse: [
            { id: "meniu-crispy", nume: "Meniu Crispy", ing: "4 buc. piept pui Crispy, cartofi pai, sos usturoi", pret: 40, imagine: "/assets/img/produse/meniu-crispy.webp" },
            { id: "meniu-aripioare", nume: "Meniu Aripioare", ing: "5 buc. aripioare pui, cartofi pai, sos usturoi", pret: 40, imagine: "/assets/img/produse/meniu-aripioare.webp" },
            { id: "meniul-zilei", nume: "Meniul zilei", ing: "ciorbă + felul 2", pret: 35, imagine: "/assets/img/produse/meniul-zilei.webp" }
          ]
        }
      ]
    },

    {
      id: "burgeri",
      tab: "Burgeri",
      titlu: "Burgeri",
      nota: "Burgeri pregătiți la comandă, cu chiflă clasică sau neagră. Toți se servesc cu cartofi prăjiți.",
      imagine: "/assets/img/art/burger.svg",
      grupe: [
        {
          produse: [
            { id: "burger-pui", nume: "Burger Pui", ing: "chiflă, carne pui, sos burger, bacon, brânză cheddar, ceapă roșie, salată, cartofi prăjiți", pret: 35, imagine: "/assets/img/produse/burger-pui.webp" },
            { id: "burger-vita", nume: "Burger Vită", ing: "chiflă, carne vită Angus, sos burger, bacon, brânză cheddar, ceapă roșie, salată, cartofi prăjiți", pret: 45, imagine: "/assets/img/produse/burger-vita.webp" },
            { id: "burger-crispy", nume: "Burger Crispy", ing: "chiflă, carne pui Crispy, sos burger, bacon, brânză cheddar, ceapă roșie, salată, cartofi prăjiți", pret: 38, imagine: "/assets/img/produse/burger-crispy.webp" },
            { id: "black-burger-vita", nume: "Black Burger Vită", ing: "chiflă neagră, carne vită Angus, sos burger, bacon, brânză cheddar, ceapă roșie, salată, cartofi prăjiți", pret: 48, imagine: "/assets/img/produse/black-burger-vita.webp" },
            { id: "black-burger-pui", nume: "Black Burger Pui", ing: "chiflă neagră, carne pui, sos burger, bacon, brânză cheddar, ceapă roșie, salată, cartofi prăjiți", pret: 40, imagine: "/assets/img/produse/black-burger-pui.webp" },
            { id: "black-burger-crispy", nume: "Black Burger Crispy", ing: "chiflă neagră, carne pui Crispy, sos burger, bacon, brânză cheddar, ceapă roșie, salată, cartofi prăjiți", pret: 40, imagine: "/assets/img/produse/black-burger-crispy.webp" }
          ]
        }
      ]
    },

    {
      id: "ciorbe",
      tab: "Ciorbe",
      titlu: "Ciorbe",
      nota: "Porție de 500 g, servită caldă.",
      imagine: "/assets/img/art/ciorba.svg",
      grupe: [
        {
          produse: [
            { id: "ciorba-de-burta", nume: "Ciorbă de burtă", gramaj: "500 g", pret: 25, imagine: "/assets/img/produse/ciorba-de-burta.webp" },
            { id: "ciorba-pui-a-la-grec", nume: "Ciorbă de pui à la grec", gramaj: "500 g", pret: 25, imagine: "/assets/img/produse/ciorba-pui-a-la-grec.webp" },
            { id: "ciorba-radauteana", nume: "Ciorbă rădăuțeană", gramaj: "500 g", pret: 25, imagine: "/assets/img/produse/ciorba-radauteana.webp" }
          ]
        },
        {
          titlu: "Adaosuri",
          produse: [
            { id: "smantana", nume: "Smântână", pret: 5, imagine: "/assets/img/produse/smantana.webp" },
            { id: "ardei-iute", nume: "Ardei iute", pret: 2, imagine: "/assets/img/produse/ardei-iute.webp" },
            { id: "paine", nume: "Pâine", pret: 1.5, imagine: "/assets/img/produse/paine.webp" }
          ]
        }
      ]
    },

    {
      id: "gratare",
      tab: "Grătare",
      titlu: "Grătare",
      nota: "Preparate la grătar, alături de garnitura preferată.",
      imagine: "/assets/img/categorii/gratare-garnituri-thumb.webp",
      grupe: [
        {
          produse: [
            { id: "ceafa-de-porc", nume: "Ceafă de porc la grătar", pret: 35, imagine: "/assets/img/produse/ceafa-de-porc.webp" },
            { id: "piept-de-pui", nume: "Piept de pui la grătar", pret: 35, imagine: "/assets/img/produse/piept-de-pui.webp" },
            { id: "pulpa-pui-dezosata", nume: "Pulpă pui dezosată", pret: 35, imagine: "/assets/img/produse/pulpa-pui-dezosata.webp" }
          ]
        }
      ]
    },

    {
      id: "garnituri",
      tab: "Garnituri",
      titlu: "Garnituri",
      nota: "Se comandă alături de preparatele la grătar sau separat.",
      imagine: "/assets/img/categorii/garnituri-thumb.webp",
      grupe: [
        {
          produse: [
            { id: "risotto", nume: "Risotto", ing: "orez, parmezan, unt, vin alb", gramaj: "380 g", pret: 40, imagine: "/assets/img/produse/risotto.webp" },
            { id: "sos-de-ciuperci", nume: "Sos de ciuperci cu smântână", gramaj: "350 g", pret: 35, imagine: "/assets/img/produse/sos-de-ciuperci.webp" },
            { id: "legume-la-gratar", nume: "Legume la grătar", gramaj: "200 g", pret: 15, imagine: "/assets/img/produse/legume-la-gratar.webp" },
            { id: "cartofi-natur", nume: "Cartofi natur", gramaj: "200 g", pret: 15, imagine: "/assets/img/produse/cartofi-natur.webp" },
            { id: "cartofi-wedges", nume: "Cartofi wedges", gramaj: "200 g", pret: 15, imagine: "/assets/img/produse/cartofi-wedges.webp" },
            { id: "cartofi-pai", nume: "Cartofi pai", gramaj: "150 g", pret: 15, imagine: "/assets/img/produse/cartofi-pai.webp" }
          ]
        }
      ]
    },

    {
      id: "salate",
      tab: "Salate",
      titlu: "Salate",
      nota: "Salate proaspete, pregătite la comandă.",
      imagine: "/assets/img/categorii/salate-proaspete-thumb.webp",
      grupe: [
        {
          produse: [
            { id: "salata-asortata", nume: "Salată asortată", ing: "roșii, castraveți, ceapă, ardei", gramaj: "250 g", pret: 13, imagine: "/assets/img/produse/salata-asortata.webp" },
            { id: "salata-varza", nume: "Salată varză", gramaj: "200 g", pret: 13, imagine: "/assets/img/produse/salata-varza.webp" },
            { id: "salata-rosii", nume: "Salată roșii", gramaj: "200 g", pret: 13, imagine: "/assets/img/produse/salata-rosii.webp" },
            { id: "salata-verde", nume: "Salată verde", gramaj: "120 g", pret: 13, imagine: "/assets/img/produse/salata-verde.webp" },
            { id: "ardei-copti", nume: "Ardei copți", gramaj: "150 g", pret: 13, imagine: "/assets/img/produse/ardei-copti.webp" },
            { id: "salata-cu-crispy", nume: "Salată cu crispy", ing: "salată iceberg, roșii, castraveți, feta, dressing, piept pui", pret: 50, imagine: "/assets/img/produse/salata-cu-crispy.webp" },
            { id: "salata-cu-ton", nume: "Salată cu ton", ing: "salată iceberg, ceapă roșie, porumb, lămâie", pret: 50, imagine: "/assets/img/produse/salata-cu-ton.webp" }
          ]
        }
      ]
    },

    {
      id: "bar",
      tab: "Bar",
      titlu: "Bar",
      nota: "Cafea, băuturi răcoritoare și bere.",
      imagine: "/assets/img/categorii/bar-thumb.webp",
      grupe: [
        {
          titlu: "Băuturi calde",
          produse: [
            { id: "espresso-scurt", nume: "Cafea expresso scurt", gramaj: "30 ml", pret: 10, imagine: "/assets/img/produse/espresso-scurt.webp" },
            { id: "espresso-lung", nume: "Cafea expresso lung", gramaj: "60 ml", pret: 10, imagine: "/assets/img/produse/espresso-lung.webp" },
            { id: "cafea-lunga", nume: "Cafea lungă", gramaj: "100 ml", pret: 10, imagine: "/assets/img/produse/cafea-lunga.webp" },
            { id: "cappuccino", nume: "Cappuccino", gramaj: "150 ml", pret: 10, imagine: "/assets/img/produse/cappuccino.webp" },
            { id: "latte-macchiato", nume: "Latte Macchiato", gramaj: "150 ml", pret: 15, imagine: "/assets/img/produse/latte-macchiato.webp" },
            { id: "ceai", nume: "Ceai", ing: "mentă, fructe de pădure, negru", pret: 8, imagine: "/assets/img/produse/ceai.webp" },
            { id: "ciocolata-calda", nume: "Ciocolată caldă", gramaj: "150 ml", pret: 15, imagine: "/assets/img/produse/ciocolata-calda.webp" }
          ]
        },
        {
          titlu: "Cafea la gheață, limonadă și fresh",
          produse: [
            { id: "cafe-frappe", nume: "Café Frappé", gramaj: "300 ml", pret: 20, imagine: "/assets/img/produse/cafe-frappe.webp" },
            { id: "ice-caffe", nume: "Ice Caffè", gramaj: "300 ml", pret: 15, imagine: "/assets/img/produse/ice-caffe.webp" },
            { id: "limonada", nume: "Limonadă", gramaj: "400 ml", pret: 15, imagine: "/assets/img/produse/limonada.webp" },
            { id: "fresh-portocale", nume: "Fresh portocale", gramaj: "250 ml", pret: 20, imagine: "/assets/img/produse/fresh-portocale.webp" }
          ]
        },
        {
          titlu: "Răcoritoare, apă și bere",
          produse: [
            { id: "coca-cola", nume: "Coca Cola", gramaj: "250 ml", pret: 10, imagine: "/assets/img/produse/coca-cola.webp" },
            { id: "coca-cola-zero", nume: "Coca Cola Zero", gramaj: "250 ml", pret: 10, imagine: "/assets/img/produse/coca-cola-zero.webp" },
            { id: "pepsi", nume: "Pepsi Cola", gramaj: "250 ml", pret: 10, imagine: "/assets/img/produse/pepsi.webp" },
            { id: "fanta", nume: "Fanta", ing: "portocale, lemon, struguri", gramaj: "250 ml", pret: 10, imagine: "/assets/img/produse/fanta.webp" },
            { id: "sprite", nume: "Sprite", gramaj: "250 ml", pret: 10, imagine: "/assets/img/produse/sprite.webp" },
            { id: "schweppes", nume: "Schweppes", ing: "kinley, mandarine, bitter lemon", gramaj: "250 ml", pret: 12, imagine: "/assets/img/produse/schweppes.webp" },
            { id: "cappy", nume: "Cappy", ing: "pere, piersici, portocale", gramaj: "250 ml", pret: 12, imagine: "/assets/img/produse/cappy.webp" },
            { id: "fuzetea", nume: "Fuzetea", ing: "lămâie, piersică", gramaj: "250 ml", pret: 12, imagine: "/assets/img/produse/fuzetea.webp" },
            { id: "apa-330", nume: "Apă minerală/plată sticlă", gramaj: "330 ml", pret: 10, imagine: "/assets/img/produse/apa-330.webp" },
            { id: "apa-750", nume: "Apă minerală/plată sticlă", gramaj: "750 ml", pret: 15, imagine: "/assets/img/produse/apa-750.webp" },
            { id: "bere", nume: "Bere Peroni/Stella Artois sticlă", gramaj: "0,33 l", pret: 12, imagine: "/assets/img/produse/bere.webp" }
          ]
        }
      ]
    },

    {
      id: "deserturi",
      tab: "Deserturi",
      titlu: "Desert",
      nota: "Final dulce pentru masa ta.",
      imagine: "/assets/img/art/desert.svg",
      grupe: [
        {
          produse: [
            { id: "amandina", nume: "Amandină", pret: 12, imagine: "/assets/img/produse/amandina.webp" },
            { id: "savarina", nume: "Savarină", pret: 20, imagine: "/assets/img/produse/savarina.webp" },
            { id: "rulada-pavlova", nume: "Ruladă Pavlova", pret: 15, imagine: "/assets/img/produse/rulada-pavlova.webp" },
            { id: "tiramisu", nume: "Tiramisu", pret: 20, imagine: "/assets/img/produse/tiramisu.webp" },
            { id: "cheesecake", nume: "Cheesecake", pret: 20, imagine: "/assets/img/produse/cheesecake.webp" },
            { id: "papanasi", nume: "Papanași", pret: 20, imagine: "/assets/img/produse/papanasi.webp" },
            { id: "lava-cake", nume: "Lava cake", pret: 20, imagine: "/assets/img/produse/lava-cake.webp" },
            { id: "cupa-inghetata", nume: "Cupă înghețată", pret: 12, imagine: "/assets/img/produse/cupa-inghetata.webp" }
          ]
        }
      ]
    },

    {
      id: "sosuri",
      tab: "Sosuri",
      titlu: "Sosuri",
      nota: "Sosuri la porție, pregătite în casă. Se comandă alături de orice preparat sau separat.",
      imagine: "/assets/img/art/sos.svg",
      grupe: [
        {
          produse: [
            { id: "sos-smantana-usturoi", nume: "Sos smântână cu usturoi", pret: 6, imagine: "/assets/img/produse/sos-smantana-usturoi.svg" },
            { id: "sos-maioneza-usturoi", nume: "Sos maioneză cu usturoi", pret: 5, imagine: "/assets/img/produse/sos-maioneza-usturoi.svg" },
            { id: "sos-rosii-dulce", nume: "Sos roșii dulce", pret: 5, imagine: "/assets/img/produse/sos-rosii-dulce.svg" },
            { id: "sos-pikant", nume: "Sos pikant", pret: 5, imagine: "/assets/img/produse/sos-pikant.svg" },
            { id: "sos-barbeque", nume: "Sos barbeque", pret: 7, imagine: "/assets/img/produse/sos-barbeque.svg" }
          ]
        }
      ]
    }
  ]
};

/* ---- CREDITE FOTO -------------------------------------------------------
   Autorul și licența fiecărei fotografii de produs. Textul apare în fereastra
   mărită a imaginii. Majoritatea fotografiilor provin de pe Wikimedia Commons;
   cele proprii sunt creditate „OLIZAN".
   ------------------------------------------------------------------------ */
window.OLIZAN.credite = {
  "pizza-margherita": "OLIZAN",
  "pizza-prosciutto": "jeffreyw · CC BY 2.0 · Wikimedia Commons",
  "pizza-salami": "Benoît Prieur · CC0 · Wikimedia Commons",
  "pizza-diavola": "掬茶 · CC BY-SA 4.0 · Wikimedia Commons",
  "pizza-quattro-stagioni": "Ryan Snyder · CC BY 2.0 · Wikimedia Commons",
  "pizza-capriciosa": "Gerda Arendt · CC BY-SA 4.0 · Wikimedia Commons",
  "pizza-salami-funghi": "Scott Bauer · Public domain · Wikimedia Commons",
  "pizza-prosciutto-funghi": "Gerda Arendt · CC BY-SA 4.0 · Wikimedia Commons",
  "pizza-polo": "jeffreyw · CC BY 2.0 · Wikimedia Commons",
  "pizza-tonno": "Nenad Stojkovic from Srbija · CC BY 2.0 · Wikimedia Commons",
  "pizza-rustica": "Bernard DUPONT · CC BY-SA 4.0 · Wikimedia Commons",
  "pizza-quattro-formaggi": "Shreya13jain · CC BY-SA 4.0 · Wikimedia Commons",
  "pizza-quattro-formaggi-salamino": "JIP · CC BY-SA 4.0 · Wikimedia Commons",
  "pizza-prosciutto-crudo-rucola": "Arnold Gatilao from Oakland, CA, USA · CC BY 2.0 · Wikimedia Commons",
  "pizza-hawaii": "ノボホショコロトソ · CC BY 4.0 · Wikimedia Commons",
  "pizza-vegetariana": "Petar Milošević · CC BY-SA 4.0 · Wikimedia Commons",
  "pizza-fructe-de-mare": "japan_style from Tokyo, JAPAN · CC BY 2.0 · Wikimedia Commons",
  "meniu-crispy": "Horacio Cambeiro · CC BY-SA 3.0 · Wikimedia Commons",
  "meniu-aripioare": "GHMWNA 2228 · CC BY-SA 4.0 · Wikimedia Commons",
  "meniul-zilei": "HaJunkiyada · CC BY-SA 4.0 · Wikimedia Commons",
  "burger-pui": "Siddhantsahni28 · CC BY-SA 4.0 · Wikimedia Commons",
  "burger-vita": "Missvain · CC BY 4.0 · Wikimedia Commons",
  "burger-crispy": "Supardisahabu · CC BY-SA 4.0 · Wikimedia Commons",
  "black-burger-vita": "MattCC716 · CC BY-SA 2.0 · Wikimedia Commons",
  "black-burger-pui": "Horacio Cambeiro · CC BY-SA 3.0 · Wikimedia Commons",
  "black-burger-crispy": "Tokumeigakarinoaoshima · CC BY-SA 4.0 · Wikimedia Commons",
  "ciorba-de-burta": "Sacha47 · CC BY-SA 4.0 · Wikimedia Commons",
  "ciorba-pui-a-la-grec": "Sacha47 · CC BY-SA 4.0 · Wikimedia Commons",
  "ciorba-radauteana": "Romaniancook · CC BY-SA 4.0 · Wikimedia Commons",
  "smantana": "Patafisik · CC BY-SA 4.0 · Wikimedia Commons",
  "ardei-iute": "Suyash.dwivedi · CC BY-SA 4.0 · Wikimedia Commons",
  "paine": "www.Pixel.la Free Stock Photos · CC0 · Wikimedia Commons",
  "ceafa-de-porc": "Silar · CC BY-SA 4.0 · Wikimedia Commons",
  "piept-de-pui": "Marwan · CC BY-SA 4.0 · Wikimedia Commons",
  "pulpa-pui-dezosata": "CharmaineZoe's Marvelous Melange from England · CC BY 2.0 · Wikimedia Commons",
  "risotto": "Kolforn (Kolforn) I'd appreciate if you could mail me (Kolforn@gmail.com) if you · CC BY-SA 4.0 · Wikimedia Commons",
  "sos-de-ciuperci": "Naotake Murayama from San Francisco, CA, USA · CC BY 2.0 · Wikimedia Commons",
  "legume-la-gratar": "liz west from Boxborough, MA · CC BY 2.0 · Wikimedia Commons",
  "cartofi-natur": "Benreis · CC BY-SA 4.0 · Wikimedia Commons",
  "cartofi-wedges": "Raj1818913 · CC BY-SA 4.0 · Wikimedia Commons",
  "cartofi-pai": "JIP · CC BY-SA 4.0 · Wikimedia Commons",
  "salata-asortata": "Chonova at Bulgarian Wikipedia · CC BY-SA 3.0 · Wikimedia Commons",
  "salata-varza": "autor necunoscut · CC BY-SA 2.0 · Wikimedia Commons",
  "salata-rosii": "Karl Gruber · CC BY-SA 4.0 · Wikimedia Commons",
  "salata-verde": "Shixart1985 · CC BY 2.0 · Wikimedia Commons",
  "ardei-copti": "Juan Emilio Prades Bel · CC BY-SA 4.0 · Wikimedia Commons",
  "salata-cu-crispy": "pattyonflickr · CC BY 2.0 · Wikimedia Commons",
  "salata-cu-ton": "Daderot · CC0 · Wikimedia Commons",
  "espresso-scurt": "Kritzolina · CC BY-SA 4.0 · Wikimedia Commons",
  "espresso-lung": "Weetjesman · CC BY-SA 3.0 · Wikimedia Commons",
  "cafea-lunga": "Dennis Wong from Hong Kong, Hong Kong · CC BY 2.0 · Wikimedia Commons",
  "cappuccino": "Ioacc1234red · CC BY-SA 4.0 · Wikimedia Commons",
  "latte-macchiato": "א (Aleph) · CC BY-SA 2.5 · Wikimedia Commons",
  "ceai": "Douglas P Perkins · CC BY 3.0 · Wikimedia Commons",
  "ciocolata-calda": "Bahnfrend · CC BY-SA 4.0 · Wikimedia Commons",
  "cafe-frappe": "autor necunoscut · CC BY-SA 3.0 · Wikimedia Commons",
  "ice-caffe": "Tony Webster · CC BY 2.0 · Wikimedia Commons",
  "limonada": "Kristina M M kristinam · CC0 · Wikimedia Commons",
  "fresh-portocale": "Agency of the United States Department of Agriculture Edited Version by: Arad · Public domain · Wikimedia Commons",
  "coca-cola": "Bernard Ladenthin · CC0 · Wikimedia Commons",
  "coca-cola-zero": "Ben Sutherland from Crystal Palace, London, UK · CC BY 2.0 · Wikimedia Commons",
  "pepsi": "Pierre Marshall · CC BY 4.0 · Wikimedia Commons",
  "fanta": "Ayakln · CC BY-SA 4.0 · Wikimedia Commons",
  "sprite": "Ayakln · CC BY-SA 4.0 · Wikimedia Commons",
  "schweppes": "Reedy · CC BY-SA 3.0 · Wikimedia Commons",
  "cappy": "Corn cheese · CC BY-SA 4.0 · Wikimedia Commons",
  "fuzetea": "No machine-readable author provided. Zantastik~commonswiki assumed (based on cop · CC BY-SA 3.0 · Wikimedia Commons",
  "apa-330": "Matsievsky · CC BY-SA 4.0 · Wikimedia Commons",
  "apa-750": "Beluwater · CC BY-SA 4.0 · Wikimedia Commons",
  "bere": "Chris Olszewski · CC BY-SA 4.0 · Wikimedia Commons",
  "amandina": "Gajda-13 at Danish Wikipedia · CC BY-SA 3.0 · Wikimedia Commons",
  "savarina": "Brandon Daniel from USA · CC BY-SA 2.0 · Wikimedia Commons",
  "rulada-pavlova": "William Brawley · CC BY 2.0 · Wikimedia Commons",
  "tiramisu": "Andy Li · CC0 · Wikimedia Commons",
  "cheesecake": "Thriving Vegetarian · CC BY 2.0 · Wikimedia Commons",
  "papanasi": "Nicubunu · CC BY-SA 3.0 · Wikimedia Commons",
  "lava-cake": "Vegan Feast Catering · CC BY 2.0 · Wikimedia Commons",
  "cupa-inghetata": "Renee Comet (Photographer) · Public domain · Wikimedia Commons",
  "sos-smantana-usturoi": "OLIZAN",
  "sos-maioneza-usturoi": "OLIZAN",
  "sos-rosii-dulce": "OLIZAN",
  "sos-pikant": "OLIZAN",
  "sos-barbeque": "OLIZAN"
};
