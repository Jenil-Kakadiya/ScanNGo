ScanNGo — Setup Guide

1. Install Node.js
ScanNGo requires Node.js and npm.

Download and install Node.js from the official website:
https://nodejs.org/en/download/package-manager

After installation, verify using:
node -v
npm -v

2. Install & Configure MySQL
2.1 Install MySQL

Download and install MySQL Community Server:
https://dev.mysql.com/downloads/mysql/

2.2 Create the Database
Open MySQL CLI or MySQL Workbench and run:
CREATE DATABASE ScanNGo;

2.3 MySQL Default Port
Ensure MySQL is running on the default port:
3306

3. Environment Variables Setup
Create a .env file inside the server directory with the following:
DB_PORT=3306
DB_NAME=ScanNGo
DB_USER=root
DB_PASSWORD=2905


(Adjust username/password if yours are different.)

4. Install Dependencies & Run the Project
If you are setting up ScanNGo for the first time, install node_modules in both client and server folders.

Run the Frontend
Open a new terminal
Navigate to the client directory: cd client
Install dependencies (only needed the first time): npm i


Start the frontend: npm run dev

Run the Backend
Open a new terminal
Navigate to the server directory: cd server


Install dependencies (only needed the first time): npm i


Start the backend: npm run dev