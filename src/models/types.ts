
export type SplitType = 'equal' | 'percentage' | 'shares' | 'custom';
export type ExpenseCategory = 'Food' | 'Transport' | 'Accommodation' | 'Entertainment' | 'Other';

export interface Participant {
  id: string;
  name: string;
}

export interface Adjustment {
  id: string;
  name: string;
  amount: number;
  type: 'tax' | 'tip' | 'fee' | 'discount' | 'service_fee';
  isPercentage: boolean;
  appliedBeforeSplit: boolean;
}

export interface SplitMember {
  participantId: string;
  value: number; // For equal: ignored, for percent: 0-100, for shares: weight, for custom: amount
}

export interface LineItem {
  id: string;
  name: string;
  price: number;
}

export interface Expense {
  id: string;
  description: string;
  totalAmount: number; // Base amount before adjustments
  currency: string;
  category: ExpenseCategory;
  icon?: string; // Base64 generated icon
  date: number;
  payerId: string;
  splitType: SplitType;
  splits: SplitMember[];
  adjustments: Adjustment[];
  items: LineItem[];
}

export interface AppEvent {
  id: string;
  name: string;
  description: string;
  baseCurrency: string; // The reporting currency
  participants: Participant[];
  expenses: Expense[];
  createdAt: number;
}

export interface Debt {
  from: string;
  to: string;
  amount: number;
}
