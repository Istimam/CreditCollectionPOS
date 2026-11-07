# MANAGERIUM ERP - Credit Collection Feature (UI Mockup & Interactive Prototype)

A fully functioning, high-fidelity UI mockup of the **Credit Collection** module (sales-side mirror of Supplier Payment) with **multi-level approval workflow (L1/L2/L3), GL-tagged double-entry accounting, single & 5-step bulk wizard collection, Excel upload/download, and General Ledger subledger audit** for the **MANAGERIUM ERP/POS** web application.

**Live:** [https://istimam.github.io/CreditCollectionPOS/](https://istimam.github.io/CreditCollectionPOS/)

Built strictly according to Managerium design conventions using **React 18 + TypeScript + Tailwind CSS + SheetJS (XLSX) + Lucide Icons + Vitest**.

---

## 1. Quick Start

### Installation & Test Verification
```bash
# Run all unit tests (FIFO + accounting domain rules)
npm test

# Build for production
npm run build

# Start local development server
npm run dev
```

Open your browser at:
`http://localhost:5173`

---

## 2. Key Modules & Architectural Features

### A. Navigation & Top Role Switcher (`DevControlsBar`)
- **Demo Role Switcher Bar (Sticky Top)**:
  - Quickly switch between **Saddam Khan (Collector / Requester)**, **Nasrullah (Approver L1)**, **Nowshad (Approver L2)**, and **Riyaz (Approver L3)**.
  - Interactive dev actions: **Simulate Stale POS Collection**, **Force Failure / Rollback Toggle**, and **Reset Mock Data**.
  - Pending approval count badge updates dynamically based on the logged-in user's approval level and Maker-Checker clearance.
- **Left Sidebar**:
  - `POS` module:
    - **POS Dashboard**
    - **Credit Collection** (Main screen: Due List, Paid Invoices, Requests, Batches)
    - **Setup > Credit Collection GL Setup**
    - **Reports**
  - `Approval` module:
    - Opens the **Approval Dashboard** matching Managerium's real tile grid with Purchase, Sales, Accounts, HR, Inventory, Assets, Production, and the new **POS APPROVAL** heading with the **Due Collection Approval** tile (badge turns green when 0, red when pending > 0).

---

### B. Credit Collection Modes: Mode A vs. Mode B
1. **Mode A (Direct Receipt)**:
   - User collects via **Cash**, **Bank**, or **Wallet (bKash/Nagad/Rocket)**.
   - Bank requires mandatory **Instrument / Cheque No**.
   - Wallet requires mandatory **Transaction Ref / OTP**.
   - Cash requires only Remarks.
   - Posts directly to the designated receiving GL and credits Accounts Receivable.
2. **Mode B (Settlement GL / Pre-funded)**:
   - For corporate clients or factory workers whose dues are settled via bulk payroll deduction or sister company clearing vouchers.
   - User selects a **Settlement / Clearing GL** (e.g. `1300 - Employee Dues Settlement Clearing [Akij Corporate]`, seeded with **৳ 1,500,000.00**).
   - Shows live **Current Balance**, **Pending Reservations**, and **Available Balance** ($\text{Available} = \text{Current} - \text{Pending Reservations}$).
   - **Guardrail**: If the requested amount exceeds the available settlement balance, submission is blocked with an alert banner and a link to **+ Create Journal Voucher**.

---

### C. Maker-Checker & Multi-Level Approval Engine
- **Nothing posts to the General Ledger upon submission.**
- Submission creates a `CollectionRequest` in **Pending** state and immediately **reserves** the target invoice dues (`pendingApprovalAmount`) and Mode B clearing funds.
- **Approval Level Thresholds**:
  - Up to ৳ 50,000: **1 Level** (`L1`)
  - Up to ৳ 500,000: **2 Levels** (`L1 ➔ L2`)
  - Above ৳ 500,000: **3 Levels** (`L1 ➔ L2 ➔ L3`)
- **Maker-Checker Enforcement**:
  - The creator of a request cannot approve their own request (`createdById === currentUserId` is blocked with a clear warning).
- **Atomic Double-Entry Posting on Final Approval**:
  - Single collection posts voucher `CR-YYMMNNN` ("Due Receive (Manual)") with Section 12 compliant narration:
    `Due Receive from <CUSTOMER NAME> Invoice(s): <inv1>,<inv2>,...` (comma-separated, no spaces).
  - Bulk collection posts voucher `CR-YYMMNNN` ("Due Receive (Bulk)") with narration:
    `Bulk Due Receive Batch <BatchNo> <filters summary>`, with one Dr line for the total receiving/settlement GL, and one Cr line per customer on `Accounts receivable : <CUSTOMER NAME>`.
- **Rejection & Reversal**:
  - Rejection requires an explicit reason; immediately releases invoice and Mode B reservations.
  - Approved vouchers can be reversed from the Audit screen, generating an exact reversing entry and reopening the invoice dues.

---

### D. Single Collection & "Collect by Invoice Wise" Mode
- **FIFO Auto-Distribution**: Enter payment amount, click `+ Add (FIFO)` to distribute across oldest invoices. Parity badge verifies balance.
- **Collect by Invoice Wise**:
  - Cumulative input and default invoice table disappear.
  - Searchable dropdown (`DDL`) appears: select individual invoices to add into table.
  - Each invoice row has an editable `Collect Now` amount and delete icon.
  - `Pay all?` checkbox auto-fills dues for all added invoices.
- **Return Invoices & Detailed Drawer**:
  - Invoices show `Return Inv / Ref` (clickable tags) and `Return Amount`.
  - Clicking any invoice number slides out the **Invoice Details Drawer** showing itemized products, return breakdowns, and multi-wallet tender splits.

---

### E. 5-Step Bulk Collection Wizard
Accessible via **+ Bulk Collection** or `Batches > + New Bulk Batch`:
1. **Step 1: Filter & Scope**: Filter by date range, Customer Groups (`Factory Employees`, `Office Staff`, `Walk-in Credit`), overdue cutoff, or upload Excel.
2. **Step 2: Review & Edit**: Bulk review customer list with expandable per-customer invoice breakdown. Customize collection amounts per customer or use FIFO.
3. **Step 3: Accounting Settings**: Choose Mode A (Direct) or Mode B (Settlement GL), select GL account, collection date, reference no, and narration.
4. **Step 4: Accounting Journal Preview**: Full double-entry preview of the debit receiving GL and credit subledger accounts before submission.
5. **Step 5: Completion**: Displays created batch number and one-click navigation to batch tracking.

---

### F. Screen Audit & Subledger Consistency
- **Account Journal Details Modal**: Exact replica of Managerium's modal with Journal Lines, Invoices Allocation, and Approval Trail tabs.
- **General Ledger of Accounts Receivable**: Mini report (Date, Office, Trans No, Contra Account, Narration, Debit, Credit, Running Balance) allowing real-time audit of all posted collections.

---

## 3. Interactive 6-Step Demo Walkthrough

Follow these steps in your browser (`http://localhost:5173`) to test all business logic:

### Step 1: Submit Single Collection as Collector
1. Top bar: Ensure Demo Role is **Saddam Khan (Collector)**.
2. In `DUE LIST`, click the green round **`$`** action on customer **MD. BULBUL HOSSAIN TALUKDAR**.
3. Select **Mode A**, method **Bank**, pick `2081 - BRAC BANK`, type cheque `CHQ-77881`.
4. Enter payment amount `৳ 6,000`, click **`+ Add (FIFO)`**, then click **`SUBMIT FOR APPROVAL`**.
5. Notice: Request `CRQ-2611-XXXX` is created (Pending L1). Invoices are locked with `Pending Approval` badges.

### Step 2: Maker-Checker Enforcement Check
1. In the sidebar, click **Approval** (or top switcher: stay as Saddam Khan).
2. Go to **Due Collection Approval**.
3. Try to approve the request created by Saddam.
4. Notice: **Maker-Checker blocked!** "You cannot approve a collection request created by yourself."

### Step 3: Approve Request as L1 Approver
1. In top `DevControlsBar`, click **Nasrullah (L1)**.
2. In **Due Collection Approval**, click the checkmark or **Approve** button for `CRQ-2611-XXXX`.
3. Notice: For amounts $\le 50,000$, L1 is final approval! Voucher `CR-2611XXX` is posted, invoices are marked paid, and GL accounts updated.

### Step 4: Test Mode B Settlement Pre-funding Guardrail
1. Switch back to **Saddam Khan (Collector)**.
2. Click **+ Bulk Collection** to start the 5-step wizard.
3. In Step 1, select `Factory Employees`, proceed to Step 2.
4. In Step 3, choose **Mode B: Settlement GL**. Notice Settlement GL `1300` has available balance.
5. If the collection amount exceeds available balance, the system blocks progression with a pre-fund warning!

### Step 5: Simulate Stale POS Collection (Concurrent conflict prevention)
1. In top `DevControlsBar`, click **Simulate Stale POS Collection**.
2. A customer invoice is paid out-of-band at the physical POS counter while an approval request is pending.
3. Switch to **Nasrullah (L1)** and attempt to approve that pending request.
4. Notice: System re-validates at approval time and blocks final authorization with an alert detailing the exact stale invoice!

### Step 6: Verify Accounting Subledger & Journal Modal
1. Go to sidebar: **POS > Setup > Credit Collection GL Setup** to view/edit approval thresholds.
2. In **Due Collection Approval**, click any transaction number (`CR-2610012` or `JV-261100003`).
3. The **Account Journal Details** modal opens with tabs: **Journal Lines**, **Invoices Allocation**, and **Approval Trail**.
4. In sidebar: click **Reports** (or AR Ledger view) to verify that Debits, Credits, and Accounts Receivable closing balances match to the cent.

---

## 4. Test Suite Summary
- **18 unit tests passing** (`npm test`):
  - 7 tests in `fifo.test.ts` (FIFO allocation, partial payments, zero dues, overpayment caps).
  - 11 tests in `domain.test.ts` (Mode B availability, reservation conflict prevention, locked period enforcement `< 2026-10-01`, stale invoice detection, multi-level threshold routing, maker-checker authorization, Section 12 single and bulk voucher generators, reversing entries).
