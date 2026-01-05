# PLAN DE COMPENSACIÓN DE REFERIDOS
## BEAST OFFICE – v1.0 (Borrador Operativo)

### 1. OBJETO Y ALCANCE

El presente documento define el Plan de Compensación por Referidos de la plataforma SaaS “Beast Office”, dedicada a servicios de:
- Asesoría sobre resultados de lotería.
- Simulación de jugadas, estrategias y herramientas relacionadas.

El objetivo del plan es:
1. Incentivar el crecimiento de la base de usuarios mediante un sistema de referidos tipo “unilevel” (red hasta 3 niveles de profundidad).
2. Mantener la rentabilidad del negocio, asegurando que la casa nunca pague más del 8% del volumen comisionable total.
3. Cumplir el principio de que las comisiones estén basadas en consumo y ventas reales dentro de la plataforma, en línea con las guías de la FTC para modelos multinivel.

*Este plan no es asesoría legal. Cualquier implementación real deberá ser revisada por un profesional legal especializado.*

---

### 2. DEFINICIONES

#### 2.1. Volumen y períodos

- **Semana de comisión**: período comprendido entre el lunes 00:00 UTC y el domingo 23:59:59 UTC (este rango se puede ajustar en la implementación, pero debe mantenerse fijo).

- **Volumen Bruto (VB)**: Monto total pagado por el usuario en una transacción (ej. 50 USD) sin incluir créditos de regalo ni bonificaciones internas.

- **Volumen Comisionable (VC)**: Por defecto, se considera que `VC = VB`. Es decir, se paga comisión sobre el 100% del monto pagado.

- **Volumen Personal Externo Semanal (PV_ext_sem)**: Suma semanal de todo el consumo pagado con dinero externo (fiat, BTC u otros métodos reales) por un usuario, sin incluir consumos pagados con tokens/créditos internos.

- **Volumen de Grupo Semanal (GV_sem)**: Volumen comisionable generado por la red de un usuario (sus niveles pagables) durante la semana.
    - GV_sem(N1): volumen generado por los referidos directos (nivel 1).
    - GV_sem(N1+N2): sumatoria de niveles 1 y 2.
    - GV_sem(N1+N2+N3): sumatoria de niveles 1, 2 y 3.

#### 2.2. Estructura de red

- **Patrocinador (Sponsor)**: usuario que invita a otro mediante su enlace de referido.
- **Nivel 1 (N1)**: referidos directos de un usuario.
- **Nivel 2 (N2)**: referidos de sus referidos (hijos de N1).
- **Nivel 3 (N3)**: referidos de N2.
- **Niveles 4+**: profundidad adicional; el plan no paga comisiones más allá del nivel 3 para cada compra.

La estructura es de tipo unilevel, simple y transparente, pagada por nivel de profundidad.

#### 2.3. Estados de usuario

- **Usuario normal**: tiene cuenta, puede consumir servicios, pero no está calificado para cobrar comisiones de red.
- **Agente / Socio / Manager**: rangos de usuario con derecho a comisiones según requisitos (ver sección 4).
- **Usuario activo (para calificación semanal)**: Usuario cuya cuenta está verificada y que tiene `PV_ext_sem >= 50 USD` durante la semana de comisión.
- **Referido activo (a efectos de requisitos por rango)**: Referido directo que cumple:
    - Cuenta verificada.
    - `PV_ext_sem >= 5 USD` en la semana.

#### 2.4. Recompensas

- **Tokens o Créditos internos**: saldo que el usuario puede utilizar únicamente para consumir servicios dentro de la plataforma (simulaciones, herramientas, etc.).
- **Pago en BTC (o cash)**: parte de la comisión que se paga al usuario hacia la wallet asociada, cuando cumpla el mínimo de retiro.

Por diseño, el plan utiliza una combinación de créditos internos y recompensas monetarias.

---

### 3. ESTRUCTURA GENERAL DEL PLAN

#### 3.1. Porcentajes por nivel (sobre VC)

Por cada transacción comisionable generada por un usuario, se define:
- **Nivel 1** (sponsor directo): **5%**
- **Nivel 2**: **2%**
- **Nivel 3**: **1%**

**Suma total máxima por transacción:** 5% + 2% + 1% = **8% del VC**.

Esto significa que, para cada compra, el total de comisiones pagado a la red nunca supera el 8% del volumen comisionable de esa compra.

#### 3.2. Profundidad de pago

Aunque la red pueda tener 4, 5 o más niveles, para cada compra se buscan solo tres uplines consecutivos:
- Upline 1 = sponsor directo del comprador.
- Upline 2 = sponsor del upline 1.
- Upline 3 = sponsor del upline 2.

A partir de ahí, no se paga nada al upline 4 y siguientes por esa transacción.

---

