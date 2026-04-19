# Admin Users API

Base URL: `/admin/users`

All endpoints require an **Admin JWT token** in the `Authorization` header:
```
Authorization: Bearer <admin_token>
```

---

## Endpoints

### 1. Create User

**POST** `/admin/users`

Creates a new user manually.

**Request Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | Yes | Must be a valid, unique email |
| `password` | string | Yes | Minimum 6 characters |
| `serial` | string | Yes | Must be unique |
| `name` | string | No | |
| `status` | string | No | `PENDING` (default), `ACTIVE`, `SUSPENDED` |

**Example Request**
```json
{
  "email": "user@example.com",
  "password": "secret123",
  "serial": "GRK-0001",
  "name": "John Doe",
  "status": "ACTIVE"
}
```

**Example Response** `201 Created`
```json
{
  "message": "User created successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "serial": "GRK-0001",
    "status": "ACTIVE",
    "createdAt": "2026-03-31T10:00:00.000Z",
    "updatedAt": "2026-03-31T10:00:00.000Z"
  }
}
```

**Errors**

| Status | Message |
|---|---|
| `409` | `Email already exists` |
| `409` | `Serial already exists` |
| `400` | Validation errors |

---

### 2. List Users

**GET** `/admin/users`

Returns a paginated list of users with optional filtering and sorting.

**Query Parameters**

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Items per page |
| `search` | string | — | Search by email, name, or serial |
| `status` | string | — | Filter by `PENDING`, `ACTIVE`, or `SUSPENDED` |
| `sortBy` | string | `createdAt` | `createdAt`, `updatedAt`, `email`, `name` |
| `sortOrder` | string | `desc` | `asc` or `desc` |

**Example Request**
```
GET /admin/users?page=1&limit=10&search=john&status=ACTIVE&sortBy=createdAt&sortOrder=desc
```

**Example Response** `200 OK`
```json
{
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "serial": "GRK-0001",
      "status": "ACTIVE",
      "createdAt": "2026-03-31T10:00:00.000Z",
      "updatedAt": "2026-03-31T10:00:00.000Z",
      "_count": {
        "enrollments": 3,
        "purchases": 2,
        "reviews": 1,
        "notifications": 5
      }
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

### 3. Get User Statistics

**GET** `/admin/users/statistics`

Returns a count breakdown of users by status.

**Example Response** `200 OK`
```json
{
  "message": "User statistics retrieved successfully",
  "data": {
    "total": 250,
    "active": 180,
    "pending": 50,
    "suspended": 20
  }
}
```

---

### 4. Get User by ID

**GET** `/admin/users/:id`

Returns full user details including enrollments, purchases, and reviews.

**Example Response** `200 OK`
```json
{
  "message": "User details retrieved successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "serial": "GRK-0001",
    "status": "ACTIVE",
    "createdAt": "2026-03-31T10:00:00.000Z",
    "updatedAt": "2026-03-31T10:00:00.000Z",
    "enrollments": [
      {
        "course": {
          "id": "uuid",
          "title": "Course Title",
          "slug": "course-slug",
          "thumbnail": "https://..."
        }
      }
    ],
    "purchases": [
      {
        "course": { "id": "uuid", "title": "Course Title" },
        "content": { "id": "uuid", "title": "Lesson Title", "type": "VIDEO" }
      }
    ],
    "reviews": [
      {
        "course": { "id": "uuid", "title": "Course Title" }
      }
    ],
    "_count": {
      "enrollments": 3,
      "purchases": 2,
      "reviews": 1,
      "notifications": 5,
      "basketItems": 1
    }
  }
}
```

**Errors**

| Status | Message |
|---|---|
| `404` | `User not found` |

---

### 5. Update User

**PATCH** `/admin/users/:id`

Updates one or more fields on a user. All fields are optional.

**Request Body**

| Field | Type | Notes |
|---|---|---|
| `email` | string | Must be unique |
| `name` | string | |
| `password` | string | Minimum 6 characters, will be hashed |
| `serial` | string | Must be unique |
| `status` | string | `PENDING`, `ACTIVE`, `SUSPENDED` |

**Example Request**
```json
{
  "name": "Jane Doe",
  "status": "ACTIVE"
}
```

**Example Response** `200 OK`
```json
{
  "message": "User updated successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane Doe",
    "serial": "GRK-0001",
    "status": "ACTIVE",
    "createdAt": "2026-03-31T10:00:00.000Z",
    "updatedAt": "2026-03-31T10:01:00.000Z"
  }
}
```

**Errors**

| Status | Message |
|---|---|
| `404` | `User not found` |
| `409` | `Email already exists` |
| `409` | `Serial already exists` |

---

### 6. Suspend User

**POST** `/admin/users/:id/suspend`

Sets the user's status to `SUSPENDED`.

**Example Response** `200 OK`
```json
{
  "message": "User updated successfully",
  "data": {
    "id": "uuid",
    "status": "SUSPENDED",
    ...
  }
}
```

**Errors**

| Status | Message |
|---|---|
| `404` | `User not found` |

---

### 7. Activate User

**POST** `/admin/users/:id/activate`

Sets the user's status to `ACTIVE`.

**Example Response** `200 OK`
```json
{
  "message": "User updated successfully",
  "data": {
    "id": "uuid",
    "status": "ACTIVE",
    ...
  }
}
```

**Errors**

| Status | Message |
|---|---|
| `404` | `User not found` |

---

### 8. Delete User

**DELETE** `/admin/users/:id`

Permanently deletes a user.

**Example Response** `200 OK`
```json
{
  "message": "User deleted successfully"
}
```

**Errors**

| Status | Message |
|---|---|
| `404` | `User not found` |

---

## User Status Values

| Value | Description |
|---|---|
| `PENDING` | Newly created, not yet verified |
| `ACTIVE` | Active and can log in |
| `SUSPENDED` | Blocked from accessing the platform |
