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
