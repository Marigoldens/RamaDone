# RamaDone AI — Comprehensive Prompt Test Suite

All prompts below should be typed into the AI chat exactly as written.
Pass = AI calls the correct tool(s) with correct arguments and responds sensibly.
Fail = Wrong tool, wrong data, missing action, or crashes.

---

## 🟢 DIFFICULTY: EASY — Single Action, Clear Intent

### 📅 CALENDAR

| # | Prompt | Expected Tool(s) | Expected Outcome |
|---|--------|-----------------|-----------------|
| C1 | `Add a meeting tomorrow at 3 PM` | `check_conflicts` → `add_event` | Event created 3:00–4:00 PM tomorrow |
| C2 | `Schedule gym session today at 6 PM for 1 hour` | `check_conflicts` → `add_event` | Event 18:00–19:00 today |
| C3 | `What's on my calendar today?` | `get_day_narrative` | Summary of today's events |
| C4 | `Do I have anything scheduled this week?` | `get_schedule_summary` | Week summary |
| C5 | `Find me a free 30 minutes today` | `find_free_slots` | List of free slots |
| C6 | `Add Fajr prayer at 4:30 AM tomorrow` | `add_event` | Prayer event added type=prayer |
| C7 | `Block my morning from 8 AM to 12 PM tomorrow for work` | `check_conflicts` → `add_event` | 4-hour work block |
| C8 | `Delete my gym event` | `query_events` → `delete_event` | Event deleted after finding it |
| C9 | `Move my 3 PM meeting to 5 PM` | `query_events` → `update_event` | Start/end shifted by 2 hours |
| C10 | `Am I free at 2 PM today?` | `check_conflicts` | Conflict check for 2:00–2:30 |

---

### 📋 TASKS

| # | Prompt | Expected Tool(s) | Expected Outcome |
|---|--------|-----------------|-----------------|
| T1 | `Add a task to buy groceries` | `add_task` | Task added, priority=medium |
| T2 | `Create a high priority task: submit report by Friday` | `add_task` | Task with priority=high, dueDate=Friday |
| T3 | `Show me all my pending tasks` | `query_tasks` | List of todo/in-progress tasks |
| T4 | `Mark my buy groceries task as done` | `query_tasks` → `update_task` | Status changed to done |
| T5 | `Add a low priority task to clean the car` | `add_task` | Task with priority=low |
| T6 | `Delete the clean car task` | `query_tasks` → `delete_task` | Task deleted |
| T7 | `What tasks are due today?` | `query_tasks` | Tasks filtered by today's date |
| T8 | `Change submit report to medium priority` | `query_tasks` → `update_task` | Priority updated |

---

### 💰 EXPENSES (IQD)

| # | Prompt | Expected Tool(s) | Expected Outcome |
|---|--------|-----------------|-----------------|
| E1 | `I spent 50,000 IQD on groceries` | `add_expense` | amount=50000, category=food |
| E2 | `Log 25k transport expense` | `add_expense` | amount=25000, category=transport |
| E3 | `I paid 15000 for electricity` | `add_expense` | amount=15000, category=utilities |
| E4 | `Show me my expenses this month` | `query_expenses` | Monthly expense list |
| E5 | `I earned 500k salary today` | `add_expense` | type=income, amount=500000 |
| E6 | `Log a 10k shopping expense` | `add_expense` | amount=10000, category=shopping |
| E7 | `How much have I spent today?` | `query_expenses` | Today's total with breakdown |
| E8 | `Delete my last grocery expense` | `query_expenses` → `delete_expense` | Most recent food expense deleted |
| E9 | `I bought medicine for 8000 IQD` | `add_expense` | amount=8000, category=health |
| E10 | `Log 20k for entertainment` | `add_expense` | amount=20000, category=entertainment |

---

### 🎯 HABITS

