const Assets = require('../models/assets_model');
const Employee = require('../models/employee_model');
const Location = require('../models/location_model');
const InventorySession = require('../models/inventory_session_model');
const moment = require('moment');

class AssetsServiceOptimized {
    static cache = new Map();
    static CACHE_TTL = 5 * 60 * 1000;
    static lastCacheUpdate = 0;
    
    /**
     * Obtiene todos los assets
     */
    static async getAllAssetsWithDetails() {
        try {
            const now = Date.now();
            if (this.cache.has('allAssets') && (now - this.lastCacheUpdate) < this.CACHE_TTL) {
                console.log('Sirviendo desde caché');
                return this.cache.get('allAssets');
            }

            console.log('Ejecutando consulta a base de datos');
            
            const assetFields = {
                _id: 1,
                name: 1,
                brand: 1,
                model: 1,
                referenceId: 1,
                category: 1,
                location: 1,
                locationPath: 1,
                EPC: 1,
                assigned: 1,
                status: 1,
                serial: 1,
                customFieldsTab: 1,
                creationUserId: 1,
                creationUserFullName: 1,
                creationDate: 1,
                updateDate: 1,
                assignedTo: 1,
                children: 1
            };

            // Obtener assets
            const assets = await Assets.find({}, assetFields).lean();
            const total = assets.length;

            // Obtener IDs únicos
            const employeeIds = [...new Set(assets.filter(asset => asset.assigned).map(asset => asset.assigned))];
            const locationIds = [...new Set(assets.filter(asset => asset.location).map(asset => asset.location))];

            const [employees, locations, sessions] = await Promise.all([
                this.getEmployeesByIds(employeeIds),
                this.getLocationsByIds(locationIds),
                this.getAllInventorySessions()
            ]);

            // Crear mapas para acceso rápido
            const employeeMap = this.createEmployeeMap(employees);
            const locationMap = this.createLocationMap(locations);
            const sessionMap = this.createSessionMap(sessions);

            // Procesar assets
            const processedAssets = assets.map(asset => {
                return this.processAsset(asset, employeeMap, locationMap, sessionMap);
            });

            const result = {
                total,
                assets: processedAssets
            };

            // Guardar en caché
            this.cache.set('allAssets', result);
            this.lastCacheUpdate = now;
            console.log('Datos guardados en caché');

            return result;

        } catch (error) {
            throw new Error(`Error al obtener assets: ${error.message}`);
        }
    }

    /**
     * Obtiene empleados por IDs
     */
    static async getEmployeesByIds(employeeIds) {
        if (employeeIds.length === 0) return [];
        
        return await Employee.find(
            { _id: { $in: employeeIds } },
            { employee_id: 1, name: 1, lastName: 1 }
        ).lean();
    }

    /**
     * Obtiene ubicaciones por IDs
     */
    static async getLocationsByIds(locationIds) {
        if (locationIds.length === 0) return [];
        
        return await Location.find(
            { _id: { $in: locationIds } },
            { name: 1, profileLevel: 1 }
        ).lean();
    }

    /**
     * Obtiene todas las sesiones de inventario
     */
    static async getAllInventorySessions() {
        return await InventorySession.find(
            {},
            { status: 1, appUser: 1, creation: 1, assets: 1, sessionId: 1 }
        ).lean();
    }

    /**
     * Crea mapa de empleados para acceso rápido
     */
    static createEmployeeMap(employees) {
        const map = {};
        employees.forEach(employee => {
            map[employee._id] = employee;
        });
        return map;
    }

    /**
     * Crea mapa de ubicaciones para acceso rápido
     */
    static createLocationMap(locations) {
        const map = {};
        locations.forEach(location => {
            map[location._id] = location;
        });
        return map;
    }

    /**
     * Crea mapa de sesiones ordenadas por fecha
     */
    static createSessionMap(sessions) {
        const processedSessions = sessions.map(session => {
            const creationDate = moment(session.creation, 'DD/MM/YYYY HH:mm:ss').toDate();
            return {
                ...session,
                creationDate: isNaN(creationDate) ? new Date(0) : creationDate
            };
        });

        processedSessions.sort((a, b) => b.creationDate - a.creationDate);

        return processedSessions;
    }

    /**
     * Procesa un asset individual
     */
    static processAsset(asset, employeeMap, locationMap, sessionMap) {
        // Agregar información del empleado
        if (asset.assigned && employeeMap[asset.assigned]) {
            const employee = employeeMap[asset.assigned];
            asset.employee_id = employee.employee_id;
            asset.employee_name = `${employee.name} ${employee.lastName}`;
        }

        // Agregar información de ubicación
        if (asset.location && locationMap[asset.location]) {
            const location = locationMap[asset.location];
            asset.location_Name = location.name;
            asset.location_Level = location.profileLevel;
        }

        // Procesar campos personalizados
        this.processCustomFields(asset);

        // Buscar última sesión
        this.addLastSessionInfo(asset, sessionMap);

        return asset;
    }

    /**
     * Procesa campos personalizados del activo
     */
    static processCustomFields(asset) {
        const customFieldsTab = asset.customFieldsTab;
        if (customFieldsTab) {
            for (const tabKey of Object.keys(customFieldsTab)) {
                const tab = customFieldsTab[tabKey];
                for (const field of tab.left) {
                    if (field.values.fieldName === 'SOC.') {
                        asset.soc = field.values.initialValue;
                    }
                    if (field.values.fieldName === 'STATUS') {
                        asset.SelectedStatus = field.values.initialValue;
                    }
                }
            }
            delete asset.customFieldsTab;
        }
    }

    /**
     * Agrega información de la última sesión al asset
     */
    static addLastSessionInfo(asset, sessionMap) {
        const lastSession = sessionMap.find(session =>
            session.assets.some(item => item._id.toString() === asset._id.toString())
        );

        if (lastSession) {
            const lastAsset = lastSession.assets.find(item => item._id.toString() === asset._id.toString());
            if (lastAsset) {
                asset.lastSession = {
                    sessionId: lastSession.sessionId,
                    Status: lastAsset.status,
                    UserAF: lastSession.appUser,
                    SessionDate: lastSession.creation
                };
            }
        } else {
            asset.lastSession = {
                Status: "N/A"
            };
        }
    }

    /**
     * Limpia el caché
     */
    static clearCache() {
        this.cache.clear();
        this.lastCacheUpdate = 0;
        console.log('Caché limpiado');
    }
}

module.exports = AssetsServiceOptimized;
