const Assets = require('../models/assets_model');
const Employee = require('../models/employee_model');
const Location = require('../models/location_model');
const InventorySession = require('../models/inventory_session_model');
const moment = require('moment');

class AssetsServiceOptimized {
    /**
     * Obtiene todos los assets con paginación y filtros
     */
    static async getAllAssetsWithDetails(filters = {}, pagination = {}) {
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

            // Configurar paginación con límite
            const page = parseInt(pagination.page) || 1;
            const MAX_LIMIT = 100;
            const limit = Math.min(parseInt(pagination.limit) || 50, MAX_LIMIT);
            const skip = (page - 1) * limit;

            let assetsQuery = Assets.find(queryFilters, assetFields);

            if (!filters.employee && !filters.session) {
                assetsQuery = assetsQuery.skip(skip).limit(limit);
            } else if (filters.session) {
                const filterRatio = 0.90;
                const assetsNeeded = skip + limit;
                const estimatedAssetsToFetch = Math.ceil(assetsNeeded / filterRatio);
                const buffer = Math.ceil(estimatedAssetsToFetch * 0.1);
                const totalToFetch = estimatedAssetsToFetch + buffer;

                assetsQuery = assetsQuery.limit(totalToFetch);
            } else {
                const filterRatio = 0.90;
                const assetsNeeded = skip + limit;
                const estimatedAssetsToFetch = Math.ceil(assetsNeeded / filterRatio);
                const buffer = Math.ceil(estimatedAssetsToFetch * 0.5);
                const totalToFetch = estimatedAssetsToFetch + buffer;
                assetsQuery = assetsQuery.skip(0).limit(totalToFetch);
            }

            let totalDocuments = await Assets.countDocuments(queryFilters);
            const assets = await assetsQuery.lean();

            // Obtener IDs únicos de empleados y ubicaciones
            const employeeIds = [...new Set(assets.filter(asset => asset.assigned).map(asset => asset.assigned))];
            const locationIds = [...new Set(assets.filter(asset => asset.location).map(asset => asset.location))];

            if (employeeObjectId && !employeeIds.includes(employeeObjectId.toString())) {
                employeeIds.push(employeeObjectId);
            }

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
            if (filters.employee || filters.session) {
                totalDocuments = processedAssets.length;

                const startIndex = skip;
                const endIndex = skip + limit;
                processedAssets = processedAssets.slice(startIndex, endIndex);
            }

            // Calcular información de paginación
            const totalPages = Math.ceil(totalDocuments / limit);
            const hasNextPage = page < totalPages;
            const hasPrevPage = page > 1;

            const result = {
                total: totalDocuments,
                assets: processedAssets,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    limit: limit,
                    hasNextPage: hasNextPage,
                    hasPrevPage: hasPrevPage,
                    nextPage: hasNextPage ? page + 1 : null,
                    prevPage: hasPrevPage ? page - 1 : null
                }
            };

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
