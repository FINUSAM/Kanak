export const openApiSpec = {
  "openapi": "3.0.0",
  "info": {
    "title": "Kanak API",
    "version": "1.1.0",
    "description": "Backend API specification for Kanak, a group expense tracker with role-based access, invitation systems, and complex transaction splitting."
  },
  "servers": [
    {
      "url": "https://api.kanak.app/v1",
      "description": "Production Server"
    },
    {
      "url": "http://localhost:3000/api",
      "description": "Local Development"
    }
  ],
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    },
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "username": { "type": "string" },
          "email": { "type": "string", "format": "email" }
        },
        "required": ["id", "username", "email"]
      },
      "UserRole": {
        "type": "string",
        "enum": ["OWNER", "ADMIN", "EDITOR", "CONTRIBUTOR", "VIEWER", "GUEST"],
        "description": "Role of the member. OWNER cannot be assigned via the API. GUEST role implies a virtual user managed directly by the group."
      },
      "Member": {
        "type": "object",
        "properties": {
          "userId": { "type": "string", "format": "uuid" },
          "username": { "type": "string" },
          "role": { "$ref": "#/components/schemas/UserRole" },
          "joinedAt": { "type": "string", "format": "date-time" }
        }
      },
      "Group": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "name": { "type": "string" },
          "description": { "type": "string" },
          "members": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/Member" }
          },
          "createdAt": { "type": "string", "format": "date-time" },
          "createdBy": { "type": "string", "format": "uuid" }
        }
      },
      "InvitationStatus": {
        "type": "string",
        "enum": ["PENDING", "ACCEPTED", "REJECTED"]
      },
      "Invitation": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "groupId": { "type": "string", "format": "uuid" },
          "groupName": { "type": "string" },
          "inviterId": { "type": "string", "format": "uuid" },
          "inviterName": { "type": "string" },
          "inviteeId": { "type": "string", "format": "uuid" },
          "inviteeEmail": { "type": "string", "format": "email" },
          "role": { "$ref": "#/components/schemas/UserRole" },
          "status": { "$ref": "#/components/schemas/InvitationStatus" },
          "createdAt": { "type": "string", "format": "date-time" }
        }
      },
      "TransactionType": {
        "type": "string",
        "enum": ["DEBIT", "CREDIT"],
        "description": "DEBIT represents 'Received' (Red) transactions (Income/Taking Value). CREDIT represents 'Paid' (Green) transactions (Expense/Giving Value)."
      },
      "SplitMode": {
        "type": "string",
        "enum": ["EQUAL", "PERCENTAGE", "AMOUNT"]
      },
      "TransactionSplit": {
        "type": "object",
        "properties": {
          "userId": { "type": "string", "format": "uuid" },
          "amount": { "type": "number", "format": "float" },
          "percentage": { "type": "number", "format": "float", "description": "Optional percentage value if mode is PERCENTAGE" }
        },
        "required": ["userId", "amount"]
      },
      "Transaction": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "groupId": { "type": "string", "format": "uuid" },
          "type": { "$ref": "#/components/schemas/TransactionType" },
          "amount": { "type": "number", "format": "float" },
          "description": { "type": "string" },
          "category": { "type": "string" },
          "date": { "type": "string", "format": "date-time" },
          "createdBy": { "type": "string" },
          "createdById": { "type": "string", "format": "uuid" },
          "payerId": { "type": "string", "format": "uuid", "description": "ID of the user who actually paid or received the funds. Defaults to createdById." },
          "involvedUserIds": {
            "type": "array",
            "items": { "type": "string", "format": "uuid" },
            "description": "Deprecated. Use splits array to determine involved parties."
          },
          "splitMode": { "$ref": "#/components/schemas/SplitMode" },
          "splits": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/TransactionSplit" }
          }
        }
      }
    }
  },
  "security": [
    { "bearerAuth": [] }
  ],
  "paths": {
    "/auth/register": {
      "post": {
        "summary": "Register a new user",
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "username": { "type": "string" },
                  "email": { "type": "string", "format": "email" },
                  "password": { "type": "string" }
                },
                "required": ["username", "email", "password"]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "User created",
            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/User" } } }
          },
          "400": { "description": "User already exists" }
        }
      }
    },
    "/auth/login": {
      "post": {
        "summary": "Login user",
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "email": { "type": "string", "format": "email" },
                  "password": { "type": "string" }
                },
                "required": ["email", "password"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Login successful (returns token in real impl)",
            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/User" } } }
          },
          "404": { "description": "User not found" },
          "401": { "description": "Invalid credentials" }
        }
      }
    },
    "/invitations": {
      "get": {
        "summary": "Get pending invitations for the current user",
        "responses": {
          "200": {
            "description": "List of pending invitations",
            "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/Invitation" } } } }
          }
        }
      }
    },
    "/invitations/{invitationId}/respond": {
      "post": {
        "summary": "Accept or Reject an invitation",
        "parameters": [
          { "name": "invitationId", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "accept": { "type": "boolean" }
                },
                "required": ["accept"]
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Invitation responded" },
          "404": { "description": "Invitation not found" }
        }
      }
    },
    "/groups": {
      "get": {
        "summary": "Get groups for current user",
        "responses": {
          "200": {
            "description": "List of groups",
            "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/Group" } } } }
          }
        }
      },
      "post": {
        "summary": "Create a new group",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": { "type": "string" },
                  "description": { "type": "string" }
                },
                "required": ["name"]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Group created",
            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Group" } } }
          }
        }
      }
    },
    "/groups/{groupId}": {
      "get": {
        "summary": "Get group details",
        "parameters": [
          { "name": "groupId", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": {
            "description": "Group details",
            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Group" } } }
          },
          "404": { "description": "Group not found" }
        }
      }
    },
    "/groups/{groupId}/invitations": {
      "get": {
        "summary": "Get pending invitations for a specific group (Admin only)",
        "parameters": [
          { "name": "groupId", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": {
            "description": "List of group invitations",
            "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/Invitation" } } } }
          }
        }
      }
    },
    "/groups/{groupId}/members": {
      "post": {
        "summary": "Add or Invite member to group",
        "description": "Adds a member. If role is GUEST, adds directly. If role is standard (ADMIN, EDITOR, etc.), sends invitation or adds existing user.",
        "parameters": [
          { "name": "groupId", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "identifier": { 
                    "type": "string",
                    "description": "For standard users, provide the Email. For GUEST role, provide the Name." 
                  },
                  "role": { "$ref": "#/components/schemas/UserRole" }
                },
                "required": ["identifier", "role"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Member added (or invited)",
            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Group" } } }
          }
        }
      }
    },
    "/groups/{groupId}/transactions": {
      "get": {
        "summary": "Get transactions for a group",
        "parameters": [
          { "name": "groupId", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": {
            "description": "List of transactions",
            "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/Transaction" } } } }
          }
        }
      },
      "post": {
        "summary": "Add a transaction",
        "parameters": [
          { "name": "groupId", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "type": { "$ref": "#/components/schemas/TransactionType" },
                  "amount": { "type": "number" },
                  "description": { "type": "string" },
                  "category": { "type": "string" },
                  "payerId": { "type": "string", "format": "uuid" },
                  "splitMode": { "$ref": "#/components/schemas/SplitMode" },
                  "splits": { 
                    "type": "array", 
                    "items": { "$ref": "#/components/schemas/TransactionSplit" }
                  }
                },
                "required": ["type", "amount", "description", "splitMode", "splits"]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Transaction created",
            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Transaction" } } }
          }
        }
      }
    },
    "/groups/{groupId}/transactions/{transactionId}": {
      "put": {
        "summary": "Update a transaction",
        "parameters": [
          { "name": "groupId", "in": "path", "required": true, "schema": { "type": "string" } },
          { "name": "transactionId", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Transaction"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Transaction updated",
            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Transaction" } } }
          },
          "404": { "description": "Transaction not found" }
        }
      },
      "delete": {
        "summary": "Delete a transaction",
        "parameters": [
          { "name": "groupId", "in": "path", "required": true, "schema": { "type": "string" } },
          { "name": "transactionId", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Transaction deleted" },
          "404": { "description": "Transaction not found" }
        }
      }
    }
  }
};