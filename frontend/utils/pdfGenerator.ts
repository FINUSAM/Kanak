import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Group, Transaction, TransactionType } from '../types';

interface MemberBalance {
  userId: string;
  username: string;
  balance: number;
}

const calculateMemberBalances = (group: Group, transactions: Transaction[]) => {
  return group.members.map(member => {
    let totalBalance = 0;
    transactions.forEach(tx => {
      const payerId = tx.payerId || tx.createdById;
      const totalAmount = Number(tx.amount);
      const isPayer = member.userId === payerId;
      const splitObj = tx.splits.find(s => s.userId === member.userId);
      const splitAmount = splitObj ? Number(splitObj.amount) : 0;

      if (tx.type === TransactionType.CREDIT) {
        const paidIn = isPayer ? totalAmount : 0;
        totalBalance += (paidIn - splitAmount);
      } else {
        const takenOut = isPayer ? totalAmount : 0;
        totalBalance += (splitAmount - takenOut);
      }
    });
    return { userId: member.userId, username: member.username, balance: totalBalance };
  });
};

const calculateSettlements = (memberBalances: MemberBalance[]): string[] => {
  const settlements: string[] = [];
  const positiveBalances: MemberBalance[] = []; // People who are owed money
  const negativeBalances: MemberBalance[] = []; // People who owe money

  memberBalances.forEach(mb => {
    if (mb.balance > 0.01) { // Threshold to ignore tiny floating point differences
      positiveBalances.push({ ...mb, balance: mb.balance });
    } else if (mb.balance < -0.01) { // Threshold to ignore tiny floating point differences
      negativeBalances.push({ ...mb, balance: mb.balance });
    }
  });

  // Sort to process largest debts/credits first
  positiveBalances.sort((a, b) => b.balance - a.balance); // Descending
  negativeBalances.sort((a, b) => a.balance - b.balance); // Ascending (most negative first)

  let i = 0; // Pointer for negative balances
  let j = 0; // Pointer for positive balances

  while (i < negativeBalances.length && j < positiveBalances.length) {
    let debtor = negativeBalances[i];
    let creditor = positiveBalances[j];

    const amountToSettle = Math.min(Math.abs(debtor.balance), creditor.balance);

    if (amountToSettle > 0.01) { // Only settle if amount is significant
      settlements.push(
        `${debtor.username} owes ${creditor.username} ${amountToSettle.toFixed(2)}`
      );

      debtor.balance += amountToSettle; // Debtor's balance moves closer to zero
      creditor.balance -= amountToSettle; // Creditor's balance moves closer to zero
    }
    
    if (Math.abs(debtor.balance) < 0.01) { // Debtor has settled their part
      i++;
    }
    if (creditor.balance < 0.01) { // Creditor has been paid their part
      j++;
    }
  }

  return settlements;
};

