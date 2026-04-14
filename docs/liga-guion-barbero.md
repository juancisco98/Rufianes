# La Liga del Corte — Guion del barbero

Para usar en la sucursal piloto **Martínez** y replicar luego.

---

## El "30 segundos" (cliente nuevo)

> "¿Conocés La Liga del Corte? Es un sistema de puntos que tenemos en Rufianes Martínez. Cada vez que te cortás, tirás 3 dados y sumás puntos: el resultado vale **doble**. Y si querés sumar más, podés comprar dados extra a $2.000 cada uno. Al final del mes, los **3 que tienen más puntos** se llevan **una tarjeta Nike**. ¿Lo jugamos?"

**Tip**: Mostrale el ranking en la pantalla del local mientras le explicás. Genera FOMO instantáneo.

---

## Cliente recurrente

> "Bueno, ya sabés cómo va — tirá los dados. Estás en el puesto X del ranking, te faltan Y puntos para meterte al podio."

---

## Cuándo ofrecer dados extra

**Justo antes de cobrar**, cuando ya tirastes los 3 dados normales:

> "¿Querés tirar unos dados más? Cada uno te suma puntos y te puede meter al top 3. Salen $2.000 cada uno."

**Reglas mentales:**
- Si sacó 18 (6+6+6) → "¡La rompiste! ¿Le metés unos dados extra para asegurar el podio?"
- Si sacó bajo (3-6) → "Tirada baja… ¿Querés revancha con dados extra?"
- Si está cerca del podio → "Mirá, estás a X puntos del 3er puesto. Con 2 dados extra ya entrás."

---

## Flujo en la app

1. Abrí turno (botón "Iniciar turno" arriba)
2. Cliente llega → tocá el FAB "+" (botón flotante amarillo)
3. **Servicio**: elegí del menú o poné precio libre
4. **Cliente**: nombre y apellido (obligatorio para la liga)
5. **Tirada**: el cliente tira los 3 dados físicos en el mostrador → cargás los 3 valores tocando cada caja
6. **Dados extra** (si compra): tocá el `+` para sumar dados, cargá el valor de cada uno
7. La app muestra los puntos totales y tu comisión adicional ($1.000 por dado vendido)
8. **Guardar** → toast con los puntos sumados
9. Al final del día → "Cerrar turno" → la comisión Liga aparece como línea separada en el balance

---

## Reglas de la Liga (cheat sheet)

| Acción | Puntos | Comisión barbero |
|---|---|---|
| Corte / barba / corte+barba | (suma 3 dados) × 2 | (la del corte normal) |
| Dado extra comprado | valor del dado (1-6) | $1.000 c/u |

- **Empate**: gana quien llegó primero al puntaje
- **Mes**: del 1 al último día. No transfiere al siguiente
- **Premios**: top 3 al cierre del mes (definir montos en el simulador admin)
- **Una sola tirada por visita** — corte+barba no duplica

---

## Si algo falla

- **El modal dice "el corte se guardó pero falló la Liga"** → no pasa nada, el corte está guardado. Avisale al admin para que registre la entry manualmente desde la vista Liga
- **No aparece la sección Liga en el modal** → la barbería no tiene liga activada. Pedile al admin que la habilite en Liga → Config
- **El cliente dice que sus puntos están mal** → andá al tab "Liga" del portal, buscalo y mostrale el detalle. Si ves un error real, avisale al admin

---

## Para redes (si te pide el admin)

- Filmá la tirada cuando alguien saca **18** (6+6+6) → reel garantizado
- Festejá las tiradas altas con todo el local
- Mostrá la pantalla del ranking en stories cada semana
- Etiquetá al cliente que está liderando — genera competencia
