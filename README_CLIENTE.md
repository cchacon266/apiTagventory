# API Tagventory - Guía de Uso

API REST para consultar activos.

## 🚀 Acceso a la API

**URL Base Calidad:** `http://172.16.5.11:3000`

**URL Base Productivo:** `http://172.16.5.11:4000`

---

## 📋 ENDPOINTS DISPONIBLES

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/assets` | Consulta simple con un valor por filtro vía URL |
| `POST` | `/api/assets/query` | Consulta avanzada con múltiples valores por filtro vía JSON body |

---

## 1. GET /api/assets — Consulta Simple

Obtiene activos filtrando por **un valor por parámetro** enviado en la URL.

### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
|-----------|------|-----------|-------------|---------|
| `location` | string | No | Filtrar por código de hospital/ubicación | `?location=1107` |
| `employee` | string | No | Filtrar por ID del empleado | `?employee=43363` |
| `EPC` | string | No | Filtrar por código EPC | `?EPC=4B3430304B019022400017EE` |
| `serial` | string | No | Filtrar por número de serie (búsqueda parcial) | `?serial=5001209` |
| `status` | string | No | Filtrar por estado del activo | `?status=active` |
| `session` | string | No | Filtrar por estado de sesión | `?session=missing` |
| `session_data` | boolean | No | `false` omite datos de sesión (respuesta más rápida) | `?session_data=false` |
| `page` | number | No | Número de página (default: 1) | `?page=2` |
| `limit` | number | No | Límite por página (max: 50,000, sin límite por defecto) | `?limit=1000` |

### Valores válidos por campo

#### `status` — Estado del activo

| Valor | Descripción | Total en BD |
|-------|-------------|-------------|
| `active` | Activo en uso, vigente (valor por defecto) | 21,729 |
| `decommissioned` | Dado de baja | 493 |
| `inProcess` | En proceso (trámite o movimiento) | 61 |
| `maintenance` | En mantenimiento | 23 |

#### `session` — Estado en última sesión de inventario

| Valor | Descripción | Total en BD |
|-------|-------------|-------------|
| `missing` | No fue encontrado en la última sesión | 168,544 registros |
| `found` | Encontrado en su ubicación asignada | 15,792 registros |
| `external` | Encontrado fuera de su ubicación asignada | 1,462 registros |

#### `location` — Hospitales / Unidades disponibles

| Código | Hospital | Activos |
|--------|----------|---------|
| `1107` | HSM HIP (CDMX) | 5,994 |
| `1133` | HSM SFE (CDMX) | 5,795 |
| `1101` | HSM MLM (Michoacán) | 3,776 |
| `11NM` | OC | 2,701 |
| `1111` | HSM CAZ | 1,905 |
| `4807` | TDC HIP | 1,310 |
| `4811` | TDC CAZ | 385 |
| `4801` | TDC MLM | 215 |
| `1129` | HSM PED | 146 |

#### `serial` — Búsqueda parcial

El filtro de serial hace búsqueda **parcial e insensible a mayúsculas**. No es necesario escribir el serial completo ni incluir espacios.

- Buscar `"JWX360"` → encuentra `" JWX3604"` ✅
- Buscar `"jwx3604"` → encuentra `" JWX3604"` ✅

---

## 🚀 EJEMPLOS GET /api/assets

```bash
# Todos los activos
curl "http://172.16.5.11:4000/api/assets"

# Por hospital
curl "http://172.16.5.11:4000/api/assets?location=1107"

# Por empleado
curl "http://172.16.5.11:4000/api/assets?employee=43363"

# Por número de serie (búsqueda parcial)
curl "http://172.16.5.11:4000/api/assets?serial=JWX360"

# Por EPC exacto
curl "http://172.16.5.11:4000/api/assets?EPC=4B3430304B019022400017EE"

# Por estado
curl "http://172.16.5.11:4000/api/assets?status=maintenance"

# Por estado de sesión
curl "http://172.16.5.11:4000/api/assets?session=missing"

# Combinando filtros con paginación
curl "http://172.16.5.11:4000/api/assets?location=1107&status=active&page=1&limit=100"

