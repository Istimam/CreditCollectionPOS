# MANAGERIUM ERP - Credit Collection Feature (UI Mockup & Interactive Prototype)

A high-fidelity, functioning UI mockup of the **Credit Collection** module (sales-side mirror of Supplier Payment) for the **MANAGERIUM ERP/POS** web application. Built with **React 18 + TypeScript + Tailwind CSS + SheetJS (XLSX) + Lucide Icons + Vitest**.

---

## 1. Quick Start

### Installation & Launch

```bash
# 1. Run unit tests
npm test

# 2. Start local development server
npm run dev
```

Open your browser at:
`http://localhost:5173`

---

## 2. Updated Behavior & Architecture

### A. One Payment Method per Collection Voucher
Just like Managerium's **Bill Payment** screen:
- Each collection voucher is recorded against **one payment method at a time** (`Cash`, `Bank`, or `Wallet`).
- When a payment method is selected:
  - **Account / Wallet Dropdown List (DDL)** dynamically updates to show real bank accounts, cash registers, or mobile wallets.
  - **Bank accounts**: e.g., `2081007510001 [BRAC BANK LTD PLC][KONABARI SME]`, `7862141003690168 [UNITED COMMERCIAL BANK LTD PLC][GAZIPUR CHOWRASTA]`, `1234567890 [CITY BANK PLC][DHANMONDI BRANCH]`.
  - **Cash accounts**: `1000 - Cash in hand [FairPrice Counter 1]`, `1001 - Cash in hand [FairPrice Counter 2]`.
  - **Wallet accounts**: `01737626276 [bKash Merchant Account - FairPrice]`, `01889717327 [Nagad Corporate Merchant Account]`, `01919697035 [Rocket Merchant Wallet]`.
- Optional `Instrument / Cheque No` field.

### B. No Advance Option
- As requested, all references to customer advances have been removed (no Advance button, no Advance checkbox, and no customer advance adjustment).
- Collection amounts are capped at the total outstanding dues.

### C. Seamless Invoices Sync & Prominent Error Display
- In normal mode, entering a `Payment Amount` and clicking **`+ Add (FIFO)`** automatically distributes the amount across due invoices from oldest to newest.
- Parity status chip displays live status: `✓ Allocated: ৳2,500.00 (Balanced)`.
- If the user tries to save with a discrepancy, an **impossible-to-miss bright red alert banner** appears at the top detailing the exact discrepancy, with a **one-click "Auto-Distribute (FIFO)"** button right inside the banner.

### D. "Collect by Invoice Wise" Mode (Exact Managerium Workflow)
When the **Collect By Invoice Wise** checkbox is checked:
1. The cumulative Payment Amount input and `+ Add (FIFO)` button **disappear**.
2. The full default invoice table **disappears**.
3. An **Invoice Search / Dropdown (DDL)** appears:
   `Invoice: [ Select/Search Invoice (min 3 letters)   ▼ ]` + `+ Add` button.
4. Selecting or adding an invoice inserts only that specific invoice into the table below.
5. Each row has a **Delete (trash icon)** action to remove that invoice.
6. The user can enter the specific `Collect Now` amount for that invoice.
7. **`Pay all?`** checkbox works here as well: sets `Collect Now = Due Amount` for all added invoices in the table.
8. The total collection amount is automatically equal to the sum of the selected invoices.

### E. Return Amount & Return Ref / Challan Columns
- Both in the main Invoices table and in the Paid Invoices table:
  - Added **`Return Ref / Challan`** column (e.g. `SR-FP26100004 / CH-2610-19` or `—`), matching the POS No / GRN reference style of Purchase Payment.
  - Added **`Return Amount`** column (e.g. `-৳1,250.00` highlighted in rose or `0.00`).
  - Invoice due accounts for returns: $\text{Due} = \text{Credit} - \text{Collected} - \text{Return Amount}$.

---

## 3. FIFO Allocation Engine & Unit Tests

Pure unit tests in `src/utils/fifo.test.ts` pass with 100% test coverage (`npm test`):
- Exact payment
- Partial last invoice
- Overpayment cap
- Single-invoice targeting mode
- Safe zero and negative amount handling
