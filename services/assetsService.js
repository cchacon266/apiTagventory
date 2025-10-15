const Assets = require('../models/assets_model');
const Employee = require('../models/employee_model');
const Location = require('../models/location_model');
const InventorySession = require('../models/inventory_session_model');
const moment = require('moment');

class AssetsServiceOptimized {
    /**
     * Obtiene todos los assets con paginación y filtros
     * Optimizado para grandes volúmenes (50k+ registros)
     */
    static async getAllAssetsWithDetails(filters = {}, pagination = {}) {
        const startTime = Date.now();

        try {
            // Buscar empleado si hay filtro por empleado
            let employeeObjectId = null;
            let employeeData = null;
            if (filters.employee) {
                const employee = await Employee.findOne({ employee_id: filters.employee }).lean();
                if (employee) {
                    employeeObjectId = employee._id;
                    employeeData = employee;
                } else {
                    return {
                        platform: {
                            type: "api",
                            version: "v1",
                            resource: "/api/assets"
                        },
                        request: {
                            status: "success",
                            code: 200,
                            method: "GET",
                            total: 0,
                            filters: filters,
                            pagination: {
                                currentPage: parseInt(pagination.page) || 1,
                                totalPages: 0,
                                limit: parseInt(pagination.limit) || 1000,
                                hasNextPage: false,
                                hasPrevPage: false,
                                nextPage: null,
                                prevPage: null
                            }
                        },
                        response: []
                    };
                }
            }

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

            // Construir filtros de consulta
            const queryFilters = this.buildQueryFilters(filters);

            // Optimización para filtro por empleado
            if (filters.employee && employeeData) {
                const employeeName = `${employeeData.name} ${employeeData.lastName}`;
                queryFilters.assignedTo = { $regex: employeeName, $options: 'i' };
            }

            // Configurar paginación - solo aplicar si se especifica
            const page = parseInt(pagination.page) || 1;
            const MAX_LIMIT = 50000; // Aumentar límite máximo para SAP
            const limit = pagination.limit ? Math.min(parseInt(pagination.limit), MAX_LIMIT) : null;
            const skip = limit ? (page - 1) * limit : 0;

            let assetsQuery = Assets.find(queryFilters, assetFields);

            // Solo aplicar paginación si se especifica limit
            if (limit) {
                assetsQuery = assetsQuery.skip(skip).limit(limit);
            }

            let totalDocuments = await Assets.countDocuments(queryFilters);

            const assets = await assetsQuery.lean();

            const employeeIds = new Set();
            const locationIds = new Set();

            assets.forEach(asset => {
                if (asset.assigned) employeeIds.add(asset.assigned);
                if (asset.location) locationIds.add(asset.location);
            });

            // Convertir Sets a Arrays
            const employeeIdsArray = Array.from(employeeIds);
            const locationIdsArray = Array.from(locationIds);

            if (employeeObjectId && !employeeIdsArray.includes(employeeObjectId.toString())) {
                employeeIdsArray.push(employeeObjectId);
            }

            // Cargar sesiones solo si se especifica 
            const relatedStart = Date.now();
            const promises = [
                this.getEmployeesByIds(employeeIdsArray),
                this.getLocationsByIds(locationIdsArray)
            ];

            // Cargar sesiones por defecto, omitir solo si:
            // 1. El cliente específicamente dice session_data=false
            const includeSessions = pagination.session_data !== 'false';

            if (includeSessions) {
                promises.push(this.getAllInventorySessions());
            }

            const results = await Promise.all(promises);
            const employees = results[0];
            const locations = results[1];
            const sessions = includeSessions ? results[2] : [];

            // Crear mapas para acceso rápido
            const employeeMap = this.createEmployeeMap(employees);
            const locationMap = this.createLocationMap(locations);
            
            // Usar mapa optimizado de sesiones para mejor performance
            const sessionMap = includeSessions ? 
                this.createOptimizedSessionMap(sessions) : 
                {};

            // Procesar assets
            let processedAssets = assets.map(asset => {
                return this.processAsset(asset, employeeMap, locationMap, sessionMap);
            });

            // Aplicar filtros después del procesamiento
            if (filters.employee) {
                processedAssets = this.filterByEmployeeId(processedAssets, filters.employee, employeeMap);
            }

            if (filters.EPC) {
                processedAssets = this.filterByEPC(processedAssets, filters.EPC);
            }

            if (filters.serial) {
                processedAssets = this.filterBySerial(processedAssets, filters.serial);
            }

            if (filters.status) {
                processedAssets = this.filterByStatus(processedAssets, filters.status);
            }

            if (filters.session) {
                processedAssets = this.filterBySession(processedAssets, filters.session);
            }

            // Ajustar total y paginación para filtros que se aplican después del procesamiento
            if ((filters.employee || filters.session) && limit) {
                totalDocuments = processedAssets.length;

                const startIndex = skip;
                const endIndex = skip + limit;
                processedAssets = processedAssets.slice(startIndex, endIndex);
            }

            // Calcular información de paginación
            const totalPages = limit ? Math.ceil(totalDocuments / limit) : 1;
            const hasNextPage = limit ? page < totalPages : false;
            const hasPrevPage = limit ? page > 1 : false;

            const result = {
                total: totalDocuments,
                assets: processedAssets,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    limit: limit || null,
                    hasNextPage: hasNextPage,
                    hasPrevPage: hasPrevPage,
                    nextPage: hasNextPage ? page + 1 : null,
                    prevPage: hasPrevPage ? page - 1 : null
                }
            };

            const totalTime = (Date.now() - startTime) / 1000;
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
     * Crea mapa de sesiones ordenadas por fecha (método original)
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
     * Crea mapa de sesiones (assetId -> última sesión)
     */
    static createOptimizedSessionMap(sessions) {
        const assetSessionMap = {};
        
        // Ordenar sesiones por fecha (más reciente primero)
        const sortedSessions = sessions.sort((a, b) => 
            moment(b.creation, 'DD/MM/YYYY HH:mm:ss').valueOf() - 
            moment(a.creation, 'DD/MM/YYYY HH:mm:ss').valueOf()
        );
        
        // Para cada sesión (de más reciente a más antigua)
        sortedSessions.forEach(session => {
            session.assets.forEach(asset => {
                const assetId = asset._id.toString();
                
                // Solo guardar si es la primera vez que vemos este activo
                if (!assetSessionMap[assetId]) {
                    assetSessionMap[assetId] = {
                        sessionId: session.sessionId,
                        status: asset.status,
                        user: session.appUser,
                        date: session.creation
                    };
                }
            });
        });
        
        return assetSessionMap;
    }

    /**
     * Procesa un asset individual agregando información de empleado, ubicación y sesiones
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

        // Buscar última sesión (usar método optimizado si es mapa de activos)
        if (Object.keys(sessionMap).length > 0 && sessionMap[asset._id.toString()]) {
            // Es un mapa optimizado (assetId -> sesión)
            this.addLastSessionInfoOptimized(asset, sessionMap);
        } else if (Array.isArray(sessionMap)) {
            // Es un array de sesiones (método original)
            this.addLastSessionInfo(asset, sessionMap);
        } else {
            // Sin sesiones
            asset.lastSession = { Status: "N/A" };
        }

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
     * Agrega información de la última sesión al asset (método original - lento)
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
     * Agrega información de la última sesión al asset (método optimizado - rápido)
     */
    static addLastSessionInfoOptimized(asset, assetSessionMap) {
        const lastSessionData = assetSessionMap[asset._id.toString()];
        
        if (lastSessionData) {
            asset.lastSession = {
                sessionId: lastSessionData.sessionId,
                Status: lastSessionData.status,
                UserAF: lastSessionData.user,
                SessionDate: lastSessionData.date
            };
        } else {
            asset.lastSession = {
                Status: "N/A"
            };
        }
    }

    /**
     * Construye los filtros de consulta basados en los parámetros
     */
    static buildQueryFilters(filters) {
        const queryFilters = {};

        if (filters.location) {
            queryFilters.locationPath = { $regex: `/${filters.location} ` };
        }

        if (filters.employee) {
            // Filtro por empleado se aplicará después del procesamiento
        }

        if (filters.EPC) {
            queryFilters.EPC = filters.EPC;
        }

        if (filters.serial) {
            queryFilters.serial = filters.serial;
        }

        if (filters.status) {
            queryFilters.status = filters.status;
        }

        if (filters.session) {
            // El filtro por sesión se aplicará después del procesamiento
            // porque lastSession se agrega durante el procesamiento
        }

        return queryFilters;
    }

    /**
     * Filtra assets por id del empleado
     */
    static filterByEmployeeId(assets, employeeId, employeeMap) {
        if (!employeeId) return assets;

        const filtered = assets.filter(asset => {
            return asset.employee_id === employeeId;
        });

        return filtered;
    }

    static filterByEPC(assets, EPC) {
        if (!EPC) return assets;

        const filtered = assets.filter(asset => {
            return asset.EPC === EPC;
        });

        return filtered;
    }

    static filterBySerial(assets, serial) {
        if (!serial) return assets;

        const filtered = assets.filter(asset => {
            return asset.serial === serial;
        });

        return filtered;
    }

    static filterByStatus(assets, status) {
        if (!status) return assets;

        const filtered = assets.filter(asset => {
            return asset.status === status;
        });

        return filtered;
    }

    static filterBySession(assets, session) {
        if (!session) return assets;

        const filtered = assets.filter(asset => {
            return asset.lastSession && asset.lastSession.Status === session;
        });

        return filtered;
    }

}

module.exports = AssetsServiceOptimized;
