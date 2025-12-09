import supabase from '../config/supabase.js';

// Example service for database operations
const userService = {
    // Get all users
    async getAllUsers() {
        try {
            const users = await sql`SELECT * FROM users`;
            return users;
        } catch (error) {
            throw new Error(`Error getting users: ${error.message}`);
        }
    },

    // Get user by ID
    async getUserById(id) {
        try {
            const [user] = await sql`SELECT * FROM users WHERE id = ${id}`;
            return user;
        } catch (error) {
            throw new Error(`Error getting user: ${error.message}`);
        }
    },

    // Create new user
    async createUser(userData) {
        try {
            const { name, email, password } = userData;
            const [newUser] = await sql`
                INSERT INTO users (name, email, password)
                VALUES (${name}, ${email}, ${password})
                RETURNING *
            `;
            return newUser;
        } catch (error) {
            throw new Error(`Error creating user: ${error.message}`);
        }
    },

    // Update user
    async updateUser(id, userData) {
        try {
            const { name, email } = userData;
            const [updatedUser] = await sql`
                UPDATE users
                SET name = ${name}, email = ${email}, updated_at = NOW()
                WHERE id = ${id}
                RETURNING *
            `;
            return updatedUser;
        } catch (error) {
            throw new Error(`Error updating user: ${error.message}`);
        }
    },

    // Delete user
    async deleteUser(id) {
        try {
            await sql`DELETE FROM users WHERE id = ${id}`;
            return { message: 'User deleted successfully' };
        } catch (error) {
            throw new Error(`Error deleting user: ${error.message}`);
        }
    }
};

export default userService;
