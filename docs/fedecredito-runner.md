# Runner local de Fedecrédito

El workflow `Scrapers` ejecuta Fedecrédito en la PC Windows registrada como
`PromoCards-Fedecredito-PC`, con la etiqueta exclusiva `promocards-fedecredito`.
Los demás bancos se ejecutan en runners Ubuntu de GitHub. Cada banco guarda sus
propias promociones; el workflow no invoca la limpieza global de la tabla.

El runner se instala en `%LOCALAPPDATA%\PromoCardsRunner` y utiliza una copia de
trabajo independiente en `_work`, sin modificar el checkout de desarrollo.
Usa Node.js 20 o superior instalado en la PC y disponible en `PATH`.
El acceso directo `PromoCards Fedecredito Runner.lnk` de la carpeta Inicio del
usuario ejecuta `start-fedecredito-runner.ps1` de forma oculta al iniciar sesión.
La PC debe permanecer encendida, conectada a Internet y con la sesión iniciada;
bloquear la sesión está permitido, suspender o apagar la PC detiene el runner.

El workflow acepta ejecuciones programadas y manuales sobre `main`. No se usa el
runner local en el workflow de pull requests. Dado que el repositorio es público,
no se deben aceptar cambios no confiables que asignen otros workflows a esta PC.
El runner se ejecuta con los permisos del usuario de Windows, sin elevación.

Para ejecutar solamente Fedecrédito:

```powershell
gh workflow run scraper.yml --ref main -f bank_id=fedecredito
```

Consultar estado y registros:

```powershell
gh api repos/IrahetaBuendia/PromoCards/actions/runners
Get-Content "$env:LOCALAPPDATA\PromoCardsRunner\runner-console.log" -Tail 30
```

Si la PC está desconectada, el trabajo de Fedecrédito queda en cola. Los trabajos
de los demás bancos pueden continuar. Al reiniciar el runner se atienden los
trabajos pendientes que GitHub todavía mantenga vigentes.

Para desinstalarlo, primero retira el runner desde Settings > Actions > Runners
del repositorio, detén el proceso de ese runner y elimina su acceso directo de
Inicio. No es necesario modificar ni borrar la carpeta de desarrollo.
