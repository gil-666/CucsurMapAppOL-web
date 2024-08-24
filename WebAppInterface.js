export class WebAppInterface {
    constructor(db,sharedProperty) {
        this.db = db; // Assuming db is a local database instance
        this.sharedProperty = sharedProperty;
    }

    
    navToSalonInfo(info) {
        console.log(`Received building info: ${info}`);
        this.setSalonid(info);
        window.location.href= "salon.html";
        // Handle navigation to salon info
        // Example: window.location.href = `#salonInfo/${info}`;
        
    }

    navToMapSalon(id) {
        console.log(`Navigated to map: ${id}`);
        this.setSalonid(id);
        window.location.href= "map.html";
    }

    createToast(text) {
        alert(text); // Using alert to simulate Toast
    }
    async convertToBase64(uint8Array) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result.replace(/^data:.+;base64,/, '');
                resolve(base64String);
            };
            reader.onerror = reject;

            // Convert Uint8Array to a Blob
            const blob = new Blob([uint8Array], { type: 'image/jpeg' });
            reader.readAsDataURL(blob);
        });
    }
    async getEdificios() {
        try {
            const result = await this.db.getAllEdificios();
            const edificios = Array.isArray(result) ? result : [];
            console.log("Raw edificios data:", edificios);

            if (edificios.length === 0) {
                console.warn("No edificios found.");
            }

            const jsonArray = [];

            for (const edificio of edificios) {
                console.log("Processing edificio:", edificio);
                let imageBase64 = null;
                if (edificio.icon) {
                    try {
                        imageBase64 = await this.convertToBase64(edificio.icon);
                    } catch (error) {
                        console.error("Error converting image to Base64:", error);
                    }
                }

                jsonArray.push({
                    id: edificio.id,
                    nombre: edificio.nombre,
                    tipo: edificio.tipo,
                    pisos: edificio.pisos,
                    lat: edificio.lat,
                    lon: edificio.lon,
                    image: imageBase64, // Store Base64 image data
                    v1: edificio.v1,
                    v2: edificio.v2,
                    v3: edificio.v3,
                    v4: edificio.v4
                });
            }

            console.log("Edificios data:", JSON.stringify(jsonArray));
            return JSON.stringify(jsonArray);
        } catch (error) {
            console.error("Error in getEdificios:", error);
            return JSON.stringify([]); // Return empty array in case of error
        }
    }


    async getSalones() {
        const salones = await this.db.getAllSalones();

        const jsonArray = [];
        for (let i = 0; i < salones.length; i++) {
            const salon = salones[i];
            jsonArray.push({
                salonid: salon.salonid,
                nombre: salon.nombre,
                descripcion: salon.descripcion,
                tipo: salon.tipo,
                piso: salon.piso,
                edificio_edificioid: salon.edificio_edificioid
            });

        };
        console.log("Salones data:", JSON.stringify(jsonArray));
        return JSON.stringify(jsonArray);
    }

    async getSalon(salonid) {
        const salones = await this.db.getSalon(salonid);

        const jsonArray = [];
        for (let i = 0; i < salones.length; i++) {
            const salon = salones[i];
            jsonArray.push({
                salonid: salon.salonid,
                nombre: salon.nombre,
                descripcion: salon.descripcion,
                tipo: salon.tipo,
                piso: salon.piso,
                edificio_edificioid: salon.edificio_edificioid
            });

        };
        console.log("Salon data:", JSON.stringify(jsonArray));
        return JSON.stringify(jsonArray);
    }

    async getEdificio(id) {
        const edificios = this.db.getEdificio(id);
        for (const edificio of edificios) {
            console.log("Processing edificio:", edificio);
            let imageBase64 = null;
            if (edificio.icon) {
                try {
                    imageBase64 = await this.convertToBase64(edificio.icon);
                } catch (error) {
                    console.error("Error converting image to Base64:", error);
                }
            }

            jsonArray.push({
                id: edificio.id,
                nombre: edificio.nombre,
                tipo: edificio.tipo,
                pisos: edificio.pisos,
                lat: edificio.lat,
                lon: edificio.lon,
                image: imageBase64, // Store Base64 image data
                v1: edificio.v1,
                v2: edificio.v2,
                v3: edificio.v3,
                v4: edificio.v4
            });
        }
        console.log("Got individual edificio:", JSON.stringify(jsonArray));
        return JSON.stringify(jsonArray);
    }
    async getEdificioSalones(edificio) {
        console.log("Received edificio:", edificio);
        
        try {
            const result = await this.db.getSalonesAtEdificio(edificio);
            const salones = Array.isArray(result) ? result : [];
            console.log("Queried salones:", salones);
    
            if (salones.length === 0) {
                console.warn("No salones found for edificio:", edificio);
            }
            const jsonArray = [];
            for (let i = 0; i < salones.length; i++) {
                const salon = salones[i];
                jsonArray.push({
                    salonid: salon.salonid,
                    nombre: salon.nombre,
                    descripcion: salon.descripcion,
                    tipo: salon.tipo,
                    piso: salon.piso,
                    edificio_edificioid: salon.edificio_edificioid
                });
    
            };
    
            console.log("Salon data (formatted):", jsonArray);
            return JSON.stringify(jsonArray);
        } catch (error) {
            console.error("Error fetching salones for edificio:", edificio, error);
            return JSON.stringify([]);
        }
    }

    async getSalonSearch(search) {
        const salones = await this.db.getSalonSearches(search);
        const jsonArray = [];
        for (let i = 0; i < salones.length; i++) {
            const salon = salones[i];
            jsonArray.push({
                salonid: salon.salonid,
                nombre: salon.nombre,
                descripcion: salon.descripcion,
                tipo: salon.tipo,
                piso: salon.piso,
                edificio_edificioid: salon.edificio_edificioid
            });

        };
        console.log("Salon search data:", JSON.stringify(jsonArray));
        return JSON.stringify(jsonArray);
    }

    async getEdificioSearch(search) {
        const edificios = await this.db.getEdificioSearches(search);
        const jsonArray = [];
        for (let i = 0; i < edificios.length; i++) {
            const edificio = edificios[i];
            console.log("searching edificio:", edificio);
            let imageBase64 = null;
            if (edificio.icon) {
                try {
                    imageBase64 = await this.convertToBase64(edificio.icon);
                } catch (error) {
                    console.error("Error converting image to Base64:", error);
                }
            }

            jsonArray.push({
                id: edificio.id,
                nombre: edificio.nombre,
                tipo: edificio.tipo,
                pisos: edificio.pisos,
                lat: edificio.lat,
                lon: edificio.lon,
                image: imageBase64, // Store Base64 image data
                v1: edificio.v1,
                v2: edificio.v2,
                v3: edificio.v3,
                v4: edificio.v4
            });
        }
        console.log("Edificio search data:", JSON.stringify(jsonArray));
        return JSON.stringify(jsonArray);
    }

    async getCustomParametersSalon(id) {
        const salones = await this.db.getCustomParametersSalon(id);
        const jsonArray = [];
        for (let i = 0; i < salones.length; i++) {
            const salon = salones[i];
            jsonArray.push({
                par_salonid: salon.par_salonid,
                v1: salon.v1,
                v2: salon.v2,
                v3: salon.v3,
                v4: salon.v4
            })
        };
        console.log("Custom parameters:", JSON.stringify(jsonArray));
        return JSON.stringify(jsonArray);
    }

    async getSalonid() {
        return this.sharedProperty.salonid;
    }

    async setSalonid(info) {
        this.sharedProperty.salonid = info;
    }

    async getEdificioid() {
        return this.sharedProperty.edificioid;
    }

    async setEdificioid(id) {
        this.sharedProperty.edificioid = id;
    }

    async sendFeedback() {
        // Simulate feedback dialog
        alert("Feedback dialog triggered.");
    }
    
}
