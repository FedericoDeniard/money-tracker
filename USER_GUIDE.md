# Guía de Usuario — Money Tracker

Money Tracker es una app de finanzas personales que se conecta a tu Gmail para detectar y extraer transacciones financieras automáticamente usando inteligencia artificial. También podés agregar transacciones a mano o subiendo documentos (facturas, comprobantes).

---

## Tabla de contenidos

1. [Registro e inicio de sesión](#1-registro-e-inicio-de-sesión)
2. [Navegación general](#2-navegación-general)
3. [Dashboard](#3-dashboard)
4. [Transacciones](#4-transacciones)
5. [Suscripciones](#5-suscripciones)
6. [Métricas](#6-métricas)
7. [Configuración](#7-configuración)
8. [Panel de notificaciones](#8-panel-de-notificaciones)
9. [Atajos de teclado](#9-atajos-de-teclado)

---

## 1. Registro e inicio de sesión

### Crear una cuenta (`/register`)

1. Ingresá a la app y hacé clic en **Get Started** o en **Registrarse**.
2. Completá el formulario con tu email y una contraseña. La contraseña debe cumplir:
   - Mínimo 8 caracteres
   - Al menos una letra mayúscula
   - Al menos un número o símbolo
   - Repetir la contraseña para confirmarla
3. Alternativamente, podés registrarte con **Google OAuth** haciendo clic en el botón de Google.
4. Una vez creada la cuenta, serás redirigido al Dashboard.

### Iniciar sesión (`/login`)

1. Ingresá tu email y contraseña, luego hacé clic en **Iniciar sesión**.
2. También podés iniciar sesión con **Google** usando el botón correspondiente.
3. Desde esta pantalla podés acceder al formulario de registro con el link de alternancia.

### Recuperar contraseña (`/forgot-password`)

1. Hacé clic en **¿Olvidaste tu contraseña?** desde la pantalla de login.
2. Ingresá tu email y enviá el formulario.
3. Recibirás un email con un link para resetear tu contraseña.

### Resetear contraseña (`/reset-password`)

1. Ingresá al link que llegó a tu email.
2. Escribí tu nueva contraseña y confirmala.
3. La app te redirigirá automáticamente al Dashboard al completar el proceso.

---

## 2. Navegación general

### Sidebar (escritorio)

En escritorio, el sidebar fijo aparece en el lado izquierdo con 5 secciones:

| Icono         | Sección                         | Atajo |
| ------------- | ------------------------------- | ----- |
| Dashboard     | Resumen general                 | `d`   |
| Transacciones | Lista de movimientos            | `t`   |
| Suscripciones | Suscripciones detectadas por IA | `u`   |
| Métricas      | Gráficos y análisis             | `m`   |
| Configuración | Ajustes de cuenta               | `c`   |

El link activo se resalta con un fondo animado. En la parte inferior del sidebar encontrás el botón de **Cerrar sesión**.

### Menú hamburguesa (mobile)

En dispositivos móviles, el sidebar está oculto. Accedés al menú tocando el ícono de hamburguesa (☰) en la barra superior. También aparece el logo de la app y la campana de notificaciones.

### Campana de notificaciones

En el lado derecho de la pantalla (escritorio) o en la barra superior (mobile) aparece una campana con un badge rojo que indica cuántas notificaciones no leídas tenés (máximo "99+"). Al hacer clic se abre el panel de notificaciones como un drawer lateral.

---

## 3. Dashboard

**Ruta:** `/dashboard`

El Dashboard es la pantalla principal. Tiene dos zonas: las acciones rápidas y el panel de estado.

### Acciones rápidas

Hay 4 tarjetas de acción al tope:

| Acción                  | Qué hace                                                                 |
| ----------------------- | ------------------------------------------------------------------------ |
| **Agregar transacción** | Abre el formulario para registrar una transacción manualmente            |
| **Conectar Gmail**      | Redirige al flujo de autenticación de Gmail                              |
| **Force Sync**          | Importa emails de todas las cuentas Gmail conectadas (pide confirmación) |
| **Ver transacciones**   | Navega a `/transactions`                                                 |

### Tareas inteligentes (panel izquierdo)

La app analiza el estado de tus conexiones y te muestra tareas pendientes:

- **Reconectar Gmail** (amarillo): tu cuenta Gmail necesita ser reconectada. El link te lleva a Configuración.
- **Renovar watch** (azul): el monitoreo de Gmail está por vencer. El link te lleva a Configuración.
- **Importación en progreso** (azul): hay un proceso de importación corriendo en este momento.
- **Importación fallida** (rojo): hubo un error en la última importación. Aparece un botón "Reintentar".
- **Todo al día** (verde): no hay ninguna tarea pendiente.

### Actividad de IA (panel derecho)

Muestra 3 estadísticas de los últimos 7 días:

- **Emails procesados:** cuántos emails analizó la IA
- **Transacciones encontradas:** cuántas transacciones extrajo
- **Emails omitidos:** cuántos emails no contenían información financiera relevante

### Quick Status

Debajo del panel principal aparece un resumen de:

- Cuentas Gmail que necesitan reconexión
- Watches (monitoreos) que vencen en las próximas 72 horas

### Notificaciones en tiempo real

La app escucha en tiempo real el estado de las importaciones. Cuando una importación finaliza (exitosa o con error), aparece un **toast** (notificación emergente) con el resultado.

---

## 4. Transacciones

**Ruta:** `/transactions`

Esta es la pantalla central de la app. Permite ver, filtrar, agregar, editar y eliminar transacciones.

### Ver la lista de transacciones

- Las transacciones se cargan de a 10 con **scroll infinito**: al llegar al final de la lista se cargan las siguientes automáticamente.
- Cada tarjeta muestra: nombre del servicio/comercio, categoría, fecha, monto y moneda.
- En escritorio, al hacer clic en una transacción se abre el panel de detalle a la derecha.
- En mobile, el detalle se abre como una pantalla completa con animación desde la derecha.

### Filtrar y ordenar transacciones

La barra de filtros permite combinar múltiples condiciones:

| Filtro        | Opciones de operador                       |
| ------------- | ------------------------------------------ |
| **Servicio**  | "es" / "no es" (texto libre)               |
| **Tipo**      | Ingreso / Gasto                            |
| **Categoría** | "es" / "no es" (selección)                 |
| **Moneda**    | "es" / "no es" (selección)                 |
| **Email**     | "es" / "no es" (selección de cuenta Gmail) |

Para agregar un filtro:

1. Hacé clic en el selector de filtros (estilo paleta de comandos).
2. Elegí el campo que querés filtrar.
3. Seleccioná el operador y el valor.
4. Podés agregar tantos filtros como quieras.

Para ordenar: elegí entre **Fecha de creación** o **Fecha de transacción**, y entre **Más nuevas primero** o **Más antiguas primero**.

Para limpiar todos los filtros: usá el botón **Limpiar filtros**.

### Ver detalle de una transacción

Al seleccionar una transacción se muestra:

- Ícono de ingreso/gasto, monto formateado y moneda
- Nombre del comercio/servicio y categoría
- Fecha y hora exacta
- Tipo de transacción
- Campo "Comercio" o "Recibido de"
- Monto exacto
- ID de referencia (con botón para copiar al portapapeles)

### Editar una transacción

1. Seleccioná una transacción para ver su detalle.
2. Hacé clic en **Editar**.
3. Modificá los campos necesarios en el modal.
4. Guardá los cambios.

### Eliminar una transacción

1. Seleccioná una transacción para ver su detalle.
2. Hacé clic en **Eliminar**.
3. Confirmá la acción en el modal de confirmación (acción destructiva, no reversible).

### Agregar una transacción manualmente

1. Hacé clic en el botón flotante **+** (esquina inferior derecha).
2. Seleccioná **Agregar manualmente**.
3. Completá el formulario con: servicio, tipo, monto, moneda, categoría, fecha, referencia.
4. Guardá la transacción.

También podés agregar una transacción desde el Dashboard con la acción rápida correspondiente.

### Subir un documento (PDF o imagen)

1. Hacé clic en el botón flotante **+** (esquina inferior derecha).
2. Seleccioná **Subir documento**.
3. Arrastrá y soltá (drag & drop) el archivo, o hacé clic para seleccionarlo.
   - Formatos aceptados: **PDF** (hasta 5 MB) e **imágenes** (hasta 3 MB).
4. La app enviará el documento al sistema de IA para extraer la información de la transacción automáticamente.

---

## 5. Suscripciones

**Ruta:** `/subscriptions`

> Esta sección está en **BETA**.

La app detecta automáticamente suscripciones recurrentes en tus transacciones usando inteligencia artificial. Para que una suscripción aparezca aquí necesita:

- Al menos **2 ocurrencias** del mismo comercio/servicio
- Un nivel de confianza de la IA de **65% o más**

### Filtros y vistas

**Filtrar por estado:**

- **Todas:** muestra todas las suscripciones detectadas
- **Activas:** suscripciones cuya próxima fecha estimada cae dentro de los próximos 10 días (con gracia)
- **Inactivas:** suscripciones que ya habrían vencido

**Cambiar vista:**

- **Grilla:** tarjetas con toda la información de cada suscripción
- **Lista:** filas compactas con acordeón expandible

**Ordenar por:**

- Estado
- Monto
- Próxima fecha estimada
- Nivel de confianza
- Nombre del comercio

### Información de cada suscripción

Cada suscripción muestra:

- Nombre del comercio/servicio
- Badge de estado (Activa / Inactiva)
- Nivel de confianza de la IA (porcentaje)
- Frecuencia detectada (mensual, anual, etc.)
- Monto promedio, mínimo y máximo
- Cantidad de ocurrencias detectadas
- Fecha del último cobro y fecha estimada del próximo
- Consistencia del email de origen

### Vista lista con historial

En la vista de lista, podés expandir cada fila para ver el historial completo de transacciones asociadas a esa suscripción, con columnas de: fecha, comercio, monto.

---

## 6. Métricas

**Ruta:** `/metrics`

Visualización de tus finanzas con gráficos interactivos.

### Filtros

- **Período:** Últimos 30, 90 o 365 días
- **Moneda:** Una moneda específica o "Todas"

### Vista de una sola moneda

Cuando seleccionás una moneda específica (o solo tenés una), la pantalla muestra:

**Cards de resumen (4 métricas principales):**

| Métrica                  | Descripción                              |
| ------------------------ | ---------------------------------------- |
| **Total de ingresos**    | Suma de todos los ingresos en el período |
| **Total de gastos**      | Suma de todos los gastos en el período   |
| **Balance neto**         | Ingresos menos gastos                    |
| **Transacción promedio** | Monto promedio por transacción           |

Cada card incluye un badge de variación porcentual comparado con el período anterior (en verde si es positivo, rojo si es negativo).

**Gráfico de tendencia mensual:**

- Podés alternar entre **Barras apiladas** y **Área** usando los botones de toggle.
- Muestra ingresos y gastos mes a mes dentro del período seleccionado.

**Gráfico de categorías:**

- Podés alternar entre **Dona (PieChart)** y **Mapa de árbol (Treemap)**.
- Muestra la distribución de gastos por categoría.
- El gráfico de dona es interactivo: al hacer clic en una porción se resalta.

**Sección de insights:**

- Categoría con mayor gasto
- Total de transacciones en el período
- Tasa de ahorro (porcentaje de ingresos no gastados)

### Vista multi-moneda

Cuando seleccionás "Todas" y tenés transacciones en más de una moneda, la app muestra una vista comparativa `CurrencyComparison`:

- **Tarjetas por moneda:** cada moneda tiene su propia tarjeta con ingresos, gastos, balance neto, tasa de ahorro, promedio por transacción y categorías principales.
- **Estadísticas globales:** resumen agregado de todas las monedas.
- **Insights de comportamiento:**
  - Mejor ahorrador (moneda con mayor tasa de ahorro)
  - Mayor gasto (moneda con más gastos)
  - Más activo (moneda con más transacciones)
  - Transacciones más grandes (moneda con mayor promedio)

---

## 7. Configuración

**Ruta:** `/settings`

### Sección Gmail

Administrá tus cuentas de Gmail conectadas a la app.

**Por cada cuenta conectada podés:**

| Estado                  | Acciones disponibles         |
| ----------------------- | ---------------------------- |
| **Conectada**           | Importar emails, Desconectar |
| **Necesita reconexión** | Reconectar Gmail             |
| **Desconectada**        | Reconectar Gmail             |

**Importar emails (Seed):**

1. Hacé clic en **Importar emails** en la cuenta que querés sincronizar.
2. Se abre un modal de confirmación con opciones de rango de fechas o cantidad de emails a importar.
3. Confirmá para iniciar el proceso. Recibirás notificaciones en tiempo real con el resultado.

**Conectar una cuenta nueva:**

- Hacé clic en **Agregar otra cuenta** (si ya tenés cuentas) o **Conectar Gmail** (si no tenés ninguna).
- Serás redirigido al flujo de autorización de Google.
- Al completarlo, volverás a Configuración con un mensaje de éxito o error.

**Desconectar una cuenta:**

1. Hacé clic en **Desconectar** junto a la cuenta que querés remover.
2. Confirmá la acción en el modal de confirmación (es destructiva: los emails importados de esa cuenta se mantienen, pero se dejan de monitorear nuevos).

**Banners de advertencia:**

- Si una cuenta necesita reconexión, aparece un banner amarillo de aviso.
- Si falta el watch de Gmail (monitoreo en tiempo real), aparece un banner informativo.

### Idioma

Cambiá el idioma de la interfaz con el selector desplegable:

- **Español (ES)**
- **English (EN)**

El cambio es inmediato y no requiere recargar la página.

### Notificaciones

**Notificaciones push (por dispositivo):**

- Activá o desactivá las notificaciones push del navegador para este dispositivo específico.
- Estados posibles:
  - **Bloqueadas:** el navegador tiene las notificaciones bloqueadas. Se muestra un mensaje para habilitarlas en la configuración del navegador.
  - **Desactivadas:** podés activarlas con el toggle.
  - **Activadas:** podés desactivarlas con el toggle.

**Preferencias de notificaciones por tipo:**

- Lista de todos los tipos de notificaciones agrupadas por categoría.
- Para cada tipo podés elegir:
  - **Recibir:** recibís la notificación normalmente.
  - **Silenciar:** la notificación se guarda pero no te avisa.

### Información de cuenta

Muestra el email de tu cuenta registrada.

---

## 8. Panel de notificaciones

Accedé tocando la campana en cualquier pantalla.

### Filtros

| Tab             | Qué muestra                                                 |
| --------------- | ----------------------------------------------------------- |
| **Todas**       | Todas las notificaciones                                    |
| **No leídas**   | Solo las que no fueron leídas                               |
| **Silenciadas** | Notificaciones que decidiste silenciar                      |
| **Importantes** | Notificaciones marcadas como críticas o de alta importancia |

### Niveles de importancia

- **Crítico** (rojo): requiere atención inmediata
- **Alto** (ámbar): importante pero no urgente
- **Normal** (azul): informativo

### Acciones individuales

Al hacer clic en una notificación:

- Se marca como leída automáticamente.
- Si tiene una ruta de acción asociada, te navega a esa sección de la app.

### Acciones masivas (multi-selección)

1. Activá los checkboxes para seleccionar varias notificaciones.
2. Aparece una barra con acciones:
   - **Marcar como leídas**
   - **Archivar**
   - **Eliminar**

---

## 9. Atajos de teclado

La app incluye una paleta de comandos accesible desde cualquier pantalla autenticada.

| Tecla | Acción                    |
| ----- | ------------------------- |
| `d`   | Ir al Dashboard           |
| `t`   | Ir a Transacciones        |
| `m`   | Ir a Métricas             |
| `u`   | Ir a Suscripciones        |
| `c`   | Ir a Configuración        |
| `s`   | Cerrar sesión             |
| `l`   | Alternar idioma (ES ↔ EN) |

---

## Flujo recomendado para un usuario nuevo

1. **Registrate** en `/register` con tu email o Google.
2. **Conectá tu Gmail** desde el Dashboard o desde `/settings`.
3. **Importá tus emails** desde `/settings` → cuenta Gmail → Importar emails.
4. Esperá el procesamiento (recibirás una notificación cuando termine).
5. **Revisá tus transacciones** en `/transactions`.
6. **Explorá tus métricas** en `/metrics` para ver un análisis de tus finanzas.
7. **Revisá las suscripciones** detectadas en `/subscriptions`.
8. Configurá tus **preferencias de notificaciones** en `/settings`.
