export class DatabaseHelper {
    constructor(dbFileUrl) {
        this.dbFileUrl = dbFileUrl;
        this.db = null;
        this.loadDatabase();
    }

    async loadDatabase() {
        if (this.db) return; // If already loaded, no need to reload

        try {
            const response = await fetch(this.dbFileUrl);
            const arrayBuffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            // Load the database into sql.js
            const SQL = await initSqlJs();
            this.db = new SQL.Database(uint8Array);
            console.log("Database loaded");
        } catch (error) {
            console.error("Failed to load database:", error);
        }
    }

    async query(sql, params = []) {
        await this.loadDatabase();
        if (this.db) {
            console.log("Executing SQL:", sql, "with params:", params);
            const stmt = this.db.prepare(sql);
            stmt.bind(params);
            const result = [];
            
            while (stmt.step()) {
                result.push(stmt.getAsObject());
            }
            
            return result;
        } else {
            throw new Error('Database not loaded');
        }
    }

    getAllEdificios() {
        return this.query("SELECT * FROM edificio");
    }

    getAllSalones() {
        return this.query("SELECT * FROM salon");
    }

    getSalon(salonid) {
        return this.query("SELECT * FROM salon WHERE salonid = ?", [salonid]);
    }

    getEdificio(id) {
        return this.query("SELECT * FROM edificio WHERE id = ?", [id]);
    }

    getSalonesAtEdificio(edificio) {
        console.log("Querying salones for edificio:", edificio);
        return this.query("SELECT * FROM salon WHERE edificio_edificioid = ? ORDER BY indice", [parseInt(edificio)])
            .then(result => {
                console.log("Query result for salones:", result);
                return result;
            });
    }

    getSalonSearches(search) {
        return this.query("SELECT * FROM salon WHERE nombre LIKE ? AND tipo != 'vacio' AND tipo != 'sanitario' ORDER BY tipo", [`%${search}%`]);
    }

    getEdificioSearches(search) {
        return this.query("SELECT * FROM edificio WHERE nombre LIKE ? OR nombre LIKE ?", [`${search}%`, `% ${search}%`]);
    }

    getCustomParametersSalon(id) {
        return this.query("SELECT * FROM parametros WHERE par_salonid = ?", [parseInt(id)]);
    }
}
