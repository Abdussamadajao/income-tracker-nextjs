# Income Tracker - Features

## Core Features

### 1. Transaction Management
- **Income & Expense Tracking**: Record income and expense transactions with amount, date, category, source name, notes, receipt URL, and tags (Monthly, Bonus, One-time)
- **Income-Expense Relationship**: Link expenses to income sources for budget tracking
- **Budget Monitoring**: Automatically tracks how much of each income source has been spent (total, spent, remaining, percentage)
- **Transaction Search & Filter**: Filter by type, date range, category, amount range, income source, or search across source names, notes, and categories
- **Pagination**: Efficiently browse large transaction lists with customizable page sizes

### 2. Category Management
- **System Categories**: Pre-configured categories for common income and expense types
- **Custom Categories**: Create your own categories with name, icon, color, and description
- **Category Types**: Separate categories for INCOME and EXPENSE transactions
- **Duplicate Prevention**: Prevents creating duplicate category names within the same type

### 3. Dashboard & Analytics
- **Net Worth Overview**: See total income, expenses, and net worth at a glance
- **Period Analysis**: View financial data for week, month, or year periods
- **Savings Tracking**: Calculate savings and savings rate (percentage of income saved)
- **Daily Chart Data**: Visualize income and expenses over time with daily breakdowns
- **Recent Transactions**: Quick view of your latest 10 transactions

### 4. Financial Insights
- **Period Comparisons**: Compare current period vs previous period for income, expenses, and savings
- **Category Breakdowns**: See spending and income distributed by category with amounts, counts, and percentages
- **Top Income Sources**: Identify your largest income sources with budget utilization
- **Smart Observations**: Auto-generated insights about your financial habits:
  - Savings rate feedback
  - Top spending category identification
  - Expense trend analysis
  - Income growth tracking

### 5. User Management
- **Authentication**: Secure session-based authentication via Better Auth
- **User Profiles**: Manage name, email, phone, username, bio, and avatar
- **User Statistics**: View personal financial stats (net worth, totals, transaction count, custom categories)
- **Account Deletion**: Permanently delete account and all associated data
- **Admin Panel**: Admin users can view all registered users

### 6. Notifications
- **Push Notifications**: Receive notifications for:
  - New transactions added
  - Low balance warnings (when income source is 80%+ spent)
  - Weekly summaries
  - Savings goal achievements
- **Notification Management**: Mark as read, delete individual notifications, or clear all
- **Multi-Platform Support**: iOS and Android push notification tokens
- **Pagination & Filtering**: Browse notifications with unread filter

## Technical Features

### Data Integrity
- **Decimal Precision**: All monetary amounts stored as Decimal(12,2) for financial accuracy
- **Cascade Deletions**: Deleting income unlinks associated expenses instead of failing
- **Ownership Validation**: All resources scoped to authenticated users with proper authorization

### API Design
- **RESTful Architecture**: Standard HTTP methods (GET, POST, PATCH, DELETE)
- **Comprehensive Filtering**: Query parameters for type, date range, category IDs, amount ranges, and full-text search
- **Pagination**: Consistent pagination with total count and page metadata
- **Error Handling**: Standardized error responses (400, 401, 403, 404, 422, 500)
- **Interactive Documentation**: Swagger UI at `/docs` with full API specification

### Security
- **Session-Based Auth**: Better Auth integration for secure authentication
- **Role-Based Access**: Separate USER and ADMIN roles
- **Ownership Checks**: All endpoints verify resource ownership before allowing modifications
- **Input Validation**: Comprehensive validation for all inputs (amounts, dates, usernames, phone numbers)

### Performance
- **Optimized Queries**: Efficient database queries with proper indexing
- **Computed Fields**: Summary calculations done server-side
- **Selective Data Loading**: Only fetch required fields and related data

## Data Models

### User
- Profile information (name, email, username, phone, bio, avatar)
- Role-based access control (USER, ADMIN)
- Timestamps for creation and updates

### Transaction
- Type: INCOME or EXPENSE
- Amount (Decimal 12,2 precision)
- Category association
- Optional income source linking (for expenses)
- Source name, notes, receipt URL, tags
- Recorded date and timestamps

### Category
- Name, icon, color, description
- Type: INCOME or EXPENSE
- System flag (pre-configured vs custom)
- User ownership (for custom categories)

### Notification
- Type: LOW_BALANCE, WEEKLY_SUMMARY, TRANSACTION_ADDED, SAVINGS_GOAL_REACHED
- Title, body, and optional JSON data
- Read status
- User association

### Push Token
- Device token for push notifications
- Platform: iOS or Android
- User association

## Use Cases

1. **Personal Finance Tracking**: Track all income and expenses with detailed categorization
2. **Budget Management**: Link expenses to income sources to monitor budget utilization
3. **Financial Analysis**: Use insights to understand spending patterns and optimize savings
4. **Multi-Source Income**: Track multiple income streams and allocate expenses appropriately
5. **Goal Setting**: Monitor savings rate and track progress toward financial goals
6. **Receipt Management**: Store receipt URLs for expense documentation
7. **Financial Reporting**: Generate reports with period-based analysis and comparisons

## API Endpoints

- **Health**: `/api/health` - Service health check
- **Auth**: `/api/auth/*` - Authentication (Better Auth)
- **Admin**: `/api/admin/users` - Admin user management
- **Categories**: `/api/categories` - CRUD operations
- **Transactions**: `/api/transactions` - CRUD operations with filtering
- **Dashboard**: `/api/dashboard/summary` - Dashboard analytics
- **Insights**: `/api/insights` - Financial insights and comparisons
- **Notifications**: `/api/notifications` - Notification management
- **User**: `/api/user/*` - Profile, stats, activity, account
