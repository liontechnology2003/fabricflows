const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const usersFilePath = path.join(__dirname, 'src', 'lib', 'db', 'users.json');

async function createUser(name, employeeId, email, password, role) {
    try {
        const data = await fs.promises.readFile(usersFilePath, 'utf-8');
        const users = JSON.parse(data);

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: `USR-${Date.now()}`,
            name,
            email,
            employeeId,
            role,
            password: hashedPassword,
            avatarUrl: ""
        };

        users.push(newUser);

        await fs.promises.writeFile(usersFilePath, JSON.stringify(users, null, 2), 'utf-8');
        console.log(`User '${name}' with role '${role}' created successfully.`);
    } catch (error) {
        console.error("Error creating user:", error);
    }
}

// Example usage:
// Run this script from the root of your project: node create-user.js
// You can modify the parameters below to create different users.
createUser('Admin User', '001', 'admin@example.com', 'adminpassword', 'Admin');
