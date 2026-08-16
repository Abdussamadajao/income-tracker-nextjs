export type TransactionType = "INCOME" | "EXPENSE";
export type TransactionTag = "Monthly" | "Bonus" | "One-time";

export interface CreateTransactionBody {
  type: TransactionType;
  amount: number;
  category_id: string;
  income_id?: string;
  source_name?: string;
  notes?: string;
  receipt_url?: string;
  tag?: TransactionTag;
  recorded_at: string;
  // Budget fields (only for EXPENSE transactions)
  budget_amount?: number;
  budget_period?: "WEEKLY" | "MONTHLY" | "YEARLY";
  budget_start_date?: string;
}

export interface CreateTransactionsBatchBody {
  transactions: CreateTransactionBody[];
}

export interface UpdateTransactionBody {
  amount?: number;
  category_id?: string;
  income_id?: string | null;
  source_name?: string;
  notes?: string;
  receipt_url?: string;
  tag?: TransactionTag | null;
  recorded_at?: string;
}
