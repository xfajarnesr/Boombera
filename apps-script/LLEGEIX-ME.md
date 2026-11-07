# Full de càlcul de Boombera

El joc desa els equips i les partides en un full de càlcul de Google, a través d'un Apps Script publicat com a aplicació web. Si `site/comu/config.js` no té cap adreça, el joc funciona igual, però les dades només es desen al navegador de cada ordinador.

## Posar-lo en marxa (una sola vegada)

1. Amb el compte de l'institut, crea un full de càlcul nou a Drive, per exemple «Boombera: dades».
2. Al full, ves a **Extensions → Apps Script**. Esborra el que hi hagi a `Codi.gs` i enganxa-hi tot el contingut de [`Codi.gs`](Codi.gs). Desa.
3. Torna al full i recarrega'l. Surt el menú **Boombera**:
   - **Prepara les pestanyes**: crea Equips, Partides i Millors. La primera vegada, Google demana permís per a l'script: accepta'l.
   - **Posa la clau del professorat**: és la clau que demanarà el tauler. No es guarda al full, sinó a les propietats de l'script.
4. A l'Apps Script, **Implementa → Implementació nova → Aplicació web**:
   - Executa com a: **jo**.
   - Qui hi té accés: **qualsevol persona**.
5. Copia l'adreça que acaba en `/exec` i posa-la a `site/comu/config.js`:

   ```js
   window.BOOMBERA_CONFIG = { servidor: 'https://script.google.com/macros/s/…/exec' };
   ```

## Si canvia el codi

Quan canviïn `site/dades/nucli.js` o `apps-script/servidor.gs`, es torna a fer `Codi.gs` amb `npm run apps-script` (una prova comprova que està al dia). Després s'enganxa de nou a l'Apps Script i es fa **Implementa → Gestiona les implementacions → Edita → Versió nova**. Així l'adreça no canvia.

## Què hi ha al full

- **Equips:** nom, membres, data de creació i els darrers rols.
- **Partides:** una fila per partida d'una missió (la missió lliure no es desa), amb la data, la missió, si s'ha guanyat, els errors, el marge i qui feia cada rol.
- **Millors:** el millor resultat de cada equip a cada missió (menys errors i, si n'hi ha igual, més marge) i quantes partides ha jugat. Es refà sola cada vegada que hi ha canvis, i també des del menú.

Es poden esborrar files a mà. Els textos van amb un apòstrof al davant perquè el full no els converteixi (per exemple, «1.1» no es torna un nombre).

## Seguretat

No hi ha contrasenyes d'equip: qualsevol que sàpiga el nom d'un equip hi pot entrar. Algú que en sàpiga podria enviar resultats falsos des de la consola del navegador. Per a l'aula ja va bé: des del tauler es pot esborrar una partida i fusionar o esborrar equips. Llegir el tauler i esborrar o fusionar demana la clau del professorat, que comprova l'script.