| # | Prompt | Expected Tool(s) | Expected Outcome |
|---|--------|-----------------|-----------------|
| H1 | `Create a habit to drink water daily` | `add_habit` | Habit added, frequency=daily |
| H2 | `Add a weekly habit: read Quran` | `add_habit` | frequency=weekly |
| H3 | `Show me my habits` | `query_habits` | All active habits listed |
| H4 | `Mark my drink water habit as done today` | `query_habits` → `log_habit` | Log created, completed=true |
| H5 | `I completed my reading habit` | `query_habits` → `log_habit` | Reading habit logged |
| H6 | `Add a morning run habit` | `add_habit` | Habit with 🏃 or similar emoji |
| H7 | `Delete my drink water habit` | `query_habits` → `delete_habit` | Habit archived |
| H8 | `Rename my morning run habit to evening jog` | `query_habits` → `update_habit` | Name updated |

---

### 🏋️ GYM & WORKOUTS

| # | Prompt | Expected Tool(s) | Expected Outcome |
|---|--------|-----------------|-----------------|
| G1 | `Create a Push Day workout plan` | `add_workout_plan` | Plan with push exercises |
| G2 | `Show me my workout plans` | `query_workout_plans` | All plans listed |
| G3 | `Log today's workout: bench press 3×10 at 60kg` | `add_workout_log` | Log with bench press sets |
| G4 | `Show my recent workouts` | `query_workout_logs` | Last 7 days of logs |
| G5 | `How is my bench press progressing?` | `get_exercise_progression` | Bench press history |
| G6 | `Create a Full Body workout plan with squats and deadlifts` | `add_workout_plan` | Full Body plan |
| G7 | `Delete my Push Day plan` | `query_workout_plans` → `delete_workout_plan` | Plan deleted |

---

---

## 🟡 DIFFICULTY: MEDIUM — Inference Required, Multi-Step Workflows

### 📅 CALENDAR — Medium

| # | Prompt | Expected Tool(s) | Expected Outcome |
|---|--------|-----------------|-----------------|
| CM1 | `Schedule iftar with family next Friday at sunset` | `add_event` | Event near Maghrib time, type=iftar |
| CM2 | `Reschedule my meeting to tomorrow same time` | `query_events` → `update_event` | Time kept, date shifted +1 day |
| CM3 | `Book 3 dentist appointments: Monday, Wednesday, Friday at 10 AM` | 3× `add_event` | Three separate events |
| CM4 | `Clear all events from yesterday` | `clear_date_range` | Yesterday's events confirmed for deletion |
| CM5 | `Add Tarawih prayer for the next 5 nights at 9 PM` | `repeat_event` | 5 events on consecutive nights |
| CM6 | `When is my next free hour this afternoon?` | `find_free_slots` | Slots after current time today |
| CM7 | `Cancel everything on Monday` | `query_events` → `clear_date_range` | Monday events queued for deletion |
| CM8 | `Change my gym session color to green` | `query_events` → `update_event` | Color updated to emerald/green |
| CM9 | `Move all my Monday events to Tuesday` | `query_events` → multiple `update_event` | Each event shifted by 1 day |
| CM10 | `Schedule a 2-hour study block every day this week at 8 PM` | `repeat_event` | 7 events at 20:00–22:00 |

---

### 📋 TASKS — Medium

| # | Prompt | Expected Tool(s) | Expected Outcome |
|---|--------|-----------------|-----------------|
| TM1 | `I finished buying groceries` | `query_tasks` → `update_task` | Status changed to done |
| TM2 | `Show me only high priority tasks` | `query_tasks` | Filtered by priority=high |
| TM3 | `Change submit report deadline to next Monday` | `query_tasks` → `update_task` | dueDate updated |
| TM4 | `Add 5 tasks: buy milk, call doctor, pay bills, fix car, book flights` | 5× `add_task` | Five tasks created in one response |
| TM5 | `Mark all grocery-related tasks as done` | `query_tasks` → multiple `update_task` | All matching tasks updated |
| TM6 | `Move buy groceries task to in-progress` | `query_tasks` → `update_task` | Status = in-progress |
| TM7 | `What tasks are overdue?` | `query_tasks` | Tasks with past dueDate and not done |
| TM8 | `Add a task with notes: prepare presentation, notes: include Q4 charts` | `add_task` | Task with notes field populated |

