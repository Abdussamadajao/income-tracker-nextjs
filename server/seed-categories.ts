import { prisma } from "./prisma";
import { logger } from "./log";

const SYSTEM_CATEGORIES = [
  // ── Expense ───────────────────────────────────────────────────────────
  {
    id: "food",
    name: "Food",
    icon: "restaurant",
    color: "#f97316",
    description: "Meals, groceries, and dining expenses.",
    type: "EXPENSE",
  },
  {
    id: "transport",
    name: "Transport",
    icon: "directions-car",
    color: "#3b82f6",
    description: "Fuel, rides, fares, and travel costs.",
    type: "EXPENSE",
  },
  {
    id: "bills",
    name: "Bills",
    icon: "receipt-long",
    color: "#ef4444",
    description: "Recurring utility and service payments.",
    type: "EXPENSE",
  },
  {
    id: "shopping",
    name: "Shopping",
    icon: "shopping-bag",
    color: "#a855f7",
    description: "General purchases and retail spending.",
    type: "EXPENSE",
  },
  {
    id: "entertainment",
    name: "Entertainment",
    icon: "movie",
    color: "#ec4899",
    description: "Movies, games, events, and fun activities.",
    type: "EXPENSE",
  },
  {
    id: "health",
    name: "Health",
    icon: "favorite",
    color: "#14b8a6",
    description: "Medical, pharmacy, and wellness expenses.",
    type: "EXPENSE",
  },
  {
    id: "education",
    name: "Education",
    icon: "school",
    color: "#0ea5e9",
    description: "Courses, books, and learning costs.",
    type: "EXPENSE",
  },
  {
    id: "housing",
    name: "Housing",
    icon: "home",
    color: "#6366f1",
    description: "Rent, maintenance, and home-related costs.",
    type: "EXPENSE",
  },
  {
    id: "clothing",
    name: "Clothing",
    icon: "checkroom",
    color: "#f43f5e",
    description: "Apparel, footwear, and accessories.",
    type: "EXPENSE",
  },
  {
    id: "other_expense",
    name: "Other",
    icon: "more-horiz",
    color: "#6b7280",
    description: "Any expense that does not fit other categories.",
    type: "EXPENSE",
  },

  // ── Income ────────────────────────────────────────────────────────────
  {
    id: "salary",
    name: "Salary",
    icon: "work",
    color: "#16a34a",
    description: "Primary employment income.",
    type: "INCOME",
  },
  {
    id: "freelance",
    name: "Freelance",
    icon: "laptop",
    color: "#0ea5e9",
    description: "Income from contract or freelance work.",
    type: "INCOME",
  },
  {
    id: "business",
    name: "Business",
    icon: "store",
    color: "#f59e0b",
    description: "Revenue from owned business activities.",
    type: "INCOME",
  },
  {
    id: "investment",
    name: "Investment",
    icon: "trending-up",
    color: "#8b5cf6",
    description: "Returns from stocks, funds, or assets.",
    type: "INCOME",
  },
  {
    id: "gift",
    name: "Gift",
    icon: "card-giftcard",
    color: "#f43f5e",
    description: "Money received as gifts.",
    type: "INCOME",
  },
  {
    id: "rental",
    name: "Rental",
    icon: "house",
    color: "#10b981",
    description: "Income from rent and property leasing.",
    type: "INCOME",
  },
  {
    id: "other_income",
    name: "Other",
    icon: "more-horiz",
    color: "#6b7280",
    description: "Any income that does not fit other categories.",
    type: "INCOME",
  },
] as const;

export type SystemCategoryId = (typeof SYSTEM_CATEGORIES)[number]["id"];
export type CategoryIcon = (typeof SYSTEM_CATEGORIES)[number]["icon"];

export async function seedSystemCategories() {
  try {
    for (const category of SYSTEM_CATEGORIES) {
      await prisma.category.upsert({
        where: { id: category.id },
        update: {},
        create: {
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          description: category.description,
          type: category.type,
          is_system: true,
          user_id: null,
        },
      });
    }
    logger.info(`System categories seeded (${SYSTEM_CATEGORIES.length})`);
  } catch (err) {
    logger.error({ err }, "Failed to seed system categories");
  }
}
