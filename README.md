# SpendWise — Personal Expense Tracker

A student-focused expense tracker prototype built with HTML, CSS, and vanilla JavaScript.

## Features in this version
- Student registration and login using the `@student.nitw.ac.in` email format.
- **Demo email verification flow:** registration asks for a six-digit code before the account is created. In this frontend-only prototype, the code is shown on-screen; it is **not sent by email**. Real email verification requires a backend and email provider, planned for the final integration stage.
- Student profile section with editable name, student ID/roll number, department, year of study, and contact number.
- Expense management: create, edit, delete, search, category filtering, and sorting.
- Income management and monthly category budgets.
- Combined transaction history with search, transaction-type filter, date range filters, income/expense/net totals, and CSV export.
- Dashboard and basic reports preview.

## Run it
Open `index.html` in a modern browser. No build step is required.

## Current limitations
- Data is stored in the browser's `localStorage` and is scoped by a local user ID. It is not synced across devices or browsers.
- This is a lab prototype, not a production-secure financial application. Passwords are stored locally in plain text in this demo; do not use a real password.
- Email format validation only checks the domain syntax. The displayed verification code is a UI demonstration, not proof of ownership of a real email address.
- Real email delivery, secure password hashing, server-side authentication/authorization, database storage should be implemented with the planned Node.js/Express and database backend.


## Recent prototype additions
- Added a visible Logout button in the top bar as well as the sidebar. Logout clears only the active session; saved local demo records remain in the browser.
- The Admin interface has been intentionally removed; this project focuses on individual student accounts and personal finance features.
- Email verification is still a front-end demonstration: codes are displayed on-screen and are not sent to the student's mailbox. Real email verification requires backend integration.
