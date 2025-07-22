# Secure Live Clipboard

A real-time, end-to-end encrypted shared clipboard built with Next.js, Socket.IO, and MongoDB.

## 🎯 The Problem

Quickly and privately sharing text or files between devices can be cumbersome. Standard tools like messaging apps are often slow, require logins, and are not built for privacy-focused, temporary data sharing.

## 🚀 Features

This application is a simple, secure, and real-time shared clipboard with the following features:

* **End-to-End Encryption**: All content is encrypted and decrypted directly in your browser. The server never sees your unencrypted data.
* **Real-Time Sync**: Changes instantly appear on all connected devices using WebSockets.
* **Password-Protected**: Rooms are secured by a password that is never sent to the server.
* **Text & File Sharing**: Supports both rich text notes and file uploads.
* **Account-Free**: No sign-up required for quick, ephemeral use.

---

## 🛠️ How It Works

The app uses a **Next.js** and **React** frontend for the UI and client-side cryptography. The backend consists of Next.js API Routes running a **Socket.IO** server for real-time events and a REST endpoint for file handling. **MongoDB** stores the encrypted data blobs. The browser's native **Web Crypto API** derives a secret key from your password, ensuring all data is encrypted before it leaves your device.

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
    git clone [https://github.com/parthg2112/clipboard.git](https://github.com/parthg2112/clipboard.git)
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
    CLIPBOARD_DB_NAME="your_database_name"

    SOCKET_PORT=3000
    NEXT_PUBLIC_SOCKET_PORT=3000

    NEXT_PUBLIC_APP_URL=http://localhost:3000
    ```
    > **Important:** Make sure your MongoDB password in the URI is URL-encoded if it contains special characters (like `@`, `:`, `#`).

4.  **Run the development server:**
    ```bash
    pnpm dev
    ```

5.  **Open the application:**
    Navigate to `http://localhost:3000` in your web browser. Create a room by entering any password, and open the same URL on another device or tab with the same password to see the real-time sync in action.