
import { Injectable } from '@angular/core';
import { AppEvent, Debt, Expense, SplitMember, Adjustment } from '../models/types';

@Injectable({ providedIn: 'root' })
export class SettlementService {
  
  calculateFinalTotal(expense: Expense): number {
    let total = expense.totalAmount;
    
    // Adjustments
    expense.adjustments.forEach(adj => {
      const amount = adj.isPercentage ? (expense.totalAmount * (adj.amount / 100)) : adj.amount;
      if (adj.type === 'discount') {
        total -= amount;
      } else {
        total += amount;
      }
    });

    return Math.max(0, total);
  }

  calculateParticipantShares(expense: Expense): Record<string, number> {
    const shares: Record<string, number> = {};
    const participantsCount = expense.splits.length;
    if (participantsCount === 0) return {};

    // 1. Separate adjustments
    const beforeAdjustments = expense.adjustments.filter(a => a.appliedBeforeSplit);
    const afterAdjustments = expense.adjustments.filter(a => !a.appliedBeforeSplit);

    // 2. Calculate base amount to split (includes "before" adjustments)
    let amountToSplit = expense.totalAmount;
    beforeAdjustments.forEach(adj => {
      const val = adj.isPercentage ? (expense.totalAmount * (adj.amount / 100)) : adj.amount;
      amountToSplit += (adj.type === 'discount' ? -val : val);
    });

    // 3. Base split calculation
    switch (expense.splitType) {
      case 'equal': {
        const share = amountToSplit / participantsCount;
        expense.splits.forEach(s => shares[s.participantId] = share);
        break;
      }
      case 'percentage': {
        expense.splits.forEach(s => shares[s.participantId] = (amountToSplit * s.value) / 100);
        break;
      }
      case 'shares': {
        const totalShares = expense.splits.reduce((acc: number, s: SplitMember) => acc + s.value, 0) || 1;
        expense.splits.forEach(s => shares[s.participantId] = (amountToSplit * s.value) / totalShares);
        break;
      }
      case 'custom': {
        // Custom usually ignores adjustments applied "before" if the user entered specific currency amounts
        // But for consistency with the app, we assume custom amounts provided are the "base"
        expense.splits.forEach(s => shares[s.participantId] = s.value);
        break;
      }
    }

    // 4. Add "after" adjustments (split proportionately to the shares calculated above)
    let totalAfterAmount = 0;
    afterAdjustments.forEach(adj => {
      const val = adj.isPercentage ? (expense.totalAmount * (adj.amount / 100)) : adj.amount;
      totalAfterAmount += (adj.type === 'discount' ? -val : val);
    });

    if (totalAfterAmount !== 0) {
      const currentTotalShares = Object.values(shares).reduce((a, b) => a + b, 0) || 1;
      Object.keys(shares).forEach(pId => {
        const proportion = shares[pId] / currentTotalShares;
        shares[pId] += totalAfterAmount * proportion;
      });
    }

    return shares;
  }

  calculateSettlements(event: AppEvent): Debt[] {
    const netBalances: Record<string, number> = {};
    
    // Initialize balances
    event.participants.forEach(p => netBalances[p.id] = 0);

    // Calculate net for each person: Paid - Owed
    event.expenses.forEach(exp => {
      const shares = this.calculateParticipantShares(exp);
      const totalCost = (Object.values(shares) as number[]).reduce((a: number, b: number) => a + b, 0);
      
      // Payer gets back the total they paid
      if (netBalances[exp.payerId] !== undefined) {
        netBalances[exp.payerId] += totalCost;
      }

      // Everyone else owes their share
      Object.entries(shares).forEach(([pId, amount]) => {
        if (netBalances[pId] !== undefined) {
          netBalances[pId] -= amount;
        }
      });
    });

    // Solve for minimum transactions
    const debtors: { id: string, amount: number }[] = [];
    const creditors: { id: string, amount: number }[] = [];

    Object.entries(netBalances).forEach(([id, balance]) => {
      if (balance < -0.01) debtors.push({ id, amount: Math.abs(balance) });
      else if (balance > 0.01) creditors.push({ id, amount: balance });
    });

    const debts: Debt[] = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
      const d = debtors[i];
      const c = creditors[j];
      const amount = Math.min(d.amount, c.amount);

      debts.push({ from: d.id, to: c.id, amount });

      d.amount -= amount;
      c.amount -= amount;

      if (d.amount < 0.01) i++;
      if (c.amount < 0.01) j++;
    }

    return debts;
  }
}