# Sin datos de sesión (más rápido)
curl "http://172.16.5.11:4000/api/assets?location=1107&session_data=false"
```

---

## 2. POST /api/assets/query — Consulta Avanzada con Múltiples Valores

Permite enviar un **JSON body** con **arrays de valores** por filtro. Ideal para integraciones con SAP u otros sistemas que necesiten consultar múltiples hospitales, empleados o activos en una sola llamada.

### Configuración de la llamada

| Campo | Valor |
|-------|-------|
| Método | `POST` |
| URL Calidad | `http://172.16.5.11:3000/api/assets/query` |
| URL Productivo | `http://172.16.5.11:4000/api/assets/query` |
| Header | `Content-Type: application/json` |
| Body | JSON (ver estructura abajo) |

### Estructura del Body

```json
{
  "location":     "string o array de strings",
  "employee":     "string o array de strings",
  "EPC":          "string o array de strings",
  "serial":       "string o array de strings",
  "status":       "string o array de strings",
  "session":      "string o array de strings",
  "page":         1,
  "limit":        1000,
  "session_data": true
}
```

Todos los campos son **opcionales**. Se pueden combinar libremente.

### Regla de combinación

```
(location A  OR  location B)
        AND
(employee 1  OR  employee 2)
        AND
(EPC X  OR  EPC Y  OR  EPC Z)
```

Dentro de cada campo se aplica **OR**, entre campos distintos se aplica **AND**.

### Comparativa: antes vs ahora

| Escenario | Antes | Ahora |
|-----------|-------|-------|
| 3 hospitales × 4 empleados × 5 activos | **60 llamadas GET** | **1 llamada POST** |
| 9 hospitales | 9 llamadas GET | 1 llamada POST |
| 4 empleados | 4 llamadas GET | 1 llamada POST |

---

## 🚀 EJEMPLOS POST /api/assets/query

### 1. Varios hospitales a la vez
```json
{
  "location": ["1107", "1133", "1101"]
}
```

### 2. Activos de varios empleados
```json
{
  "employee": ["47182", "54235", "7541", "33334"]
}
```

### 3. El caso real: 3 hospitales + 4 empleados + 5 EPCs (antes 60 llamadas, ahora 1)
```json
{
  "location": ["1107", "1133", "1101"],
  "employee": ["47182", "54235", "7541", "33334"],
  "EPC": [
    "474D30304B019022400003E8",
    "4B3430304B03101250000F0B",
    "4B3430304B01902240004B84",
    "4E5045590002203230004B33",
    "474D30304B019022400003EB"
  ]
}
```

### 4. Activos en mantenimiento en dos hospitales
```json
{
  "location": ["1107", "1133"],
  "status": "maintenance"
}
```

### 5. Activos dados de baja o en proceso
```json
{
  "status": ["decommissioned", "inProcess"]
}
```

### 6. Activos faltantes en sesión en 4 hospitales
```json
{
  "location": ["1107", "1133", "1101", "1111"],
  "session": "missing"
}
```

### 7. Activos fuera de lugar (external) en hospitales TDC
```json
{
  "location": ["4807", "4811", "4801"],
  "session": "external"
}
```

### 8. Activos faltantes o externos en hospitales HSM
```json
{
  "location": ["1107", "1133", "1101", "1111", "1129"],
  "session": ["missing", "external"]
}
```

### 9. Búsqueda por varios seriales (sin preocuparse por espacios)
```json
{
  "serial": ["JWX3604", "24WZ4430025C", "1EBKF245481"]
}
```

### 10. Búsqueda por varios EPCs en un hospital
```json
{
  "location": "1133",
  "EPC": [
    "4B3430304B03101250000487",
    "4B3430304B03101250001494",
    "4B3430304B031012500014DC"
  ]
}
```

### 11. Consulta masiva optimizada para SAP (sin datos de sesión)
```json
{
  "location": ["1107", "1133", "1101", "11NM", "1111"],
  "status": "active",
  "page": 1,
  "limit": 5000,
  "session_data": false
}
```

### 12. Todos los activos activos de empleados específicos en hospitales HSM
```json
{
  "location": ["1107", "1133", "1101", "1111", "1129"],
  "employee": ["47182", "54235", "7541", "33334"],
  "status": "active",
  "session_data": false
}
```