---

### 💰 EXPENSES — Medium

| # | Prompt | Expected Tool(s) | Expected Outcome |
|---|--------|-----------------|-----------------|
| EM1 | `I spent 50k on food and 30k on transport today` | 2× `add_expense` | Two separate expense entries |
| EM2 | `Change my last grocery expense from 50k to 45k` | `query_expenses` → `update_expense` | Amount updated, not deleted+added |
| EM3 | `How much have I spent on food this month?` | `query_expenses` | Filtered by category=food, total shown |
| EM4 | `Log three expenses: 20k food, 10k transport, 5k health` | 3× `add_expense` | Three entries in one response |
| EM5 | `What's my total spending this week?` | `query_expenses` | Week date range total |
| EM6 | `I got paid 750k salary` | `add_expense` | type=income, amount=750000 |
| EM7 | `Change the category on my last expense from food to shopping` | `query_expenses` → `update_expense` | Category updated via update, not delete |
| EM8 | `Show me all income this month` | `query_expenses` | type=income filter applied |
| EM9 | `I went to the mall and spent 1.5k on coffee and 12k on clothes` | 2× `add_expense` | 1500 + 12000, correct categories |
| EM10 | `Generate a monthly report for this month` | `generate_monthly_report` | Report created and saved |

---

### 🎯 HABITS — Medium

| # | Prompt | Expected Tool(s) | Expected Outcome |
|---|--------|-----------------|-----------------|
| HM1 | `I did all my habits today` | `query_habits` → multiple `log_habit` | All habits logged as complete |
| HM2 | `Undo my drink water habit for today` | `query_habits` → `log_habit` | completed=false |
| HM3 | `Add 3 habits: prayer, exercise, reading` | 3× `add_habit` | Three habits created |
| HM4 | `Change my morning run habit to daily and add 🏃 emoji` | `query_habits` → `update_habit` | Updates applied |
| HM5 | `What's my habit streak looking like?` | `query_habits` | Habits with completion history |
| HM6 | `Archive all my habits` | `query_habits` → multiple `delete_habit` | All habits soft-deleted |

---

### 🏋️ GYM — Medium

| # | Prompt | Expected Tool(s) | Expected Outcome |
|---|--------|-----------------|-----------------|
| GM1 | `Create a PPL split: Push, Pull, Legs plans` | 3× `add_workout_plan` | Three plans in one response |
| GM2 | `Log today's push day: bench 4×8 at 80kg, OHP 3×10 at 50kg` | `add_workout_log` | Log with 2 exercises, sets with weights |
| GM3 | `What's my squat PR?` | `get_exercise_progression` | Squat history with highest weight |
| GM4 | `Add pull-ups to my Pull Day plan` | `query_workout_plans` → `update_workout_plan` | Exercise added to existing plan |
| GM5 | `Show me my workouts from this week` | `query_workout_logs` | Filtered by this week's date range |

---

---

## 🔴 DIFFICULTY: HARD — Complex Parsing, Multi-Domain, Edge Cases

### 🌐 MULTI-DOMAIN (Multiple Categories in One Message)

| # | Prompt | Expected Tool(s) | Expected Outcome |
|---|--------|-----------------|-----------------|
| MD1 | `Add a task to call the doctor and also log 30k for medicine` | `add_task` + `add_expense` | Both actions in one response |
| MD2 | `Create a gym habit and also make a Push Day workout plan` | `add_habit` + `add_workout_plan` | Both created |
| MD3 | `Schedule a meeting at 4 PM, add a task to prepare slides, and log 10k for coffee` | `add_event` + `add_task` + `add_expense` | All three in one response |
| MD4 | `Mark my reading habit done, add a note task to finish chapter 5, and log 5k for books` | `log_habit` + `add_task` + `add_expense` | All three executed |
| MD5 | `I had a productive day: went to gym for 2 hours, bought groceries for 45k, finished my report task, and drank water` | `add_workout_log` + `add_expense` + `update_task` + `log_habit` | Four actions |

---

