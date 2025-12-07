// Example model
class ExampleModel {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    // Add your model methods here
    static async findAll() {
        // Database query logic
    }

    static async findById(id) {
        // Database query logic
    }

    static async create(data) {
        // Database query logic
    }

    static async update(id, data) {
        // Database query logic
    }

    static async delete(id) {
        // Database query logic
    }
}

export default ExampleModel;
