# API Tagventory - Documentación de Endpoints

API para conectar mongoDB y SAP.

## 🚀 Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp scripts/envexample.txt .env
# Editar .env con tu configuración de MongoDB

# 3. Ejecutar la aplicación
npm run dev
```

La API estará disponible en: `http://localhost:3000`

---

## 📋 ENDPOINTS

### **GET /api/assets** - Obtener Activos

Obtiene todos los activos con filtros opcionales.

#### **Parámetros de Consulta**

| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
|-----------|------|-----------|-------------|---------|
| `location` | string | No | Filtrar por código de ubicación en locationPath | `?location=1101` |
| `employee` | string | No | Filtrar por ID del empleado | `?employee=43363` |
| `EPC` | string | No | Filtrar por código EPC | `?EPC=4B3430304B019022400017EE` |
| `serial` | string | No | Filtrar por número de serie | `?serial=5001209` |
| `status` | string | No | Filtrar por estado del activo | `?status=active` |
| `session` | string | No | Filtrar por estado de sesión | `?session=missing` |
| `page` | number | **Recomendado** | Número de página (default: 1) | `?page=2` |
| `limit` | number | **Recomendado** | Límite por página (default: 50, max: 100) | `?limit=25` |

#### **Respuesta Exitosa (200 OK)**

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
    "total": 9634,
    "filters": {},
    "pagination": {
      "currentPage": 1,
      "totalPages": 193,
      "limit": 50,
      "hasNextPage": true,
      "hasPrevPage": false,
      "nextPage": 2,
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

#### **Cómo funciona el filtro de location**

El filtro `location` busca en el campo `locationPath` y encuentra activos que contengan el código de ubicación especificado.

**Ejemplo:**
- **Filtro**: `?location=1107`
- **Busca en**: `locationPath` que contenga `/1107/`
- **Encuentra**: `"Home/CDMX/1107 HSM HIP/SOT/TE"` ✅
- **No encuentra**: `"Home/CDMX/1108 HSM HIP/SOT/TE"` ❌

---

## 🚀 EJEMPLOS DE USO

### **Obtener todos los activos**
```bash
curl "http://localhost:3000/api/assets?page=1&limit=10"
```

### **Filtrar por ubicación**
```bash
curl "http://localhost:3000/api/assets?location=1101&page=1&limit=10"
```

### **Buscar activos de un empleado**
```bash
curl "http://localhost:3000/api/assets?employee=43363&page=1&limit=10"
```

### **Buscar por número de serie**
```bash
curl "http://localhost:3000/api/assets?serial=5001209&page=1&limit=10"
```

### **Filtrar por estado**
```bash
curl "http://localhost:3000/api/assets?status=active&page=1&limit=10"
```

### **Buscar por EPC**
```bash
curl "http://localhost:3000/api/assets?EPC=4B3430304B019022400017EE&page=1&limit=10"
```

### **Filtrar por estado de sesión**
```bash
curl "http://localhost:3000/api/assets?session=missing&page=1&limit=10"
```

### **Múltiples filtros**
```bash
curl "http://localhost:3000/api/assets?location=1101&status=active&page=1&limit=10"
```

---

## ⚠️ CÓDIGOS DE RESPUESTA

| Código | Descripción |
|--------|-------------|
| `200` | OK - Request exitoso |
| `500` | Internal Server Error - Error del servidor |

### **Ejemplo de Error 500**
```json
{
  "error": "Ocurrió un error al obtener los assets.",
  "details": "Mensaje específico del error"
}
```

---

## 📊 COMPORTAMIENTO DE PAGINACIÓN

- Si no hay filtros y no se especifica `limit`, se aplica límite de 50
- Con filtros, no hay límite por defecto (devuelve todos los resultados)
- Máximo 100 elementos por página para evitar sobrecarga

---

## 🔧 CONFIGURACIÓN

### **Variables de Entorno**
```env
DB_URL=mongodb://localhost:27017/tagventory
PORT=3000
```

### **Scripts**
```bash
npm run dev    # Desarrollo
```

**¡API lista para usar!** 🎉