### 💰 EXPENSE EDGE CASES (IQD, k-notation, Casual Language)

| # | Prompt | Expected Tool(s) | Expected Outcome |
|---|--------|-----------------|-----------------|
| EH1 | `I spent 50k on food and went to the mall and ate for 30k and spent 10k on transport` | 3× `add_expense` | 50000 food + 30000 food/shopping + 10000 transport |
| EH2 | `paid 1.5k for tea, 2.5k for lunch, and 500 for candy` | 3× `add_expense` | 1500 + 2500 + 500, all food |
| EH3 | `Electricity 25k, water 8k, internet 15k` | 3× `add_expense` | All utilities category |
| EH4 | `I got 200k from work and paid 50k rent, 30k groceries, and 20k phone bill` | 1× income + 3× expense | 4 entries: 200k income + 3 expenses |
| EH5 | `Fix my food expense — it should be 60k not 50k` | `query_expenses` → `update_expense` | Amount corrected via update (not delete+add) |
| EH6 | `Log 100 thousand IQD transport` | `add_expense` | amount=100000, transport |
| EH7 | `I spent half a million on rent` | `add_expense` | amount=500000, utilities or other |
| EH8 | `Delete all my food expenses from today` | `query_expenses` → multiple `delete_expense` | All today's food expenses removed |
| EH9 | `How much money did I waste on entertainment this month compared to last month?` | `query_expenses` (×2 date ranges) | Two queries, comparison in AI response |
| EH10 | `I bought coffee for 2k, lunch for 15k, and a book for 8k, also paid 30k for taxi` | 4× `add_expense` | coffee+lunch+book=food/other, taxi=transport |

---

### 📅 CALENDAR EDGE CASES

| # | Prompt | Expected Tool(s) | Expected Outcome |
|---|--------|-----------------|-----------------|
| CH1 | `Schedule 5 study sessions this week: Mon, Tue, Wed, Thu, Fri at 7 PM for 90 minutes` | `repeat_event` or 5× `add_event` | Five events 19:00–20:30 |
| CH2 | `Block out the whole afternoon tomorrow (12 PM to 6 PM) for deep work` | `add_event` | One 6-hour event |
| CH3 | `Add Suhoor tomorrow 30 minutes before Fajr` | `add_event` | Calculated from prayer times |
| CH4 | `Reschedule all this week's meetings to next week at the same time` | `query_events` → multiple `update_event` | Each meeting date shifted +7 days |
| CH5 | `Do I have any conflicts on Thursday?` | `query_events` + `check_conflicts` | List of Thursday events + overlap check |
| CH6 | `Add 30-day Quran reading sessions at 9 PM every night` | `repeat_event` | 30 dates with 9 PM events |
| CH7 | `What's my schedule for the next 3 days?` | `get_schedule_summary` | 3-day range summary |

---

### 📋 TASK EDGE CASES

| # | Prompt | Expected Tool(s) | Expected Outcome |
|---|--------|-----------------|-----------------|
| TH1 | `Add 5 tasks for work: write report, send emails, review code, update docs, attend standup` | 5× `add_task` | Five tasks, all work-related |
| TH2 | `Change ALL pending tasks to in-progress` | `query_tasks` → multiple `update_task` | Status changed for all |
| TH3 | `I finished everything today` | `query_tasks` → multiple `update_task` | All pending tasks marked done |
| TH4 | `Move my buy groceries task due date to tomorrow and make it high priority` | `query_tasks` → `update_task` | Two field updates in one call |
| TH5 | `What's still unfinished from tasks that were due this week?` | `query_tasks` | Past-due tasks, not done |

---

### 🏋️ GYM EDGE CASES

