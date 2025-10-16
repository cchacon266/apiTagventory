# API Tagventory - Guía de Uso

API REST para consultar activos.

## 🚀 Acceso a la API

**URL Base Calidad:** `http://172.16.5.11:3000`

**URL Base Productivo:** `http://172.16.5.11:4000`

---

## 📋 ENDPOINT DISPONIBLE

### **GET /api/assets** - Consultar Activos

Obtiene todos los activos con filtros opcionales.

#### **Parámetros de Consulta**

| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
|-----------|------|-----------|-------------|---------|
| `location` | string | No | Filtrar por código de ubicación | `?location=1107` |
| `employee` | string | No | Filtrar por ID del empleado | `?employee=43363` |
| `EPC` | string | No | Filtrar por código EPC | `?EPC=4B3430304B019022400017EE` |
| `serial` | string | No | Filtrar por número de serie | `?serial=5001209` |
| `status` | string | No | Filtrar por estado del activo | `?status=active` |
| `session` | string | No | Filtrar por estado de sesión | `?session=missing` |
| `session_data` | boolean | Opcional | Omitir información de sesiones (más rápido) | `?session_data=false` |
| `page` | number | Opcional | Número de página | `?page=2` |
| `limit` | number | Opcional | Límite por página (max: 50,000, sin límite por defecto) | `?limit=1000` |

#### **Cómo funciona el filtro de location**

El filtro `location` busca en el campo `locationPath` y encuentra activos que contengan el código de ubicación especificado.

**Ejemplo:**
- **Filtro**: `?location=1107`
- **Busca en**: `locationPath` que contenga `/1107/`
- **Encuentra**: `"Home/CDMX/1107 HSM HIP/SOT/TE"` ✅
- **No encuentra**: `"Home/CDMX/1108 HSM HIP/SOT/TE"` ❌

---

## 🚀 EJEMPLOS DE USO

### **Obtener todos los activos (Calidad)**
```bash
curl "http://172.16.5.11:3000/api/assets"
```

### **Obtener todos los activos (Productivo)**
```bash
curl "http://172.16.5.11:4000/api/assets"
```

### **Filtrar por ubicación (Calidad)**
```bash
curl "http://172.16.5.11:3000/api/assets?location=1107"
```

### **Filtrar por ubicación (Productivo)**
```bash
curl "http://172.16.5.11:4000/api/assets?location=1107"
```

### **Buscar activos de un empleado (Calidad)**
```bash
curl "http://172.16.5.11:3000/api/assets?employee=43363"
```

### **Buscar activos de un empleado (Productivo)**
```bash
curl "http://172.16.5.11:4000/api/assets?employee=43363"
```

### **Buscar por número de serie (Calidad)**
```bash
curl "http://172.16.5.11:3000/api/assets?serial=5001209"
```

### **Buscar por número de serie (Productivo)**
```bash
curl "http://172.16.5.11:4000/api/assets?serial=5001209"
```

### **Filtrar por estado (Calidad)**
```bash
curl "http://172.16.5.11:3000/api/assets?status=active"
```

### **Filtrar por estado (Productivo)**
```bash
curl "http://172.16.5.11:4000/api/assets?status=active"
```

### **Buscar por EPC (Calidad)**
```bash
curl "http://172.16.5.11:3000/api/assets?EPC=4B3430304B019022400017EE"
```

### **Buscar por EPC (Productivo)**
```bash
curl "http://172.16.5.11:4000/api/assets?EPC=4B3430304B019022400017EE"
```

### **Filtrar por estado de sesión (Calidad)**
```bash
curl "http://172.16.5.11:3000/api/assets?session=missing"
```

### **Filtrar por estado de sesión (Productivo)**
```bash
curl "http://172.16.5.11:4000/api/assets?session=missing"
```

### **Múltiples filtros (Calidad)**
```bash
curl "http://172.16.5.11:3000/api/assets?location=1107&status=active"
```

### **Múltiples filtros (Productivo)**
```bash
curl "http://172.16.5.11:4000/api/assets?location=1107&status=active"
```

---

## 📊 RESPUESTA DE LA API

### **Respuesta Exitosa (200 OK)**

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

### **Respuesta de Error (500)**

```json
{
  "error": "Ocurrió un error al obtener los assets.",
  "details": "Mensaje específico del error"
}
```

---

## 🚀 OPTIMIZACIÓN CON SESSION_DATA

### **Filtro `session_data=false` para traer la información más rádido**

El parámetro `session_data=false` omite la información de sesiones de inventario, reduciendo significativamente el tiempo de respuesta:

```bash
# Consulta rápida (sin información de sesiones)
curl "http://172.16.5.11:4000/api/assets?session_data=false"
```

```json
"lastSession": {
  "Status": "N/A"
}
```

### **Ejemplo de Respuesta con `session_data=false`**

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
          "Status": "N/A"
      }
    }
  ]
}
```