# Signalcow Webhook Platform

This project provides a web-based platform to create, manage and interact with Webhooks for Signal. It allows users to register, create groups, and configure webhooks to send messages to groups via signal-cli. The first registered user automatically gains administrative privileges to manage users, groups, and webhooks directly within the frontend interface.
Automatic Signal group linking, there's no need for a difficult solution.

## Core Features

*   **User Authentication:** Secure registration and login for users using JWT.
*   **Automated Admin Assignment:** The first user to register on the platform automatically becomes an administrator.
*   **Group Management:** Users can create, view, edit, and delete "groups" within the platform.
*   **Bot Linking Mechanism:** Functionality to generate a link token for associating a bot (running via `signal-cli`) with a platform group and a Signal group.
*   **Webhook Management:**
    *   Create unique webhooks for each group.
    *   View and delete webhooks.
    *   Webhook URLs can be used by external services to send messages to the linked Signal group.
*   **Message Sending:** A public endpoint (`/webhook/:webhookToken`) receives messages and forwards them to the appropriate Signal group using `signal-cli`.
*   **Integrated Admin Interface:** Administrators can manage users, all groups, and all webhooks via a dedicated section within the main frontend application (e.g., `/dashboard/admin`).

## Technology Stack

*   **Frontend:** Next.js (React framework) - located in `frontend/`
*   **Backend:** Node.js with Express.js - located in `backend/`
*   **Database:** PostgreSQL
*   **Signal Integration:** Relies on `signal-cli` for communication with the Signal network.

## Prerequisites

*   **Node.js and npm/yarn:** For both backend and frontend.
*   **PostgreSQL Server:** Running and accessible.
*   **`signal-cli`:** Installed, configured with a dedicated bot phone number, and running. The API should be accessible by the backend.

## Project Structure

```
signalcow/
├── backend/                # Node.js/Express backend
│   ├── config/             # Database configuration (db.js)
│   ├── middleware/         # Authentication middleware (authMiddleware.js, adminAuthMiddleware.js)
│   ├── routes/             # API routes (authRoutes.js, groupRoutes.js, webhookRoutes.js, admin.js)
│   ├── services/           # Business logic (signalService.js)
│   └── server.js           # Main backend server file
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/            # Next.js app router (pages, layouts, components)
│   │   └── ...
│   ├── public/             # Static assets
│   ├── package.json
│   └── ...
├── migrations/             # Database migration files (using node-pg-migrate)
├── .env.example            # Example environment file (copy to .env and configure)
├── .gitignore
├── LICENSE
└── README.md
```

