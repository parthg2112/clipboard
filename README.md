# Secure Live Clipboard

A real-time, end-to-end encrypted shared clipboard built with Next.js, Socket.IO, and MongoDB.

## 🎯 The Problem

In a world where we constantly switch between devices, there's a need for a quick, private, and ephemeral way to share snippets of text, links, or small files. Existing solutions like messaging apps or email can be cumbersome and often lack true privacy for temporary data. This project provides a dead-simple, secure clipboard that works in real-time across any device with a web browser, without requiring accounts or logins.

## ✨ The Solution

This is a web application that provides password-protected "rooms" where users can share text notes and files. It prioritizes security and simplicity, ensuring that your temporary data remains private and is easily accessible only to you and those you share the password with.

## 🚀 Features

* **End-to-End Encryption**: All content is encrypted in your browser using the Web Crypto API. The server only ever sees encrypted data.
* **Real-Time Sync**: Changes are instantly pushed to all devices in the same room using WebSockets (Socket.IO).
* **Password-Protected Rooms**: A room is dynamically created and accessed using a shared password. The password is never sent to the server.
* **Text & File Support**: Share both multi-line text notes and upload small files.
* **No Accounts Required**: Access is ephemeral and based solely on the room password.

---

## 🛠️ How It Works

The application uses a modern web stack to achieve its goals:

* **Frontend**: Built with **Next.js** and **React**, it handles all UI rendering and client-side logic.
* **Backend**: Leverages Next.js API Routes for server-side operations:
    * A **REST API** (`/api/files`) manages file uploads and deletions.
    * A **WebSocket API** (`/api/socket`) runs a **Socket.IO** server to handle all real-time communication.
* **Database**: **MongoDB** is used to store the encrypted content of each clipboard room.
* **Security**: When you enter a password, two keys are derived in your browser: a public **Room ID** (sent to the server) and a secret **Encryption Key** (which never leaves your browser).

---

## ⚙️ Getting Started

Follow these steps to get the project running on your local machine.

### Prerequisites

* [Node.js](https://nodejs.org/) (v18.x or later)
* [pnpm](https://pnpm.io/)
* A [MongoDB](https://www.mongodb.com/try) database connection string (URI).

> **Note:** If you don't have `pnpm` installed, you can install it globally using `npm` (which comes with Node.js):
> ```bash
> npm install -g pnpm
> ```

### 📦 Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
    cd your-repo-name
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Set up environment variables:**
    Create a new file named `.env.local` in the root of the project and add your MongoDB connection string.

    ```env
    # .env.local
    MONGODB_URI="your_mongodb_connection_string"
    ```
    > **Important:** Make sure your MongoDB password in the URI is URL-encoded if it contains special characters (like `@`, `:`, `#`).

4.  **Run the development server:**
    ```bash
    pnpm dev
    ```

5.  **Open the application:**
    Navigate to `http://localhost:3000` in your web browser. Create a room by entering any password, and open the same URL on another device or tab with the same password to see the real-time sync in action.