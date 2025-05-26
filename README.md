# Signalcow Webhook Platform

This project provides a web-based platform to manage and interact with Signal messenger bots. It allows users to register, create groups that correspond to Signal groups, and configure webhooks to send messages to these groups via a REST API. The first registered user automatically gains administrative privileges to manage users, groups, and webhooks directly within the frontend interface.

## Core Features

*   **User Authentication:** Secure registration and login for users using JWT.
*   **Automated Admin Assignment:** The first user to register on the platform automatically becomes an administrator.
*   **Group Management:** Users can create, view, edit, and delete "groups" within the platform. Each group is intended to be linked to a Signal group.
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
*   **`signal-cli`:** Installed, configured with a dedicated bot phone number, and running. The API should be accessible by the backend (default: `http://localhost:8080`).
*   **Git:** For version control.

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
        *   Update `DATABASE_URL` (e.g., `postgresql://user:password@host:port/database_name`)
        *   Set `JWT_SECRET` to a long, random string.
        *   Set `BOT_NUMBER` to the phone number your `signal-cli` instance is using (e.g., `+1234567890`).
        *   Set `SIGNAL_CLI_REST_API_URL` (e.g., `http://localhost:8080`).
        *   Set `BASE_URL` for constructing webhook URLs (e.g., `http://localhost:3000` if your backend runs on port 3000).
    *   Ensure your PostgreSQL server is running and the specified database exists. If not, create it.
    *   Run database migrations: `npm run migrate up`
        *   This uses `node-pg-migrate` and the migration files in the root `migrations/` directory.
    *   Start the backend server: `npm start`
        *   The backend typically runs on `http://localhost:3000`.

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

## Admin Routes (Backend) - Deprecated

This section is deprecated. The previous Basic Auth protected HTML admin pages under `/admin/*` have been replaced by the JWT-protected JSON API endpoints under `/api/admin/*` and the integrated frontend admin interface.

## Contributing

Details on contributing, coding standards, and submitting pull requests will be added here.

## License

This project is licensed under the [GNU General Public License v3.0](./LICENSE). 