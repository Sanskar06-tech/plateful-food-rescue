# Plateful - AI-Powered Food Rescue Platform (MERN)

Course: AI Powered Full Stack Development (25CS2308). Stack: **React (Vite) + Tailwind CSS, Node.js + Express, MongoDB + Mongoose, JWT auth, Claude AI API**.

## Run locally
You need Node.js 18+ and MongoDB (local install or a free MongoDB Atlas cluster).

```bash
# Terminal 1 - backend
cd server
npm install
copy .env.example .env      # Windows (Mac/Linux: cp). Then edit .env: MONGO_URI, JWT_SECRET, optional ANTHROPIC_API_KEY
npm run dev                 # http://localhost:5000

# Terminal 2 - frontend
cd client
npm install
npm run dev                 # http://localhost:5173
```
Open http://localhost:5173. The API key is optional: without it the AI features use rule-based fallbacks.
On Windows edit `.env` in VS Code and save as UTF-8 (do not create it with `echo >`).

## Demo flow (matches the 5 workflow steps)
1. Sign up as a **Donor** and as an **NGO** (use two browsers or a private window).
2. Donor: **Donate** -> food, quantity, area, **pickup deadline**; click "Check food safety with AI".
3. NGO: **Browse food** -> search/filter, then **AI: prioritize for me** (ranked High/Medium/Low with reasons).
4. NGO: **Request pickup**. Donor: **My dashboard** -> **Confirm** or **Decline**.
5. NGO: **My dashboard** -> **Mark picked up** -> **Mark delivered**. Completed counts update.

## API (test in Postman / Thunder Client)
| Method | Route | Who |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | public |
| GET | /api/auth/me | logged in |
| GET | /api/donations?search=&category= | public |
| GET | /api/donations/stats, /api/donations/mine | public / logged in |
| POST/PUT/DELETE | /api/donations, /api/donations/:id | donor |
| POST | /api/donations/:id/request | NGO |
| POST | /api/donations/:id/respond {accept} | donor |
| POST | /api/donations/:id/status {status: picked_up/delivered} | NGO |
| POST | /api/ai/analyze, /api/ai/prioritize, /api/ai/chat | logged in (prioritize: NGO) |

Send the JWT as `Authorization: Bearer <token>`.

## Syllabus mapping (for viva)
- **M1 HTML5**: semantic header/nav/main/footer, labels, aria-live/alert, alt-free accessible forms, viewport meta, SEO description.
- **M2 CSS/Tailwind**: Tailwind v4 utilities, CSS variables (theme), Flexbox/Grid, responsive classes, reusable `.btn/.card/.input`.
- **M3 JavaScript**: ES6+ (destructuring, spread, optional chaining, `??`), async/await + Fetch API, debounced search, localStorage, error handling.
- **M4 Node/Express/MongoDB**: REST routes, middleware, dotenv, JWT + bcrypt, input validation, Mongoose schemas and CRUD, AI endpoints.
- **M5 React**: components, props, hooks (useState/useEffect/useCallback), Context, React Router, controlled forms, loading/error states, Vite.
- **AI + Authentic Intelligence**: AI JSON output is validated in `server/utils/ai.js` (allowed categories, hour range, known ids) and falls back to rules if the AI fails.

## Deploy
- **Backend (Render)**: new Web Service from your GitHub repo, root `server`, build `npm install`, start `npm start`; add env vars MONGO_URI (Atlas), JWT_SECRET, ANTHROPIC_API_KEY, CLIENT_URL (your Vercel URL).
- **Frontend (Vercel)**: import repo, root `client`, framework Vite; add env var `VITE_API_URL=https://<your-render-app>.onrender.com/api`.

## Git
```bash
git init && git add . && git commit -m "Plateful MERN project"
git branch -M main && git remote add origin <your-github-url> && git push -u origin main
```
