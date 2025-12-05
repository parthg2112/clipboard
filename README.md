# 🚀 Secure Live Clipboard

A real-time, end-to-end encrypted shared clipboard built with **Next.js**, **Socket.IO**, and **MongoDB**.

## 🎯 Problem It Solves

Sharing text or files between devices is usually slow and annoying. Messaging apps require accounts, syncing is slow, and nothing is private. Live Clipboard gives you:

* 🔒 **True privacy** (end-to-end encryption)
* ⚡ **Instant syncing**
* 🚫 **No login**
* 🧹 **Ephemeral rooms**

This application is a simple, secure, and real-time shared clipboard with the following features:

---

# ✨ Features

### 🔐 End-to-End Encryption

All data is encrypted **before** leaving your device. The server only stores encrypted blobs.

### ⚡ Real-Time Sync

Changes instantly update across all connected devices using Socket.IO.

### 🔑 Password-Protected Rooms

Each room is secured with a password-derived encryption key. The password is **never sent to the server**.

### 📝 Text & File Sharing

Supports rich text notes and file uploads.

### 👤 No Accounts

Everything works anonymously and resets automatically when rooms expire.

---

# 🧠 How It Works

* The browser uses the **Web Crypto API** to derive a key from your password.
* Text and files are encrypted locally.
* The server handles only encrypted blobs—never plaintext.
* MongoDB stores encrypted room data and expiration metadata.
* A cleanup job deletes expired rooms and their files.

---

# ⚙️ Getting Started

You can run Live Clipboard using:

1. **Docker (recommended)**
2. Local Node.js installation (alternative)

---

# 🐳 Option 1 — Run with Docker (Recommended)

This is the easiest and cleanest way to run the app anywhere.

## 1. Clone the repository

```bash
git clone https://github.com/parthg2112/clipboard.git
cd clipboard
```

> If using Docker Compose, MongoDB is already built in — no external database required.

## 3. Start everything

```bash
docker compose up -d
```

This will start:

* Next.js app
* Socket.IO server
* MongoDB
* Automatic volume storage

## 4. Open the app

Go to:

```
http://localhost:3000
```

Create a room with a password and open the same room on another device to sync in realtime.

---

# 🟢 Option 2 — Run Locally (No Docker)

### Prerequisites

* Node.js **18+**
* A MongoDB instance (local or cloud)

### Install dependencies

```bash
npm install
```

### Create `.env`

```env
MONGODB_URI="mongodb://user:pass@host/live_clipboard"
MAX_FILE_SIZE=100 # in MB
PORT=3000
```

### Start the development server

```bash
npm dev
```

Open:

```
http://localhost:3000
```

---

5.  **Open the application:**
    Navigate to `http://localhost:3000` in your web browser. Create a room by entering any password, and open the same URL on another device or tab with the same password to see the real-time sync in action.