### 4. RANGOS Y REQUISITOS SEMANALES

#### 4.1. Tipos de rango

- **Usuario Normal**: Puede usar la plataforma, recargar saldo, etc. No cobra comisiones de referidos.
- **Agente**: Cobra comisiones únicamente del Nivel 1 (5%).
- **Socio**: Cobra comisiones del Nivel 1 (5%) y Nivel 2 (2%).
- **Manager**: Cobra comisiones del Nivel 1 (5%), Nivel 2 (2%) y Nivel 3 (1%).

#### 4.2. Requisitos detallados por rango (evaluados semanalmente)

**NOTA**: “Volumen personal” siempre se entiende como consumo pagado con dinero externo.

##### 4.2.1. Requisitos generales (para todos los rangos con comisión)
Para que un usuario pueda ser Agente, Socio o Manager en una semana determinada, debe cumplir:
1. **Cuenta verificada (KYC básico)**: Email verificado, teléfono verificado, datos de identidad completos.
2. **Wallet BTC registrada**: Dirección BTC on-chain o Lightning configurada.
3. **Volumen Personal Externo Semanal mínimo**: `PV_ext_sem >= 50 USD` (consumo pagado con dinero que entra de fuera).

Si no se cumplen estos tres puntos, el usuario pasa a considerarse Usuario Normal para esa semana, y no cobra comisiones aunque tenga red.

##### 4.2.2. Rangos específicos

**Rango: Agente**
- *Requisitos semanales*:
    - Cumplir todos los requisitos generales.
    - Tener al menos **3 referidos directos activos** (Cuenta verificada y PV >= 5 USD).
- *Beneficios*: Cobra comisiones de Nivel 1 (5%).

**Rango: Socio**
- *Requisitos semanales*:
    - Cumplir todo lo de Agente.
    - Tener al menos **5 referidos directos activos**.
    - `GV_sem(N1 + N2) >= 150 USD`.
- *Beneficios*: Cobra comisiones de Nivel 1 (5%) y Nivel 2 (2%).

**Rango: Manager**
- *Requisitos semanales*:
    - Cumplir todo lo de Socio.
    - `GV_sem(N1 + N2 + N3) >= 500 USD`.
    - Tener al menos **2 ramas** (dos referidos directos diferentes) con `GV_sem >= 150 USD` cada una.
- *Beneficios*: Cobra comisiones de Nivel 1 (5%), Nivel 2 (2%) y Nivel 3 (1%).

---

### 5. CÁLCULO DE COMISIONES POR TRANSACCIÓN

#### 5.1. Identificación de la cadena de uplines
Para cada transacción comisionable de un usuario X:
- U1 = sponsor directo de X.
- U2 = sponsor directo de U1.
- U3 = sponsor directo de U2.

#### 5.2. Función de calificación
Se define `califica(U, nivel) -> true / false`.
Devuelve true si el usuario U cumple, en la semana de la transacción:
- Requisitos generales (KYC, wallet BTC, PV_ext_sem >= 50).
- Rango suficiente para cobrar ese nivel (Agente para N1, Socio para N2, Manager para N3).

#### 5.3. Fórmulas por transacción
Sea una transacción `j` con `VC_j`.
- **Comisión de U1**: `VC_j * 0.05` si califica(U1, 1), sino 0.
- **Comisión de U2**: `VC_j * 0.02` si califica(U2, 2), sino 0.
- **Comisión de U3**: `VC_j * 0.01` si califica(U3, 3), sino 0.

**Límite por transacción**: La suma nunca excede el 8%. No se aplica compresión dinámica.

---

### 6. CÁLCULO DE COMISIONES SEMANALES

#### 6.1. Acumulación por usuario
`Comisión_semana(U) = Suma de todas las comisiones individuales ganadas en la semana.`

#### 6.2. División en tokens y BTC
Por diseño del plan v1.0:
- **70%** de la comisión semanal se expresa en tokens/créditos internos.
- **30%** se expresa como saldo disponible para retiro en BTC.

#### 6.3. Umbral de retiro
El saldo BTC acumulado solo puede retirarse cuando el usuario tenga al menos **50 USD** equivalentes en BTC.

---

### 7. CASOS ESPECIALES

#### 7.1. Usuario sin patrocinador (“huérfano”)
El 8% potencial se convierte en breakage (ganancia para la empresa).

#### 7.2. Patrocinador no calificado
No cobra comisiones. No hay compresión. El monto es breakage.

#### 7.3. Reembolsos y Fraude
Si hay reembolso, se revierte la comisión. Fraude implica suspensión y congelamiento.

#### 7.4. Cambios de línea de patrocinio
No se recalculan comisiones históricas.

### 8. LÍMITE GLOBAL DE PAGO
Nunca se paga más del 8% del volumen comisionable total de la semana.