export const generateGroupPDF = (
  group: Group,
  transactions: Transaction[],
  fromDate: string,
  toDate: string
) => {
  // 1. Filter Data (Logic Unchanged)
  const filteredTransactions = transactions.filter(tx => {
    if (!fromDate && !toDate) return true;

    const txDate = new Date(tx.date);
    txDate.setHours(0, 0, 0, 0);

    const from = fromDate ? new Date(fromDate) : null;
    if (from) from.setHours(0, 0, 0, 0);

    const to = toDate ? new Date(toDate) : null;
    if (to) to.setHours(23, 59, 59, 999);

    if (from && txDate < from) return false;
    if (to && txDate > to) return false;

    return true;
  });

  // Calculate member balances
  const memberBalances = calculateMemberBalances(group, filteredTransactions);

  // 2. Setup Document
  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
  
  // Brand Colors
  const PRIMARY_COLOR: [number, number, number] = [79, 70, 229]; // Indigo-600
  const TEXT_COLOR: [number, number, number] = [31, 41, 55];     // Gray-800
  const SUBTEXT_COLOR: [number, number, number] = [107, 114, 128]; // Gray-500
  const POSITIVE_COLOR: [number, number, number] = [22, 163, 74];  // Green-600
  const NEGATIVE_COLOR: [number, number, number] = [220, 38, 38];  // Red-600

  // 3. Header Design
  // App Brand
  doc.setFontSize(24);
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.setFont('helvetica', 'bold');
  doc.text("Kanak", 14, 18);

  // Document Title
  doc.setFontSize(10);
  doc.setTextColor(SUBTEXT_COLOR[0], SUBTEXT_COLOR[1], SUBTEXT_COLOR[2]);
  doc.setFont('helvetica', 'normal');
  doc.text("TRANSACTION REPORT", 14, 24);

  // Separator Line
  doc.setDrawColor(229, 231, 235); // Gray-200
  doc.setLineWidth(0.5);
  doc.line(14, 28, 283, 28); // Width of A4 landscape is ~297mm

  // Group Details Section
  doc.setFontSize(16);
  doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(group.name, 14, 38);

  doc.setFontSize(10);
  doc.setTextColor(SUBTEXT_COLOR[0], SUBTEXT_COLOR[1], SUBTEXT_COLOR[2]);
  doc.setFont('helvetica', 'normal');
  const dateText = `Date Range: ${fromDate || 'Start'} to ${toDate || 'Today'}`;
  doc.text(dateText, 14, 44);
  
  const genDateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  const genTimeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  const genText = `Generated on: ${new Date().toLocaleDateString('en-US', genDateOptions)} ${new Date().toLocaleTimeString('en-US', genTimeOptions)}`;
  doc.text(genText, 14, 49);

  // Calculate and display settlements
  const settlements = calculateSettlements(memberBalances);
  let currentY = 55; // Starting Y for settlements, after group details

  if (settlements.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
    doc.setFont('helvetica', 'bold');
    doc.text("Settlements", 14, currentY);
    currentY += 7; // Space after title

    doc.setFontSize(10);
    doc.setTextColor(SUBTEXT_COLOR[0], SUBTEXT_COLOR[1], SUBTEXT_COLOR[2]);
    doc.setFont('helvetica', 'normal');

    settlements.forEach(settlement => {
      doc.text(settlement, 14, currentY);
      currentY += 5; // Line height
    });
    currentY += 5; // Space after settlements
  } else {
    doc.setFontSize(10);
    doc.setTextColor(SUBTEXT_COLOR[0], SUBTEXT_COLOR[1], SUBTEXT_COLOR[2]);
    doc.setFont('helvetica', 'normal');
    doc.text("No settlements needed for this period.", 14, currentY);
    currentY += 10;
  }
  
  // 4. Prepare Table Data (Logic Unchanged)
  const memberColumns = group.members.map(m => m.username);
  const headers = [['Date', 'Time', 'Description', ...memberColumns]];

  const tableData = filteredTransactions.map(tx => {
    const dateOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    const date = new Date(tx.date).toLocaleDateString('en-US', dateOptions);
    const time = new Date(tx.date).toLocaleTimeString('en-US', timeOptions);
    const payerId = tx.payerId || tx.createdById;
    const totalAmount = Number(tx.amount);

    const memberValues = group.members.map(member => {
      const isPayer = member.userId === payerId;
      const splitObj = tx.splits.find(s => s.userId === member.userId);
      const splitAmount = splitObj ? Number(splitObj.amount) : 0;
      let netImpact = 0;

      if (tx.type === TransactionType.CREDIT) {
        // Payer paid (Credit), gets positive balance back (Total - Split). Consumers get negative (-Split).
        const paidIn = isPayer ? totalAmount : 0;
        netImpact = paidIn - splitAmount;
      } else {
        // Payer received (Debit), gets negative balance (Split - Total). Consumers get positive (+Split).
        const takenOut = isPayer ? totalAmount : 0;
        netImpact = splitAmount - takenOut;
      }

      // Hide tiny rounding errors
      if (Math.abs(netImpact) < 0.005) return "-";
      return netImpact > 0 ? `+${netImpact.toFixed(2)}` : netImpact.toFixed(2);
    });

    return [date, time, tx.description, ...memberValues];
  });

  const totalRow = ['TOTAL', '', '', ...memberBalances.map(mb => {
    return mb.balance > 0 ? `+${mb.balance.toFixed(2)}` : mb.balance.toFixed(2);
  })];

  // 5. Render Table with Professional Styling
  autoTable(doc, {
    head: headers,
    body: tableData,
    foot: [totalRow],
    startY: currentY, // Adjust startY dynamically
    theme: 'plain', // Use plain as base to remove default borders
    
    // Header Styles
    headStyles: { 
      fillColor: PRIMARY_COLOR, 
      textColor: 255, 
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: 3,
      fontSize: 9
    },

    // Body Styles
    bodyStyles: { 
      textColor: TEXT_COLOR,
      valign: 'middle',
      cellPadding: 3,
      fontSize: 9,
      lineColor: [229, 231, 235] as [number, number, number], // Gray-200
      lineWidth: { bottom: 0.1 } // Only horizontal lines
    },

    // Footer Styles (Total Row)
    footStyles: { 
      fillColor: [243, 244, 246] as [number, number, number], // Gray-100
      textColor: TEXT_COLOR,
      fontStyle: 'bold',
      halign: 'right', // Align numbers
      valign: 'middle',
      cellPadding: 4,
      fontSize: 10,
      lineColor: PRIMARY_COLOR,
      lineWidth: { top: 0.5 } // Stronger separator for total
    },

    // Alternating Row Colors
    alternateRowStyles: {
      fillColor: [249, 250, 251] as [number, number, number] // Gray-50
    },

    // Column Specific Styles
    columnStyles: {
      0: { cellWidth: 25, overflow: 'hidden', halign: 'center' }, // Date
      1: { cellWidth: 20, overflow: 'hidden', halign: 'center' }, // Time
      2: { cellWidth: 'auto' }, // Description
      // Dynamic columns for members handled in didParseCell mostly
    },

    // Cell Logic (Colors & Alignment)
    didParseCell: (data) => {
      // Logic for Member Columns (Index 3+)
      if (data.column.index >= 3) {
        // Right align all numeric columns
        data.cell.styles.halign = 'right';

              if (data.section === 'body' || data.section === 'foot') {
                 const text = data.cell.raw;
                 if (typeof text === 'string') { // Add null/undefined check
                   if (text.startsWith('+')) {
                     data.cell.styles.textColor = POSITIVE_COLOR;
                   } else if (text.startsWith('-')) {
                     data.cell.styles.textColor = NEGATIVE_COLOR;
                   } else {
                     data.cell.styles.textColor = [156, 163, 175] as [number, number, number]; // Gray-400 for "-" or "0.00"
                   }
                 }
              }      }
      
      // Left align the Total Label in footer
      if (data.section === 'foot' && data.column.index === 0) {
        data.cell.styles.halign = 'left';
      }
    }
  });

  // Footer / Page Numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(SUBTEXT_COLOR[0], SUBTEXT_COLOR[1], SUBTEXT_COLOR[2]);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pageCount}`, 283, 200, { align: 'right' });
  }

  doc.save(`${group.name.replace(/\s+/g, '_')}_ledger.pdf`);
};