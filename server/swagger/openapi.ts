import type { OpenAPIV3 } from "openapi-types";

export function getApiDocs(): OpenAPIV3.Document {
  return {
    openapi: "3.0.0",
    info: {
      title: "Income Tracker API",
      version: "1.0.0",
      description:
        "REST API for the Income Tracker application. Manages transactions, categories, budgets, notifications, and user profiles.",
    },
    servers: [{ url: "/api", description: "API base path" }],
    tags: [
      { name: "Health", description: "Health check endpoints" },
      { name: "Auth", description: "Authentication (Better Auth)" },
      { name: "Admin", description: "Admin-only endpoints" },
      { name: "Categories", description: "Transaction categories" },
      { name: "Transactions", description: "Income and expense transactions" },
      { name: "Budgets", description: "Category and overall spending budgets" },
      { name: "Dashboard", description: "Dashboard summary data" },
      { name: "Insights", description: "Financial insights and analytics" },
      { name: "Notifications", description: "User notifications" },
      { name: "User", description: "User profile and account" },
    ],
    paths: {
      // ─── Health ──────────────────────────────────────────────────────────
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Health check",
          description:
            "Returns service health status including database connectivity.",
          responses: {
            "200": {
              description: "Service is healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", enum: ["ok"] },
                      timestamp: { type: "string", format: "date-time" },
                      database: { type: "string", enum: ["connected"] },
                    },
                  },
                },
              },
            },
            "503": {
              description: "Service is degraded",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", enum: ["degraded"] },
                      timestamp: { type: "string", format: "date-time" },
                      database: { type: "string", enum: ["disconnected"] },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ─── Admin ───────────────────────────────────────────────────────────
      "/admin/users": {
        get: {
          tags: ["Admin"],
          summary: "List all users",
          description:
            "Returns up to 50 users ordered by creation date. Requires ADMIN role.",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "List of users",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/AdminUser" },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── Categories ──────────────────────────────────────────────────────
      "/categories": {
        get: {
          tags: ["Categories"],
          summary: "List categories",
          description:
            "Returns system categories and the authenticated user's custom categories.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "type",
              in: "query",
              description: "Filter by category type",
              schema: { type: "string", enum: ["INCOME", "EXPENSE"] },
            },
          ],
          responses: {
            "200": {
              description: "List of categories",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Category" },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
        post: {
          tags: ["Categories"],
          summary: "Create category",
          description:
            "Creates a new custom category. Duplicate names (case-insensitive) within the same type are rejected.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateCategoryBody" },
              },
            },
          },
          responses: {
            "201": {
              description: "Category created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Category" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "422": {
              description: "Duplicate category name",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/categories/{id}": {
        get: {
          tags: ["Categories"],
          summary: "Get category by ID",
          description:
            "Returns a system category or a category owned by the user.",
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/IdParam" }],
          responses: {
            "200": {
              description: "Category found",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Category" },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "404": { $ref: "#/components/responses/NotFound" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
        patch: {
          tags: ["Categories"],
          summary: "Update category",
          description:
            "Updates a custom category. System categories cannot be edited.",
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/IdParam" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateCategoryBody" },
              },
            },
          },
          responses: {
            "200": {
              description: "Category updated",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Category" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "404": { $ref: "#/components/responses/NotFound" },
            "422": {
              description: "Duplicate category name",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
        delete: {
          tags: ["Categories"],
          summary: "Delete category",
          description:
            "Deletes a custom category. System categories cannot be deleted.",
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/IdParam" }],
          responses: {
            "204": { description: "Category deleted" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "404": { $ref: "#/components/responses/NotFound" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── Transactions ────────────────────────────────────────────────────
      "/transactions": {
        get: {
          tags: ["Transactions"],
          summary: "List transactions",
          description:
            "Returns paginated transactions with filtering, search, and date range support. INCOME transactions include a computed summary (total, spent, remaining, percentage).",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "type",
              in: "query",
              schema: { type: "string", enum: ["INCOME", "EXPENSE"] },
            },
            {
              name: "from",
              in: "query",
              description: "Start date (ISO 8601)",
              schema: { type: "string", format: "date-time" },
            },
            {
              name: "to",
              in: "query",
              description: "End date (ISO 8601)",
              schema: { type: "string", format: "date-time" },
            },
            {
              name: "categoryIds",
              in: "query",
              description: "Comma-separated category IDs",
              schema: { type: "string" },
            },
            {
              name: "amountMin",
              in: "query",
              schema: { type: "number", minimum: 0 },
            },
            {
              name: "amountMax",
              in: "query",
              schema: { type: "number", minimum: 0 },
            },
            {
              name: "income_id",
              in: "query",
              description: "Filter expenses by linked income source",
              schema: { type: "string" },
            },
            {
              name: "q",
              in: "query",
              description:
                "Search across source_name, notes, and category name",
              schema: { type: "string" },
            },
            { $ref: "#/components/parameters/PageParam" },
            { $ref: "#/components/parameters/PageSizeParam" },
          ],
          responses: {
            "200": {
              description: "Paginated transactions",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Transaction" },
                      },
                      meta: { $ref: "#/components/schemas/PaginationMeta" },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
        post: {
          tags: ["Transactions"],
          summary: "Create transaction",
          description:
            "Creates a new income or expense. Expenses can be linked to an income source via income_id for budget tracking. Triggers push notifications for new transactions and low balance warnings (>=80% spent).",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateTransactionBody" },
              },
            },
          },
          responses: {
            "201": {
              description: "Transaction created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Transaction" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": {
              description: "Category or income source not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "422": {
              description: "Insufficient balance on linked income source",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/Error" },
                      {
                        type: "object",
                        properties: {
                          details: {
                            type: "object",
                            properties: {
                              total: { type: "number" },
                              spent: { type: "number" },
                              remaining: { type: "number" },
                              requested: { type: "number" },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/transactions/batch": {
        post: {
          tags: ["Transactions"],
          summary: "Create multiple transactions",
          description:
            "Creates up to 20 income and/or expense transactions in a single atomic request. Validates category ownership/type and cumulative income-source balance across the whole batch (multiple expenses drawing from the same income source cannot collectively overspend it). Triggers a transaction-added notification per item and a single low-balance check per affected income source.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CreateTransactionsBatchBody",
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Transactions created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Transaction" },
                      },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "404": {
              description:
                "A category or income source referenced in the batch was not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "422": {
              description:
                "Insufficient cumulative balance on a linked income source, or request body failed validation",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/Error" },
                      {
                        type: "object",
                        properties: {
                          details: {
                            type: "object",
                            properties: {
                              remaining: { type: "number" },
                              requested: { type: "number" },
                            },
                          },
                          issues: { type: "object" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/transactions/{id}": {
        get: {
          tags: ["Transactions"],
          summary: "Get transaction by ID",
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/IdParam" }],
          responses: {
            "200": {
              description: "Transaction found",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Transaction" },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "404": { $ref: "#/components/responses/NotFound" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
        patch: {
          tags: ["Transactions"],
          summary: "Update transaction",
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/IdParam" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateTransactionBody" },
              },
            },
          },
          responses: {
            "200": {
              description: "Transaction updated",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Transaction" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "404": { $ref: "#/components/responses/NotFound" },
            "422": {
              description: "Insufficient balance on linked income source",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
        delete: {
          tags: ["Transactions"],
          summary: "Delete transaction",
          description:
            "Deletes a transaction. If deleting an INCOME with linked expenses, those expenses are unlinked first.",
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/IdParam" }],
          responses: {
            "204": { description: "Transaction deleted" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "404": { $ref: "#/components/responses/NotFound" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/transactions/income/{id}/summary": {
        get: {
          tags: ["Transactions"],
          summary: "Get income transaction with expense summary",
          description:
            "Returns an INCOME transaction with computed summary: total, spent, remaining, and percentage spent.",
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/IdParam" }],
          responses: {
            "200": {
              description: "Income transaction with summary",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        allOf: [
                          { $ref: "#/components/schemas/Transaction" },
                          {
                            type: "object",
                            properties: {
                              summary: {
                                $ref: "#/components/schemas/IncomeSummary",
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Transaction is not an income type",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "404": { $ref: "#/components/responses/NotFound" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── Budgets ─────────────────────────────────────────────────────────
      "/budgets": {
        post: {
          tags: ["Budgets"],
          summary: "Create budget(s)",
          description:
            "Creates up to 20 budgets in a single atomic request. Each budget targets a specific category or, when category_id is null, an overall spending budget across all expenses. A user may have at most one active (non-archived) budget per category/period combination.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateBudgetsBatchBody" },
              },
            },
          },
          responses: {
            "201": {
              description: "Budgets created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Budget" },
                      },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "409": {
              description:
                "An active budget for this category and period already exists",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "422": {
              description: "Request body failed validation",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/Error" },
                      {
                        type: "object",
                        properties: { issues: { type: "object" } },
                      },
                    ],
                  },
                },
              },
            },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/budgets/{id}": {
        put: {
          tags: ["Budgets"],
          summary: "Update budget",
          description:
            "Updates amount, period, and/or start_date on an active budget. Archived budgets cannot be updated.",
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/IdParam" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateBudgetBody" },
              },
            },
          },
          responses: {
            "200": {
              description: "Budget updated",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Budget" },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Invalid request, or budget is archived",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "404": { $ref: "#/components/responses/NotFound" },
            "422": {
              description: "Request body failed validation",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/Error" },
                      {
                        type: "object",
                        properties: { issues: { type: "object" } },
                      },
                    ],
                  },
                },
              },
            },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
        delete: {
          tags: ["Budgets"],
          summary: "Delete budget",
          description:
            "Permanently deletes a budget. This is a hard delete with no recovery — use POST /budgets/{id}/archive instead to preserve historical record.",
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/IdParam" }],
          responses: {
            "200": {
              description: "Budget deleted",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          deleted: { type: "boolean", example: true },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "404": { $ref: "#/components/responses/NotFound" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/budgets/{id}/archive": {
        post: {
          tags: ["Budgets"],
          summary: "Archive budget",
          description:
            "Soft-deletes a budget, preserving its historical record while freeing up its category/period slot for a new active budget.",
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/IdParam" }],
          responses: {
            "200": {
              description: "Budget archived",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Budget" },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Budget is already archived",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "404": { $ref: "#/components/responses/NotFound" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/budgets/{id}/restore": {
        post: {
          tags: ["Budgets"],
          summary: "Restore archived budget",
          description:
            "Un-archives a previously archived budget. Fails with 409 if an active budget now occupies the same category/period slot.",
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/IdParam" }],
          responses: {
            "200": {
              description: "Budget restored",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Budget" },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Budget is not archived",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "404": { $ref: "#/components/responses/NotFound" },
            "409": {
              description:
                "An active budget already exists for this category and period",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── Dashboard ───────────────────────────────────────────────────────
      "/dashboard/summary": {
        get: {
          tags: ["Dashboard"],
          summary: "Get dashboard summary",
          description:
            "Returns net worth, period totals (income, expenses, savings, savings rate), recent transactions, daily chart data, and budget utilization.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "period",
              in: "query",
              schema: {
                type: "string",
                enum: ["week", "month", "year"],
                default: "month",
              },
            },
          ],
          responses: {
            "200": {
              description: "Dashboard summary",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/DashboardSummary" },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── Insights ────────────────────────────────────────────────────────
      "/insights": {
        get: {
          tags: ["Insights"],
          summary: "Get financial insights",
          description:
            "Returns period-over-period comparisons, spending/income breakdowns by category, top income sources, budget utilization, and generated observations.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "period",
              in: "query",
              schema: {
                type: "string",
                enum: ["week", "month", "year"],
                default: "month",
              },
            },
          ],
          responses: {
            "200": {
              description: "Financial insights",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/InsightsData" },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── Notifications ───────────────────────────────────────────────────
      "/notifications": {
        get: {
          tags: ["Notifications"],
          summary: "List notifications",
          security: [{ bearerAuth: [] }],
          parameters: [
            { $ref: "#/components/parameters/PageParam" },
            { $ref: "#/components/parameters/PageSizeParam" },
            {
              name: "unread",
              in: "query",
              description: 'Set to "true" to filter unread only',
              schema: { type: "string", enum: ["true"] },
            },
          ],
          responses: {
            "200": {
              description: "Paginated notifications",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Notification" },
                      },
                      meta: {
                        allOf: [
                          { $ref: "#/components/schemas/PaginationMeta" },
                          {
                            type: "object",
                            properties: {
                              unread_count: { type: "integer" },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
        patch: {
          tags: ["Notifications"],
          summary: "Mark all notifications as read",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "All notifications marked as read",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "object",
                        properties: {
                          marked_read: { type: "boolean", example: true },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/notifications/{id}": {
        delete: {
          tags: ["Notifications"],
          summary: "Delete notification",
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/IdParam" }],
          responses: {
            "204": { description: "Notification deleted" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "404": { $ref: "#/components/responses/NotFound" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/notifications/{id}/read": {
        patch: {
          tags: ["Notifications"],
          summary: "Mark notification as read",
          security: [{ bearerAuth: [] }],
          parameters: [{ $ref: "#/components/parameters/IdParam" }],
          responses: {
            "200": {
              description: "Notification marked as read",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "object",
                        properties: {
                          marked_read: { type: "boolean", example: true },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "403": { $ref: "#/components/responses/Forbidden" },
            "404": { $ref: "#/components/responses/NotFound" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/notifications/token": {
        post: {
          tags: ["Notifications"],
          summary: "Register push notification token",
          description:
            "Upserts a push notification token for the authenticated user.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["token", "platform"],
                  properties: {
                    token: { type: "string" },
                    platform: { type: "string", enum: ["ios", "android"] },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Token registered",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "object",
                        properties: {
                          registered: { type: "boolean", example: true },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
        delete: {
          tags: ["Notifications"],
          summary: "Unregister push notification token",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["token"],
                  properties: {
                    token: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Token unregistered",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "object",
                        properties: {
                          unregistered: { type: "boolean", example: true },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },

      // ─── User ────────────────────────────────────────────────────────────
      "/user/profile": {
        get: {
          tags: ["User"],
          summary: "Get current user profile",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "User profile",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/UserProfile" },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
        patch: {
          tags: ["User"],
          summary: "Update user profile",
          description:
            "Updates user profile fields. Username must be 3-30 chars (alphanumeric, dots, underscores) and unique. Phone must be 7-15 digits with optional leading +. Bio max 160 characters.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateProfileBody" },
              },
            },
          },
          responses: {
            "200": {
              description: "Profile updated",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/UserProfile" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "422": {
              description: "Username already taken",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/user/activity": {
        get: {
          tags: ["User"],
          summary: "Get recent transactions",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 5, minimum: 1 },
            },
          ],
          responses: {
            "200": {
              description: "Recent transactions",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/ActivityItem" },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/user/stats": {
        get: {
          tags: ["User"],
          summary: "Get user statistics",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "User statistics",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/UserStats" },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
      "/user/account": {
        delete: {
          tags: ["User"],
          summary: "Delete user account",
          description:
            "Permanently deletes the user account and all associated data (transactions, categories, notifications, push tokens).",
          security: [{ bearerAuth: [] }],
          responses: {
            "204": { description: "Account deleted" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "500": { $ref: "#/components/responses/InternalServerError" },
          },
        },
      },
    },

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Session-based authentication via Better Auth",
        },
      },
      parameters: {
        IdParam: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
        PageParam: {
          name: "page",
          in: "query",
          schema: { type: "integer", default: 1, minimum: 1 },
        },
        PageSizeParam: {
          name: "pageSize",
          in: "query",
          schema: { type: "integer", default: 20, minimum: 1 },
        },
      },
      responses: {
        BadRequest: {
          description: "Invalid request",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        Unauthorized: {
          description: "Authentication required",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        Forbidden: {
          description: "Insufficient permissions",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        NotFound: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
        InternalServerError: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
          required: ["error"],
        },
        PaginationMeta: {
          type: "object",
          properties: {
            total: { type: "integer" },
            page: { type: "integer" },
            pageSize: { type: "integer" },
            pageCount: { type: "integer" },
          },
        },
        AdminUser: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string", nullable: true },
            email: { type: "string", format: "email" },
            username: { type: "string", nullable: true },
            role: { type: "string", enum: ["USER", "ADMIN"] },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Category: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            icon: { type: "string" },
            color: { type: "string" },
            description: { type: "string", nullable: true },
            type: { type: "string", enum: ["INCOME", "EXPENSE"] },
            is_system: { type: "boolean" },
            user_id: { type: "string", nullable: true },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        CreateCategoryBody: {
          type: "object",
          required: ["name", "icon", "color", "type"],
          properties: {
            name: { type: "string" },
            icon: { type: "string" },
            color: { type: "string" },
            description: { type: "string", nullable: true },
            type: { type: "string", enum: ["INCOME", "EXPENSE"] },
          },
        },
        UpdateCategoryBody: {
          type: "object",
          properties: {
            name: { type: "string" },
            icon: { type: "string" },
            color: { type: "string" },
            description: { type: "string", nullable: true },
          },
        },
        Transaction: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: { type: "string", enum: ["INCOME", "EXPENSE"] },
            amount: { type: "number", format: "double" },
            category_id: { type: "string" },
            user_id: { type: "string" },
            income_id: { type: "string", nullable: true },
            source_name: { type: "string", nullable: true },
            notes: { type: "string", nullable: true },
            receipt_url: { type: "string", nullable: true },
            tag: {
              type: "string",
              enum: ["Monthly", "Bonus", "One-time"],
              nullable: true,
            },
            recorded_at: { type: "string", format: "date-time" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
            category: { $ref: "#/components/schemas/CategoryBrief" },
            income: {
              nullable: true,
              allOf: [{ $ref: "#/components/schemas/TransactionBrief" }],
            },
            expenses: {
              type: "array",
              items: { $ref: "#/components/schemas/TransactionBrief" },
            },
            summary: { $ref: "#/components/schemas/IncomeSummary" },
          },
        },
        TransactionBrief: {
          type: "object",
          properties: {
            id: { type: "string" },
            amount: { type: "number" },
            source_name: { type: "string", nullable: true },
            notes: { type: "string", nullable: true },
            tag: {
              type: "string",
              enum: ["Monthly", "Bonus", "One-time"],
              nullable: true,
            },
            recorded_at: { type: "string", format: "date-time" },
            created_at: { type: "string", format: "date-time" },
            category: { $ref: "#/components/schemas/CategoryBrief" },
          },
        },
        CategoryBrief: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            icon: { type: "string" },
            color: { type: "string" },
            type: { type: "string", enum: ["INCOME", "EXPENSE"] },
          },
        },
        IncomeSummary: {
          type: "object",
          properties: {
            total: { type: "number" },
            spent: { type: "number" },
            remaining: { type: "number" },
            percentage: { type: "integer" },
          },
        },
        CreateTransactionBody: {
          type: "object",
          required: ["type", "amount", "category_id", "recorded_at"],
          properties: {
            type: { type: "string", enum: ["INCOME", "EXPENSE"] },
            amount: { type: "number", minimum: 0, exclusiveMinimum: true },
            category_id: { type: "string" },
            income_id: {
              type: "string",
              description:
                "Link expense to an income source for budget tracking",
            },
            source_name: { type: "string" },
            notes: { type: "string" },
            receipt_url: { type: "string" },
            tag: { type: "string", enum: ["Monthly", "Bonus", "One-time"] },
            recorded_at: {
              type: "string",
              format: "date-time",
              description: "Date the transaction was recorded (ISO 8601)",
            },
          },
        },
        CreateTransactionsBatchBody: {
          type: "object",
          required: ["transactions"],
          properties: {
            transactions: {
              type: "array",
              minItems: 1,
              maxItems: 20,
              items: { $ref: "#/components/schemas/CreateTransactionBody" },
            },
          },
        },
        UpdateTransactionBody: {
          type: "object",
          properties: {
            amount: { type: "number", minimum: 0, exclusiveMinimum: true },
            category_id: { type: "string" },
            income_id: { type: "string", nullable: true },
            source_name: { type: "string" },
            notes: { type: "string" },
            receipt_url: { type: "string" },
            tag: {
              type: "string",
              enum: ["Monthly", "Bonus", "One-time"],
              nullable: true,
            },
            recorded_at: { type: "string", format: "date-time" },
          },
        },
        Budget: {
          type: "object",
          properties: {
            id: { type: "string" },
            user_id: { type: "string" },
            category_id: { type: "string", nullable: true },
            category: {
              nullable: true,
              allOf: [{ $ref: "#/components/schemas/CategoryBrief" }],
            },
            amount: { type: "number", format: "double" },
            period: { type: "string", enum: ["WEEKLY", "MONTHLY", "YEARLY"] },
            start_date: { type: "string", format: "date-time" },
            is_archived: { type: "boolean" },
            archived_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            spent: {
              type: "number",
              description:
                "Sum of matching expenses within the current period window",
            },
            remaining: { type: "number" },
            percent_used: { type: "number" },
            period_start: { type: "string", format: "date-time" },
            period_end: { type: "string", format: "date-time" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        CreateBudgetBody: {
          type: "object",
          required: ["amount", "period", "start_date"],
          properties: {
            category_id: {
              type: "string",
              nullable: true,
              description:
                "Category to budget for. Omit or set null for an overall budget across all expenses.",
            },
            amount: { type: "number", minimum: 0, exclusiveMinimum: true },
            period: { type: "string", enum: ["WEEKLY", "MONTHLY", "YEARLY"] },
            start_date: {
              type: "string",
              format: "date-time",
              description:
                "Anchor date used to compute the recurring period window (ISO 8601)",
            },
          },
        },
        CreateBudgetsBatchBody: {
          type: "object",
          required: ["budgets"],
          properties: {
            budgets: {
              type: "array",
              minItems: 1,
              maxItems: 20,
              items: { $ref: "#/components/schemas/CreateBudgetBody" },
            },
          },
        },
        UpdateBudgetBody: {
          type: "object",
          properties: {
            amount: { type: "number", minimum: 0, exclusiveMinimum: true },
            period: { type: "string", enum: ["WEEKLY", "MONTHLY", "YEARLY"] },
            start_date: { type: "string", format: "date-time" },
          },
        },
        DashboardSummary: {
          type: "object",
          properties: {
            net_worth: {
              type: "object",
              properties: {
                total: { type: "number" },
                total_income: { type: "number" },
                total_expenses: { type: "number" },
              },
            },
            period: {
              type: "object",
              properties: {
                label: { type: "string" },
                from: { type: "string", format: "date-time" },
                to: { type: "string", format: "date-time" },
                income: { type: "number" },
                expenses: { type: "number" },
                savings: { type: "number" },
                savings_rate: { type: "integer" },
              },
            },
            recent: {
              type: "array",
              items: { $ref: "#/components/schemas/RecentTransaction" },
            },
            chart: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string", format: "date" },
                  income: { type: "number" },
                  expense: { type: "number" },
                },
              },
            },
            budgets: {
              type: "object",
              description: "Budget data for the current period",
              properties: {
                items: {
                  type: "array",
                  items: { $ref: "#/components/schemas/DashboardBudgetItem" },
                },
                summary: { $ref: "#/components/schemas/BudgetSummary" },
              },
            },
          },
        },
        RecentTransaction: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: { type: "string", enum: ["INCOME", "EXPENSE"] },
            amount: { type: "number" },
            source_name: { type: "string", nullable: true },
            recorded_at: { type: "string", format: "date-time" },
            category: { $ref: "#/components/schemas/CategoryBrief" },
            isIncome: { type: "boolean" },
          },
        },
        DashboardBudgetItem: {
          type: "object",
          description:
            "Budget item with spending calculation for the current period",
          properties: {
            id: { type: "string" },
            category: { $ref: "#/components/schemas/CategoryBrief" },
            amount: { type: "number", description: "Budgeted amount" },
            spent: {
              type: "number",
              description: "Amount spent in the period",
            },
            remaining: { type: "number", description: "Remaining budget" },
            percentage: {
              type: "integer",
              description: "Percentage of budget used",
            },
            period: { type: "string", enum: ["WEEKLY", "MONTHLY", "YEARLY"] },
            start_date: { type: "string", format: "date-time" },
            is_over_budget: { type: "boolean" },
          },
        },
        BudgetSummary: {
          type: "object",
          description: "Overall budget summary across all budgets",
          properties: {
            total_budget: { type: "number" },
            total_spent: { type: "number" },
            total_remaining: { type: "number" },
            overall_percentage: { type: "integer" },
            is_overall_over_budget: { type: "boolean" },
          },
        },
        InsightsData: {
          type: "object",
          properties: {
            period: {
              type: "object",
              properties: {
                label: { type: "string" },
                from: { type: "string", format: "date-time" },
                to: { type: "string", format: "date-time" },
              },
            },
            summary: {
              type: "object",
              properties: {
                income: { type: "number" },
                expenses: { type: "number" },
                savings: { type: "number" },
                savings_rate: { type: "integer" },
              },
            },
            comparison: {
              type: "object",
              properties: {
                income_change: { type: "number" },
                expense_change: { type: "number" },
                savings_change: { type: "number" },
                prev_income: { type: "number" },
                prev_expenses: { type: "number" },
                prev_savings: { type: "number" },
              },
            },
            spending_by_category: {
              type: "array",
              items: { $ref: "#/components/schemas/CategorySlice" },
            },
            income_by_category: {
              type: "array",
              items: { $ref: "#/components/schemas/CategorySlice" },
            },
            income_sources: {
              type: "array",
              items: { $ref: "#/components/schemas/IncomeSource" },
            },
            observations: {
              type: "array",
              items: { type: "string" },
            },
            budgets: {
              type: "array",
              items: { $ref: "#/components/schemas/DashboardBudgetItem" },
            },
          },
        },
        CategorySlice: {
          type: "object",
          properties: {
            category_id: { type: "string" },
            name: { type: "string" },
            icon: { type: "string" },
            color: { type: "string" },
            amount: { type: "number" },
            count: { type: "integer" },
            percentage: { type: "integer" },
          },
        },
        IncomeSource: {
          type: "object",
          properties: {
            id: { type: "string" },
            source_name: { type: "string", nullable: true },
            category: { $ref: "#/components/schemas/CategoryBrief" },
            amount: { type: "number" },
            spent: { type: "number" },
            remaining: { type: "number" },
            percentage: { type: "integer" },
            recorded_at: { type: "string", format: "date-time" },
          },
        },
        Notification: {
          type: "object",
          properties: {
            id: { type: "string" },
            user_id: { type: "string" },
            type: {
              type: "string",
              enum: [
                "LOW_BALANCE",
                "WEEKLY_SUMMARY",
                "TRANSACTION_ADDED",
                "SAVINGS_GOAL_REACHED",
              ],
            },
            title: { type: "string" },
            body: { type: "string" },
            data: { type: "object", nullable: true },
            read: { type: "boolean" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        UserProfile: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string", nullable: true },
            email: { type: "string", format: "email" },
            email_verified: { type: "boolean" },
            username: { type: "string", nullable: true },
            phone: { type: "string", nullable: true },
            bio: { type: "string", nullable: true },
            avatar_url: { type: "string", nullable: true },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        UpdateProfileBody: {
          type: "object",
          properties: {
            name: { type: "string" },
            phone: {
              type: "string",
              description: "7-15 digits with optional leading +",
            },
            username: {
              type: "string",
              description:
                "3-30 characters, alphanumeric, dots, and underscores only",
            },
            bio: { type: "string", maxLength: 160 },
            avatar_url: { type: "string" },
          },
        },
        UserStats: {
          type: "object",
          properties: {
            net_worth: { type: "number" },
            total_income: { type: "number" },
            total_expenses: { type: "number" },
            total_transactions: { type: "integer" },
            custom_categories: { type: "integer" },
          },
        },
        ActivityItem: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: { type: "string", enum: ["INCOME", "EXPENSE"] },
            amount: { type: "number" },
            source_name: { type: "string", nullable: true },
            category: { $ref: "#/components/schemas/CategoryBrief" },
            recorded_at: { type: "string", format: "date-time" },
          },
        },
      },
    },
  };
}
