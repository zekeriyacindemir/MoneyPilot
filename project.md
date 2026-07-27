# PROJECT.md

# MoneyPilot

**Version:** 1.0
**Status:** Planning & Development
**Project Type:** AI Powered Personal Finance SaaS
**Owner:** Zekeriya Çindemir

---

# 1. Vision

MoneyPilot is an AI-powered personal finance platform designed to help people understand, control and improve their financial lives.

The goal is not only to track income and expenses, but also to become an intelligent financial assistant that teaches users better financial habits.

The product should make users feel confident about their financial future every time they leave the application.

---

# 2. Mission

MoneyPilot aims to simplify personal finance through modern software engineering and artificial intelligence.

The application should:

- Make finance simple.
- Help users build better habits.
- Provide AI-powered financial insights.
- Encourage long-term financial growth.
- Teach financial literacy through small daily lessons.

---

# 3. Target Users

Primary users:

- Employees
- Students with income
- Freelancers
- Small business owners
- Families
- Individuals saving for goals

Typical goals:

- Save money
- Control spending
- Reduce unnecessary expenses
- Build an emergency fund
- Buy a house
- Buy a car
- Reach investment goals

---

# 4. Core Philosophy

MoneyPilot is not an accounting software.

MoneyPilot is a financial coach.

Every feature should answer one question:

> "Does this help the user make a better financial decision?"

If the answer is no, reconsider the feature.

---

# 5. Product Principles

Always prioritize:

1. Simplicity
2. User experience
3. Clarity
4. Security
5. Performance
6. Maintainability

Avoid unnecessary complexity.

---

# 6. MVP Features

Version 1 focuses on solving one problem well.

Core features:

- Authentication
- Dashboard
- Income tracking
- Expense tracking
- Categories
- Budget management
- Savings goals
- Financial health score
- Daily financial tips
- AI financial assistant
- Monthly reports
- Responsive design

---

# 7. Premium Features

Premium subscription may include:

- Unlimited AI conversations
- Advanced reports
- Predictive analytics
- Multiple financial goals
- Investment planning
- Advanced budgeting
- Export to PDF
- CSV export
- Priority AI models

The free version should always remain useful.

---

# 8. AI Philosophy

Artificial Intelligence should assist users, not replace their decisions.

AI should:

- Explain recommendations.
- Never guarantee financial outcomes.
- Encourage healthy financial behavior.
- Be transparent.

The user always makes the final decision.

---

# 9. AI Capabilities

The AI assistant should:

- Analyze spending habits.
- Detect unnecessary expenses.
- Suggest savings opportunities.
- Recommend budget improvements.
- Help achieve savings goals.
- Explain financial concepts simply.
- Provide motivational insights.
- Generate monthly summaries.

Future versions may include:

- Cash flow prediction
- Personalized investment education
- Subscription detection
- Financial risk analysis

---

# 10. User Experience

Within the first five seconds users should understand:

- Current balance
- Monthly income
- Monthly expenses
- Savings progress
- Financial health

The interface should reduce stress.

Finance should feel understandable.

---

# 11. Daily Experience

Every login should provide value.

Possible content:

- Daily financial tip
- AI insight
- Spending warning
- Budget reminder
- Savings motivation
- Goal progress

Users should leave the application with confidence.

---

# 12. Design Principles

The interface should be:

- Modern
- Minimal
- Fast
- Accessible
- Responsive
- Mobile friendly

Avoid visual clutter.

Every component should have a purpose.

---

# 13. Technology Stack

Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod

Backend

- NestJS
- Prisma ORM
- PostgreSQL
- JWT
- bcrypt
- Swagger

Infrastructure

- Docker
- Docker Compose
- GitHub Actions

AI

- OpenAI (initial provider)
- Adapter Pattern for future providers

---

# 14. Architecture

The project follows a Monorepo architecture.

Structure:

- apps/web
- apps/api

Additional packages will be added only when needed.

Avoid premature abstraction.

## Sprint 0 Foundation

The initial repository uses npm workspaces with `apps/web` and `apps/api`.
Local development runs PostgreSQL through Docker Compose while applications run with npm.
Production Docker images remain platform-agnostic; provider-specific deployment configuration is deferred.

---

# 15. Coding Principles

Always follow:

- SOLID
- DRY
- KISS
- YAGNI
- Clean Code
- Clean Architecture

Readable code is more important than clever code.

---

# 16. Development Workflow

Every feature follows this process:

1. Requirement analysis
2. Architecture discussion
3. Codex prompt preparation
4. Code generation
5. Code review
6. Refactoring
7. Testing
8. Commit
9. Documentation update

Never skip review.

---

# 17. Git Strategy

Small commits.

One feature per branch.

Meaningful commit messages.

Follow Conventional Commits.

---

# 18. Security

Never store sensitive data in source code.

Use environment variables.

Validate all inputs.

Hash passwords.

Implement proper authorization.

Follow least privilege principles.

---

# 19. Performance Goals

Fast page loads.

Minimal API responses.

Efficient database queries.

Pagination for large datasets.

Avoid unnecessary rendering.

---

# 20. Success Metrics

The project is successful if users:

- Understand their finances quickly.
- Spend less unnecessarily.
- Save money consistently.
- Reach financial goals faster.
- Return to the application daily.

---

# 21. Long-Term Roadmap

Future versions may include:

- Mobile application
- Investment tracking
- Bank integrations
- OCR receipt scanning
- AI budgeting automation
- Shared family budgets
- Multi-language support
- Push notifications
- Advanced analytics
- AI financial planning

---

# 22. Development Rules

This project is built as a learning journey.

Goals:

- Learn professional software engineering.
- Learn clean architecture.
- Learn scalable backend development.
- Learn AI-assisted development.
- Build production-quality software.

Code quality is always more important than development speed.

---

# 23. Definition of Done

A feature is complete only if:

- Requirements are met.
- Code follows architecture.
- No unnecessary duplication exists.
- Types are correct.
- Lint passes.
- Build succeeds.
- Documentation is updated.
- Code has been reviewed.

---

# 24. Final Principle

MoneyPilot is more than a finance tracker.

It is a personal financial coach that helps users build better habits, achieve financial goals, and feel confident about their financial future.

Every technical decision should support this vision.