| # | Prompt | Expected Tool(s) | Expected Outcome |
|---|--------|-----------------|-----------------|
| GH1 | `Create a full 4-day split: Chest/Triceps, Back/Biceps, Legs, Shoulders/Arms` | 4× `add_workout_plan` | Four plans in one response |
| GH2 | `Log today's session: squats 5×5 at 100kg, leg press 3×12 at 150kg, calf raises 3×15` | `add_workout_log` | One log with 3 exercises and sets |
| GH3 | `Am I getting stronger on bench press?` | `get_exercise_progression` | Full bench press history |
| GH4 | `Add bench press, incline press, and dips to my Push Day, each 4 sets 8 reps` | `query_workout_plans` → `update_workout_plan` | Three exercises added |
| GH5 | `Delete all my workout logs from last month` | `query_workout_logs` → multiple `delete_workout_log` | Logs from previous month removed |

---

### 🧠 AMBIGUOUS / NATURAL LANGUAGE PARSING (Hardest)

These test whether the AI can infer intent from very casual or broken language.

| # | Prompt | Expected Tool(s) | Expected Outcome |
|---|--------|-----------------|-----------------|
| NL1 | `bro i went to the mall today spent like 40k there and also 10k on the cab home` | 2× `add_expense` | 40000 shopping + 10000 transport |
| NL2 | `اشتريت طعام بـ 25 الف ودفعت 15 الف نقل` | 2× `add_expense` | 25000 food + 15000 transport (Arabic) |
| NL3 | `remind me to call Ahmed tomorrow at noon` | `add_event` | Event "Call Ahmed" 12:00–13:00 tomorrow |
| NL4 | `can you block some time for me to workout tonight around 7` | `add_event` | Gym/workout event ~19:00 |
| NL5 | `I've been drinking water every day this week, can you log it?` | `query_habits` → multiple `log_habit` | Habit logged for each day this week |
| NL6 | `ugh i totally forgot to log my expenses — yesterday i spent 35k on lunch and 20k taxi` | 2× `add_expense` with yesterday's date | Dated to yesterday, not today |
| NL7 | `my salary came in today, 800 thousand` | `add_expense` | type=income, amount=800000 |
| NL8 | `update my groceries expense — I actually paid 52,500 not 50,000` | `query_expenses` → `update_expense` | Amount corrected (NOT delete+add) |
| NL9 | `show me everything i spent money on this month and give me a breakdown` | `query_expenses` → AI summary | Full monthly breakdown with totals |
| NL10 | `I'm going to start going to the gym 3 times a week, can you make me a habit and a workout plan?` | `add_habit` + `add_workout_plan` | Habit (weekly, 3×) + plan created |

---

### 🔁 EDIT vs DELETE — AI Should NEVER Delete Then Re-Add

These test the critical rule: changing something = `update_*`, not `delete_* + add_*`.

| # | Prompt | Expected Tool(s) | Must NOT Call |
|---|--------|-----------------|--------------|
| EV1 | `Change my food expense from 50k to 45k` | `query_expenses` → `update_expense` | `delete_expense` + `add_expense` |
| EV2 | `Rename my morning run habit to evening walk` | `query_habits` → `update_habit` | `delete_habit` + `add_habit` |
| EV3 | `Change my gym meeting to 6 PM instead of 5 PM` | `query_events` → `update_event` | `delete_event` + `add_event` |
| EV4 | `Make my submit report task high priority` | `query_tasks` → `update_task` | `delete_task` + `add_task` |
| EV5 | `Update my Push Day plan to include cable flyes` | `query_workout_plans` → `update_workout_plan` | `delete_workout_plan` + `add_workout_plan` |

---

### 🗓️ RAMADAN-SPECIFIC (when Ramadan Mode is ON)

| # | Prompt | Expected Tool(s) | Expected Outcome |
|---|--------|-----------------|-----------------|
| RM1 | `When is Iftar today?` | None (answered from prayer times) | Maghrib time given |
| RM2 | `Add Suhoor tomorrow` | `add_event` | Event 30–60 min before Fajr, type=suhoor |
| RM3 | `Schedule Tarawih prayer tonight` | `add_event` | Event ~30 min after Isha, type=prayer |
| RM4 | `Block Iftar time every night for the rest of Ramadan` | `repeat_event` | Multiple events at Maghrib time |
| RM5 | `What time should I eat Suhoor tomorrow?` | None (prayer time calculation) | 30–60 min before Fajr answer |
| RM6 | `Add a 20-minute Quran session after each Fajr for this week` | `repeat_event` | 7 events at Fajr + some offset |

