

const User = {
    createUser: async (pool, userData) => {
        const {
            uuid,
            username,
            email,
            password_hash,
            full_name,
            phone_number = null,
            status = 'active'
        } = userData;

        const [result] = await pool.query(
            `INSERT INTO users (uuid, username, email, password_hash, full_name, phone_number, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [uuid, username, email, password_hash, full_name, phone_number, status]
        );
        return result.insertId;
    },

    getUserById: async (pool, userId) => {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );
        return rows[0] || null;
    },

    getUserByEmail: async (pool, email) => {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        return rows[0] || null;
    },

    getUserByUsername: async (pool, username) => {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        return rows[0] || null;
    },

    getUserByUuid: async (pool, uuid) => {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE uuid = ?',
            [uuid]
        );
        return rows[0] || null;
    },

    updatePassword: async (pool, userId, newPasswordHash) => {
        const [result] = await pool.query(
            'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
            [newPasswordHash, userId]
        );
        return result.affectedRows > 0;
    },

    updateUser: async (pool, userId, updateData) => {
        const fields = [];
        const values = [];

        // Dynamically build the update query based on provided fields
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined && key !== 'id' && key !== 'uuid') {
                fields.push(`${key} = ?`);
                values.push(updateData[key]);
            }
        });

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        // Add updated_at timestamp
        fields.push('updated_at = NOW()');
        values.push(userId);

        const [result] = await pool.query(
            `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        return result.affectedRows > 0;
    },

    deleteUser: async (pool, userId) => {
        const [result] = await pool.query(
            'DELETE FROM users WHERE id = ?',
            [userId]
        );
        return result.affectedRows > 0;
    },

    getUsersWithPagination: async (pool, limit = 10, offset = 0) => {
        const [rows] = await pool.query(
            'SELECT id, uuid, username, email, full_name, phone_number, status, created_at, updated_at FROM users LIMIT ? OFFSET ?',
            [limit, offset]
        );
        
        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM users');
        const total = countResult[0].total;

        return {
            users: rows,
            pagination: {
                total,
                limit,
                offset,
                totalPages: Math.ceil(total / limit),
                currentPage: Math.floor(offset / limit) + 1
            }
        };
    },

    checkEmailExists: async (pool, email, excludeUserId = null) => {
        let query = 'SELECT id FROM users WHERE email = ?';
        let params = [email];

        if (excludeUserId) {
            query += ' AND id != ?';
            params.push(excludeUserId);
        }

        const [rows] = await pool.query(query, params);
        return rows.length > 0;
    },

    checkUsernameExists: async (pool, username, excludeUserId = null) => {
        let query = 'SELECT id FROM users WHERE username = ?';
        let params = [username];

        if (excludeUserId) {
            query += ' AND id != ?';
            params.push(excludeUserId);
        }

        const [rows] = await pool.query(query, params);
        return rows.length > 0;
    }
};

export default User;