## Setup and Installation

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd signalcow
    ```

2.  **Backend Setup (`backend/`):**
    *   Navigate to the `backend` directory: `cd backend`
    *   Install dependencies: `npm install` (or `yarn install`)
    *   Create a `.env` file by copying `../.env.example` (from the project root) to this directory (`backend/.env`).
        *   Update `DATABASE_URL` to point to your PostgreSQL database. This is crucial. Example: `postgresql://your_db_user:your_db_password@localhost:5432/signalbot_db`
        *   Set `JWT_SECRET` to a long, random string.
        *   Set `BOT_NUMBER` to the phone number your `signal-cli` instance is using (e.g., `+1234567890`).
        *   Set `SIGNAL_CLI_REST_API_URL` (e.g., `http://localhost:8080` if `signal-cli` runs on the same machine with default port, or the appropriate URL if `signal-cli` uses a different port or host, like `http://localhost:7446` if using the port from the `signal-cli.service.example`).
        *   Set `BASE_URL` for constructing webhook URLs (e.g., `http://yourdomain.com` or `http://localhost:PORT_YOUR_BACKEND_RUNS_ON`).
        *   Set `FRONTEND_BASE_URL` (e.g., `http://localhost:3000` or your frontend's public URL) - this is used for generating links in password reset emails.
        *   **Email (SMTP) Configuration (for Password Reset):**
            *   `SMTP_HOST`: Hostname of your SMTP server (e.g., `smtp.example.com`).
            *   `SMTP_PORT`: Port for your SMTP server (e.g., `587` for TLS, `465` for SSL).
            *   `SMTP_USER`: Username for SMTP authentication (e.g., `user@example.com`).
            *   `SMTP_PASS`: Password for SMTP authentication.
            *   `SMTP_FROM_EMAIL`: The "From" address for password reset emails (e.g., `"SignalCow Password Reset" <noreply@example.com>`).
        *   **Database Setup (PostgreSQL):**
            *   Ensure you have a PostgreSQL server installed and running.
            *   You need to create a dedicated database and a user for the application. You can do this using `psql` or a database management tool.
                *   Example using `psql` (connect as a superuser, e.g., `postgres`):
                    ```sql
                    -- Connect to PostgreSQL
                    -- sudo -u postgres psql

                    CREATE DATABASE signalbot_db;
                    CREATE USER signalbot_user WITH PASSWORD 'your_secure_password';
                    GRANT ALL PRIVILEGES ON DATABASE signalbot_db TO signalbot_user;
                    -- Optionally, if you want the user to be able to create tables etc. within a specific schema or the public schema:
                    -- \c signalbot_db
                    -- GRANT ALL ON SCHEMA public TO signalbot_user;
                    ```
                *   Make sure the `DATABASE_URL` in your `backend/.env` file matches the database name, user, password, host, and port you configured.
        *   **Run Database Migrations:**
            *   Once the database is created and the `.env` file is configured, navigate to the `backend/` directory (if not already there).
            *   Run the following command to create the necessary tables and schema in your database:
                ```bash
                npm run migrate up
                ```
            *   This command uses `node-pg-migrate` and executes the migration files located in the project\'s root `migrations/` directory (e.g., `migrations/001_initial_schema.js`). This step is essential for the application to function correctly.
            *   **Troubleshooting Migrations:**
                *   **Naming Convention:** `node-pg-migrate` works best when migration files start with a timestamp (e.g., `1622548800000_initial_schema.js`). To generate a new migration file with the correct naming convention, use:
                    ```bash
                    npm run migrate:create descriptive_migration_name
                    ```
                    Then, add your schema changes to the `up` (and `down`) functions in the newly generated file.
                *   **`Can't determine timestamp` or `No migrations to run!` errors:** This often indicates an issue with the migration filename not matching the expected format, or `node-pg-migrate` thinking a migration has already run (check the `pgmigrations` table in your database). Renaming the file to include a timestamp or creating a new one as described above usually resolves this. You can inspect the `pgmigrations` table in your database (e.g., `SELECT * FROM pgmigrations;` in `psql`) to see which migrations `node-pg-migrate` considers applied.
                *   **`MODULE_TYPELESS_PACKAGE_JSON` Warning:** You might see a Node.js warning about module types if your migration file uses ES Module syntax but your `backend/package.json` does not specify `"type": "module"`. As long as the migration completes successfully, this warning can often be ignored. To resolve it, ensure your migration files use CommonJS syntax (e.g., `exports.up = ...`) or add `"type": "module"` to `backend/package.json` (this will affect all `.js` files in the backend project).
                *   **Verify Schema:** After running `npm run migrate up` successfully, it is crucial to connect to your PostgreSQL database (e.g., using `psql`) and verify that the tables and columns were created as expected. For example:
                    ```bash
                    # Connect to your database, then:
                    \dt # List all tables
                    \d users # Describe the 'users' table to check its columns
                    \d groups # Describe the 'groups' table
                    # etc. for other tables
                    ```
        *   Start the backend server: `npm start`
            *   The backend typically runs on `http://localhost:3000` or the port specified in your `.env` (e.g., via a `PORT` variable if your `server.js` uses it). Check your terminal output and `.env` configuration.

3.  **Frontend Setup (`frontend/`):**
    *   Navigate to the `frontend` directory: `cd ../frontend` (from `backend/`) or `cd frontend` (from project root).
    *   Install dependencies: `npm install` (or `yarn install`)
    *   (Optional) Create a `.env.local` file in the `frontend` directory if you need to override default Next.js environment variables or set frontend-specific ones. For example, to set the API URL:
        ```
        NEXT_PUBLIC_API_URL=http://localhost:3000/api
        ```
    *   Start the Next.js development server: `npm run dev`
        *   The frontend typically runs on `http://localhost:3001` (or another port if 3000 is taken by the backend and Next.js auto-selects). Check your terminal output.

4.  **`signal-cli` Setup:**
    *   Ensure `signal-cli` is running and configured with the phone number specified in the backend's `BOT_NUMBER` environment variable.
    *   The backend needs to be able to reach this API (e.g., at `http://localhost:8080`).
    * Start like this command: `signal-cli --config /opt/signal-cli -u +1234567890 daemon --tcp 0.0.0.0:7446`

## Usage

1.  **Register & Login:** Access the frontend (e.g., `http://localhost:3000`) to register a new user account and log in. The **first user to register will automatically be granted administrator privileges**.
2.  **Create a Group:** Navigate to the groups section and create a new group. This represents a Signal group you want the bot to interact with.
3.  **Link Bot to Signal Group (Partially Manual):**
    *   In the group details page on the frontend, there should be an option to generate/retrieve a "Link Token" and your `BOT_NUMBER`.
    *   You currently need to use `signal-cli` directly (e.g., via curl or a tool like Postman):
        1.  Make the bot (identified by `BOT_NUMBER`) join the target Signal group using its Signal Group ID.
        2.  Send the retrieved "Link Token" as a message *from the bot's number* to that Signal group.
    *   The backend has a mechanism (`POST /api/groups/:groupId/link-token`) to generate this token. The process of the bot sending this token to the group and the platform then automatically recognizing and associating the `signal_group_id` needs to be fully implemented and verified. The `signal_group_id` in the `groups` table is currently expected to be populated after this linking process.
4.  **Create Webhooks:** For a linked group, create one or more webhooks. The platform will provide a unique URL for each webhook.
5.  **Send Messages:** Make a `POST` request to a webhook URL with a JSON payload like:
    ```json
    {
      "message": "Hello from your external service!"
    }
    ```
    The backend will then use `signalService` to send this message to the linked Signal group via `signal-cli`.
6.  **Admin Panel:** If you are the administrator (the first registered user), you can access the admin interface by navigating to the "Admin" section in the dashboard (typically `/dashboard/admin`). Here you can manage all users, groups, and webhooks across the platform.

## API Endpoints (Backend)

All API endpoints are prefixed with `/api`. Authentication is required for most group and webhook management endpoints. Admin-specific endpoints require the user to have admin privileges.

*   **Auth:**
    *   `POST /auth/register`
    *   `POST /auth/login`
    *   `POST /auth/forgot-password`
    *   `POST /auth/reset-password`
    *   `POST /auth/change-password` (Authenticated users)
*   **Groups (User-specific):**
    *   `GET /groups` (Lists groups for the authenticated user)
    *   `POST /groups` (Creates a new group)
    *   `GET /groups/:groupId` (Gets a specific group for the authenticated user)
    *   `PUT /groups/:groupId` (Updates a specific group for the authenticated user)
    *   `DELETE /groups/:groupId` (Deletes a specific group for the authenticated user)
    *   `POST /groups/:groupId/link-token` (Generates/retrieves a token for linking the bot)
    *   `GET /groups/:groupId/webhooks` (Lists webhooks for a specific group of the authenticated user)
    *   `POST /groups/:groupId/webhooks` (Creates a new webhook for a group of the authenticated user)
*   **Webhooks (Management - User-specific for deletion, although creation is via group route):**
    *   Note: Webhook creation is done via `POST /api/groups/:groupId/webhooks`.
    *   Deletion of a specific webhook by its owner would typically be `DELETE /api/groups/:groupId/webhooks/:webhookId` (This needs to be verified/implemented if not already present in groupRoutes.js).
*   **Admin API (`/api/admin` - requires admin privileges):**
    *   `GET /admin/users` (Lists all users)
    *   `DELETE /admin/users/:userId` (Deletes a specific user)
    *   `GET /admin/groups` (Lists all groups in the system)
    *   `DELETE /admin/groups/:groupId` (Deletes a specific group)
    *   `GET /admin/webhooks` (Lists all webhooks in the system)
    *   `DELETE /admin/webhooks/:webhookId` (Deletes a specific webhook)
*   **Webhook (Public Message Receiver):**
    *   `POST /webhook/:webhookToken` (Receives a message to be sent to a Signal group)


## License

This project is licensed under the [GNU General Public License v3.0](./LICENSE).

## Deploying with systemd (Linux)

To run the frontend, backend, and signal-cli services persistently on a Linux server (e.g., Ubuntu), using `systemd` is a recommended approach. This allows the services to start on boot, restart on failure, and manage logging.

Example `systemd` unit files are provided in the root of this repository:
*   `frontend.service.example`
*   `backend.service.example`
*   `signal-cli.service.example`

## Deploying with nginx
Please see nginx.vhost.example.conf


**General Steps for each service:**

1.  **Copy the Example File:**
    Copy the relevant example file (e.g., `frontend.service.example`) to `/etc/systemd/system/frontend.service` (adjusting the target filename as needed, e.g., `signalbot-frontend.service`).
    ```bash
    sudo cp frontend.service.example /etc/systemd/system/frontend.service
    ```

2.  **Edit the Service File:**
    Open the new service file with a text editor (e.g., `sudo vim /etc/systemd/system/frontend.service`) and **carefully review and update all paths and settings** according to your server environment:
    *   `User` and `Group`: Set to a non-privileged user that will run the service.
    *   `WorkingDirectory`: Set to the absolute path where the service's code (e.g., frontend, backend) is located on your server (e.g., `/srv/signalbot/frontend`).
    *   `ExecStart`:
        *   Ensure the command and any paths to executables (like `node`, `npm`, `next`, `signal-cli`) are correct for your server.
        *   For `frontend.service`, ensure you have a production build (e.g., `npm run build`) and update the port if needed.
        *   For `signal-cli.service`, **crucially update** `/PATH_TO_YOUR/signal-cli`, `/PATH_TO_YOUR_SIGNAL_CONFIG_DIR`, and `+YOUR_SIGNAL_NUMBER`. The config directory for `signal-cli` on Linux is often `~/.config/signal-cli` for a user or a system-wide path like `/opt/signal-cli/data` or `/etc/signal-cli/data` depending on your installation method.
    *   `Environment`: Set necessary environment variables (e.g., `NODE_ENV=production`, `DATABASE_URL`, `PORTs`).

3.  **Reload systemd Daemon:**
    After creating or modifying a service file, tell systemd to reload its configuration:
    ```bash
    sudo systemctl daemon-reload
    ```

4.  **Enable the Service (to start on boot):**
    ```bash
    sudo systemctl enable frontend.service
    ```
    (Use the actual filename you chose, e.g., `signalbot-frontend.service`)

5.  **Start the Service Manually:**
    ```bash
    sudo systemctl start frontend.service
    ```

6.  **Check the Service Status:**
    ```bash
    sudo systemctl status frontend.service
    ```
    This will show if the service is active (running) and display recent log entries. Look for any errors.

7.  **View Logs:**
    To view more detailed logs or follow them live:
    ```bash
    journalctl -u frontend.service
    journalctl -u frontend.service -f # Follow live logs
    ```

**Important Considerations:**

*   **Permissions:** Ensure the user specified in the service file has the necessary read/write/execute permissions for the `WorkingDirectory`, any config files, and log directories.
*   **Firewall:** Make sure any ports your services listen on (e.g., frontend port, backend port, `signal-cli` port 7446) are opened in your server's firewall (e.g., `ufw`) if you don't use a webserver and reverse proxy.
    Example for `ufw`:
    ```bash
    sudo ufw allow 3000/tcp # Example for frontend
    sudo ufw allow 8000/tcp # Example for backend
    sudo ufw allow 7446/tcp # For signal-cli
    sudo ufw enable
    sudo ufw status
    ```
*   **Production Builds:** Always use production builds for your frontend and backend services for better performance and security. Run in /frontend `npx build`.
*   **Database Service:** If your backend depends on a database, ensure the database service (e.g., `postgresql.service`) is started before your backend. You can add it to the `After=` and `Wants=` directives in your `backend.service` file:
    ```systemd
    [Unit]
    Description=My Backend Service
    After=network.target postgresql.service
    Wants=postgresql.service
    ...
    ```

Repeat these steps for `backend.service`, adjusting names and paths accordingly. 