---

### 📊 REPORTING & ANALYSIS

| # | Prompt | Expected Tool(s) | Expected Outcome |
|---|--------|-----------------|-----------------|
| RA1 | `Generate my monthly expense report for this month` | `generate_monthly_report` | Report created and saved |
| RA2 | `What are my biggest spending categories?` | `query_expenses` | AI analyzes and ranks by category total |
| RA3 | `How much am I spending per day on average?` | `query_expenses` | Daily average calculated |
| RA4 | `Am I saving money this month?` | `query_expenses` | Income vs expense comparison |
| RA5 | `What did I spend most money on last week?` | `query_expenses` (last 7 days) | Highest category identified |

---

## 🏆 BOSS LEVEL — Maximum Complexity

These are the hardest prompts combining multiple domains, casual language, and complex logic.

| # | Prompt | Expected Tools | Expected Outcome |
|---|--------|---------------|-----------------|
| B1 | `Today was expensive: spent 50k on food, 30k at mall, 10k taxi, also went to gym (bench 4×10 at 70kg, squats 3×12 at 80kg), finished my report task, and marked reading and water habits done` | 3× `add_expense` + `add_workout_log` + `update_task` + 2× `log_habit` | 8 actions in one response |
| B2 | `Plan my whole week: add study sessions every day 8-10 PM, gym on Mon/Wed/Fri 6-7:30 PM, Friday family dinner 7 PM, and create tasks for: prepare study notes, buy protein powder, call mom` | `repeat_event` (study) + 3× `add_event` (gym) + `add_event` (dinner) + 3× `add_task` | Full week planned |
| B3 | `I got paid 1 million today, paid rent 300k, groceries 50k, phone 25k, internet 18k, transport 30k, and gym membership 15k. What's my remaining balance?` | 1× income + 6× expense → AI calculates balance | 7 entries + calculation: 1,000,000 − 438,000 = 562,000 IQD |
| B4 | `Create me a complete gym program: Push (bench, OHP, tricep extensions — 4 sets each), Pull (rows, pulldowns, bicep curls — 4 sets), Legs (squats, leg press, RDL — 4 sets), and make a gym habit 5x per week` | 3× `add_workout_plan` + `add_habit` | 4 actions, detailed plans |
| B5 | `Review my finances: show me this month's expenses, compare to income, and generate an AI report` | `query_expenses` → `generate_monthly_report` | Full analysis + saved report |

---

## ✅ EXPECTED BEHAVIOR CHECKLIST

Use this when evaluating any test:

- [ ] **IQD amounts**: Displayed as `50,000 IQD` not `50000.00` or `$50`
- [ ] **k-notation**: `50k` correctly converted to `50000`
- [ ] **Multi-expense**: Multiple amounts = multiple `add_expense` calls in ONE response
- [ ] **Edit rule**: Changing something always uses `update_*`, never `delete_* + add_*`
- [ ] **Batching**: Multi-action requests produce ALL tool calls in a single response
- [ ] **Categories**: Food/food, Transport/transport (lowercase in DB)
- [ ] **Confirmation card**: Shows before any write action is saved
- [ ] **Date inference**: "today", "tomorrow", "next week" correctly resolved
- [ ] **Prayer times**: Iftar = Maghrib, Suhoor = 30–60 min before Fajr
- [ ] **No false queries**: AI doesn't call `query_events` for expense questions

---

## 📝 HOW TO RUN THIS TEST SUITE

1. Open the app and go to **AI Chat**
2. For each test: type the prompt exactly, press send
3. Check: does the **confirmation card** show the right actions?
4. Click **Confirm** and verify data was saved correctly in the relevant view
5. Mark pass/fail in this document

> **Tip**: Run Easy tests first to verify basics, then Medium, then Hard. If an Easy test fails, debug the AI prompt before continuing.

---

*Generated for RamaDone v0.0.0 — Last updated: April 2026*
