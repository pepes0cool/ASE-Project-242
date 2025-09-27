# 🏫 Classroom Room Management System – HCMUT

## A full-stack web application that allows lecturers to book classrooms and staff to monitor room usage efficiently. Built with Docker, React, Node.js, Express, and MySQL replication.

## 📌 Overview

## This system helps automate the classroom booking process across campuses. It supports role-based access for lecturers and admin staff and is designed for future scalability.

## 📁 Project Structure

ASE-Project-242/
├── Backend/  
│ ├── config/ # DB connection configs  
│ ├── controllers/ # Logic for handling API requests  
│ ├── models/ # Sequelize models  
│ ├── routes/ # API endpoints  
│ ├── node_modules/  
│ ├── Dockerfile # Backend container config  
│ ├── ROMS.sql # DB initialization script  
│ ├── server.js # Entry point for backend  
│ └── package.json  
│  
├── Frontend/  
│ ├── public/  
│ ├── src/  
│ │ ├── api/ # API calling functions  
│ │ ├── assets/  
│ │ ├── components/ # Reusable UI elements  
│ │ ├── contexts/ # React context for global state  
│ │ ├── pages/ # Page components  
│ │ ├── routers/ # React router  
│ │ ├── styles/  
│ │ ├── utils/  
│ │ ├── App.jsx  
│ │ ├── index.css  
│ │ └── main.jsx  
│ ├── Dockerfile # Frontend container config  
│ ├── index.html  
│ ├── vite.config.js # Vite bundler config  
│ ├── tailwind.config.js  
│ └── package.json  
│  
├── mysql/  
│ ├── primary/ # MySQL primary instance  
│ ├── replica/ # MySQL read replica  
│ └── init-replication.sql # Script for replication setup  
│  
├── .env # Environment variables  
├── compose.yml # Docker Compose file  
└── LICENSE

---

## ✅ Prerequisites

- Docker & Docker Compose installed

---

## 🚀 Getting Started

### 1. Clone the repository

git clone https://github.com/DucAnnee/ASE-Project-242.git
cd ASE-Project-242
mkdir -p mysql/primary/conf.d
mkdir -p mysql/replica/conf.d
chmod +x mysql/init-replication.sh (This is linux cmd, you can manually create the directory conf.d in each folder if you are using windows)

### 2. Start the entire app using Docker Compose

First, ensure the .env file is configured, I have included the .env file in this .zip
Then, using this command:

docker-compose up -d

> This command will build and run all services in the background, including the frontend, backend, and MySQL containers.

---

This will spin up:

- React frontend at port **3000**
- Express backend at port **8000**
- MySQL with primary-replica setup

---

## 🌐 Access the Application

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)

---

## 🛠️ Tech Stack

- **Frontend**: React.js, Tailwind CSS, Vite
- **Backend**: Node.js, Express.js
- **Database**: MySQL (primary + replica)
- **DevOps**: Docker, Docker Compose

---

## 🙌 Authors

Developed by Team ASE Class CC04, HCMUT – as part of Advanced Software Engineering coursework.