---

## 📊 RESPUESTA DE LA API

### Respuesta Exitosa (200 OK)

```json
{
  "platform": {
    "type": "api",
    "version": "v1",
    "resource": "/api/assets"
  },
  "request": {
    "status": "success",
    "code": 200,
    "method": "GET",
    "total": 9635,
    "filters": {},
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "limit": null,
      "hasNextPage": false,
      "hasPrevPage": false,
      "nextPage": null,
      "prevPage": null
    }
  },
  "response": [
    {
      "_id": "66425e821eb23e517f403761",
      "name": "PROYECTOR",
      "brand": "SONY",
      "model": "VPL EX272 PORTATIL",
      "serial": "5001209",
      "location": "663c100c1350226b4c7b1641",
      "locationPath": "Home/CDMX/1107 HSM HIP/SOT/TDC/AUDI/AUDB",
      "referenceId": "66401fde1eb23e517f402208",
      "category": {
        "label": "EQUIPO DE TECNOLOGIAS DE LA INFORMACION",
        "value": "663573871350226b4c7a742f"
      },
      "status": "active",
      "assigned": "663d60d4b61d2a27f705e101",
      "updateDate": "2024/05/17 15:09:31",
      "assignedTo": "LISSET ADRIANA              MONROY MANRIQUEZ <>",
      "EPC": "4B3430304B019022400017EE",
      "creationDate": "2024/05/13 13:40:02",
      "creationUserFullName": "Soporte HTK",
      "employee_id": "43363",
      "employee_name": "LISSET ADRIANA              MONROY MANRIQUEZ",
      "location_Name": "AUDB",
      "location_Level": "6",
      "soc": "2200",
      "SelectedStatus": "",
      "lastSession": {
        "sessionId": "session-id-20250116132909180",
        "Status": "missing",
        "UserAF": "idavila.hip@starmedica.com",
        "SessionDate": "16/01/2025 13:29:31"
      }
    }
  ]
}
```

### Campos de la respuesta

| Campo | Descripción |
|-------|-------------|
| `_id` | Identificador único del activo |
| `name` | Nombre del activo |
| `brand` | Marca |
| `model` | Modelo |
| `serial` | Número de serie |
| `EPC` | Código RFID |
| `status` | Estado del activo (`active`, `decommissioned`, `inProcess`, `maintenance`) |
| `locationPath` | Ruta completa de ubicación (ej. `Home/CDMX/1107 HSM HIP/...`) |
| `location_Name` | Nombre corto de la ubicación |
| `location_Level` | Nivel de profundidad de la ubicación |
| `employee_id` | ID del empleado asignado |
| `employee_name` | Nombre del empleado asignado |
| `assignedTo` | Nombre completo del responsable |
| `category.label` | Categoría del activo |
| `soc` | Código SOC |
| `creationDate` | Fecha de creación |
| `updateDate` | Fecha de última actualización |
| `lastSession.sessionId` | ID de la última sesión de inventario |
| `lastSession.Status` | Estado en la última sesión (`found`, `missing`, `external`, `N/A`) |
| `lastSession.UserAF` | Usuario que realizó la sesión |
| `lastSession.SessionDate` | Fecha de la última sesión |

### Respuesta de Error (500)

```json
{
  "error": "Ocurrió un error al obtener los assets.",
  "details": "Mensaje específico del error"
}
```

---

## ⚡ OPTIMIZACIÓN: session_data=false

Cuando solo se necesitan los datos del activo sin el historial de sesiones de inventario, usar `session_data=false` reduce significativamente el tiempo de respuesta.

```bash
# GET
curl "http://172.16.5.11:4000/api/assets?location=1107&session_data=false"
```

```json
// POST
{
  "location": ["1107", "1133"],
  "status": "active",
  "session_data": false
}
```

Cuando `session_data=false`, el campo `lastSession` regresa simplemente:
```json
"lastSession": { "Status": "N/A" }
```

---

## ⚠️ CÓDIGOS DE RESPUESTA

| Código | Descripción |
|--------|-------------|
| `200` | OK - Consulta exitosa |
| `500` | Error interno del servidor |
```