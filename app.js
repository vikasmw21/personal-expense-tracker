const $ = (id) => document.getElementById(id);
const USERS_KEY = "spendwise_users_v1";
const SESSION_KEY = "spendwise_session_v1";
const EXPENSES_KEY = "spendwise_expenses_v1";
const INCOME_KEY = "spendwise_income_v1";
const BUDGETS_KEY = "spendwise_budgets_v1";
const categories = [
  {name:"Food & Dining", icon:"☕", cls:"cat-food"},
  {name:"Transport", icon:"↗", cls:"cat-transport"},
  {name:"Shopping", icon:"◇", cls:"cat-shopping"},
  {name:"Education", icon:"▤", cls:"cat-education"},
  {name:"Bills & Utilities", icon:"▥", cls:"cat-bills"},
  {name:"Health", icon:"✚", cls:"cat-health"},
  {name:"Entertainment", icon:"♫", cls:"cat-entertainment"},
  {name:"Other", icon:"•••", cls:"cat-other"}
];
let currentUser = null;
let toastTimer = null;
let pendingRegistration = null;
let selectedCategory = categories[0]?.name || "Food & Dining";

function read(key, fallback=[]) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; }
  catch { return fallback; }
}
function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function allUsers() { return read(USERS_KEY, []); }
function allExpenses() { return read(EXPENSES_KEY, []); }
function allIncome() { return read(INCOME_KEY, []); }
function allBudgets() { return read(BUDGETS_KEY, []); }
function userIncome() { return allIncome().filter(i => i.userId === currentUser?.id); }
function userBudgets() { return allBudgets().filter(b => b.userId === currentUser?.id); }
function currentMonth() { return new Date().toISOString().slice(0, 7); }
function userExpenses() { return allExpenses().filter(e => e.userId === currentUser?.id); }

// Warn when the selected category exceeds its budget for the expense's month.
function checkBudgetExceeded(expense) {
  if (!currentUser || !expense) return;
  const month = String(expense.date || "").slice(0, 7);
  const budget = userBudgets().find(b => b.month === month && b.category === expense.category);
  if (!budget) return;
  const spent = userExpenses()
    .filter(e => e.category === expense.category && String(e.date || "").slice(0, 7) === month)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  if (spent > Number(budget.amount)) {
    const excess = spent - Number(budget.amount);
    alert(`⚠️ Budget exceeded: ${expense.category}\\n\\nMonthly budget: ${money(budget.amount)}\\nTotal spent this month: ${money(spent)}\\nAmount over budget: ${money(excess)}`);
  }
}
function money(value) { return new Intl.NumberFormat("en-IN", {style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(value)||0); }
function escapeHtml(value="") { return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function dateLabel(value) { if(!value) return "—"; return new Date(value+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}); }
function categoryInfo(name) { return categories.find(c=>c.name===name) || categories[categories.length-1]; }
function getCategoryIcon(name) { const c=categoryInfo(name); return `<span class="category-icon ${c.cls}">${c.icon}</span>`; }
function showToast(message) {
  const el=$("toast"); el.textContent=message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2600);
}
function isNitwStudentEmail(email) {
  return /^[A-Za-z0-9._%+-]+@student\.nitw\.ac\.in$/i.test(email);
}
function showAuthMessage(message, success=false) { $("authMessage").textContent=message; $("authMessage").style.color=success?"#16855f":"#c54b4b"; }
function switchAuth(tab) {
  document.querySelectorAll(".auth-tab").forEach(b=>b.classList.toggle("active",b.dataset.auth===tab));
  $("loginFormWrap").classList.toggle("hidden",tab!=="login");
  $("registerFormWrap").classList.toggle("hidden",tab!=="register");
  $("verifyEmailWrap").classList.add("hidden");
  showAuthMessage("");
}
document.querySelectorAll(".auth-tab").forEach(b=>b.addEventListener("click",()=>switchAuth(b.dataset.auth)));

$("registerForm").addEventListener("submit",e=>{
  e.preventDefault();
  const name=$("registerName").value.trim(), email=$("registerEmail").value.trim().toLowerCase();
  const password=$("registerPassword").value, confirm=$("registerConfirm").value;
  if(name.length<2) return showAuthMessage("Please enter your full name.");
  if(!isNitwStudentEmail(email)) return showAuthMessage("Use your NITW student email, e.g. xyz@student.nitw.ac.in.");
  if(password.length<6) return showAuthMessage("Password must be at least 6 characters.");
  if(password!==confirm) return showAuthMessage("The passwords do not match.");
  if(allUsers().some(u=>u.email===email)) return showAuthMessage("An account with this email already exists.");
  // Frontend-only verification demonstration. The real email must be sent by a backend service.
  const code=String(Math.floor(100000+Math.random()*900000));
  pendingRegistration={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name,email,password,code,createdAt:Date.now()};
  $("registerFormWrap").classList.add("hidden");
  $("loginFormWrap").classList.add("hidden");
  $("verifyEmailWrap").classList.remove("hidden");
  $("demoCodeNotice").textContent=`DEMO ONLY — your verification code is ${code}`;
  $("verificationCode").value=""; showAuthMessage(""); $("verificationCode").focus();
});
$("verifyEmailForm").addEventListener("submit",e=>{
  e.preventDefault();
  if(!pendingRegistration) return showAuthMessage("Please start registration again.");
  if(Date.now()-pendingRegistration.createdAt>10*60*1000){pendingRegistration=null;$("verifyEmailWrap").classList.add("hidden");switchAuth("register");return showAuthMessage("Code expired. Please register again.");}
  if($("verificationCode").value.trim()!==pendingRegistration.code) return showAuthMessage("That code is incorrect. Please try again.");
  const {code,createdAt,...user}=pendingRegistration;
  user.emailVerified=true; user.studentId=""; user.department=""; user.year=""; user.phone="";
  const users=allUsers(); users.push(user); write(USERS_KEY,users); pendingRegistration=null;
  $("verifyEmailWrap").classList.add("hidden");
  currentUser={...user}; write(SESSION_KEY,currentUser); enterApp(); showToast("Demo email verification complete.");
});
$("resendVerificationBtn")?.addEventListener("click",()=>{
  if(!pendingRegistration)return showAuthMessage("Start registration again to request a code.");
  pendingRegistration.code=String(Math.floor(100000+Math.random()*900000)); pendingRegistration.createdAt=Date.now();
  $("demoCodeNotice").textContent=`DEMO ONLY — your new verification code is ${pendingRegistration.code}`; $("verificationCode").value=""; showAuthMessage("A new demo code has been generated.",true);
});
$("cancelVerificationBtn").addEventListener("click",()=>{pendingRegistration=null;$("verifyEmailWrap").classList.add("hidden");switchAuth("register");});
$("loginForm").addEventListener("submit",e=>{
  e.preventDefault();
  const email=$("loginEmail").value.trim().toLowerCase(), password=$("loginPassword").value;
  if(!isNitwStudentEmail(email)) return showAuthMessage("Use your NITW student email, e.g. xyz@student.nitw.ac.in.");
  const user=allUsers().find(u=>u.email===email&&u.password===password);
  if(!user) return showAuthMessage("Email or password is incorrect. Try registering first.");
  if(user.emailVerified===false) return showAuthMessage("Please verify your email before signing in.");
  currentUser={...user}; write(SESSION_KEY,currentUser); enterApp();
});
$("logoutBtn").addEventListener("click",logout);
if($("topLogoutBtn")) $("topLogoutBtn").addEventListener("click",logout);
function logout(){
  // Clear the active session and return to the login screen without deleting saved student data.
  localStorage.removeItem(SESSION_KEY); currentUser=null; pendingRegistration=null;
  $("appView").classList.add("hidden"); $("authView").classList.remove("hidden");
  if($("loginForm")) $("loginForm").reset(); if($("registerForm")) $("registerForm").reset();
  if($("verifyEmailWrap")) $("verifyEmailWrap").classList.add("hidden");
  showAuthMessage("You have been logged out."); switchAuth("login");
}
function enterApp(){
  $("authView").classList.add("hidden");$("appView").classList.remove("hidden");
  const first=currentUser.name.trim().split(/\s+/)[0];
  $("sidebarName").textContent=currentUser.name;$("sidebarEmail").textContent=currentUser.email;
  $("avatar").textContent=first.charAt(0).toUpperCase();$("topAvatar").textContent=first.charAt(0).toUpperCase();
  $("greeting").textContent=`Good ${getDayPart()}, ${first} 👋`;
  $("todayLabel").textContent=new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
  renderAll(); renderProfile(); navigate("overview");
}
function getDayPart(){const h=new Date().getHours();return h<12?"morning":h<17?"afternoon":"evening";}

function navigate(page){
  const titles={overview:"Overview",expenses:"Expenses",income:"Income",budgets:"Budgets",transactions:"Transaction history",profile:"My profile",categories:"Categories",reports:"Reports"};
  document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));
  $(page+"Page").classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  $("breadcrumbPage").textContent=titles[page]||"Overview";
  if(page==="expenses") renderExpenses();
  if(page==="categories") renderCategories();
  if(page==="reports") renderReports();
  if(page==="transactions") renderTransactionHistory();
  if(page==="profile") renderProfile();
}
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
$("viewAllBtn").addEventListener("click",()=>navigate("expenses"));
$("quickAddBtn").addEventListener("click",()=>openExpenseModal());
$("emptyAddBtn").addEventListener("click",()=>openExpenseModal());
$("addExpenseBtn").addEventListener("click",()=>openExpenseModal());
$("themeBtn").addEventListener("click",()=>{document.body.classList.toggle("dark-mode");localStorage.setItem("spendwise_dark",document.body.classList.contains("dark-mode")?"1":"0");});
if(localStorage.getItem("spendwise_dark")==="1")document.body.classList.add("dark-mode");

function renderAll(){renderOverview();renderExpenses();renderIncome();renderBudgets();renderCategories();renderReports();populateCategoryFilter();renderTransactionHistory();renderProfile();}
function renderOverview(){
  const expenses=userExpenses().sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
  const total=expenses.reduce((s,e)=>s+Number(e.amount),0);
  $("totalExpense").textContent=money(total);$("transactionCount").textContent=expenses.length;
  $("averageExpense").textContent=money(expenses.length?total/expenses.length:0);
  $("reportCount").textContent=expenses.length;$("reportTotal").textContent=money(total);
  $("recentTransactions").innerHTML=expenses.slice(0,5).map(e=>`
    <div class="transaction-row">${getCategoryIcon(e.category)}<div class="transaction-copy"><strong>${escapeHtml(e.description)}</strong><span>${escapeHtml(e.category)} · ${dateLabel(e.date)}</span></div><span class="transaction-amount">− ${money(e.amount)}</span></div>`).join("");
  $("recentEmpty").classList.toggle("hidden",expenses.length>0);
  $("categoryBreakdown").innerHTML="";
  const totals={};expenses.forEach(e=>totals[e.category]=(totals[e.category]||0)+Number(e.amount));
  const ranked=Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,5);
  $("categoryEmpty").classList.toggle("hidden",ranked.length>0);
  $("categoryBreakdown").innerHTML=ranked.map(([name,amount])=>`
    <div><div class="category-line-top"><span>${escapeHtml(name)}</span><strong>${money(amount)}</strong></div><div class="progress"><span style="width:${total?Math.max(3,amount/total*100):0}%"></span></div></div>`).join("");
}
function populateCategoryFilter(){
  const select=$("categoryFilter"), value=select.value;
  select.innerHTML='<option value="">All categories</option>'+categories.map(c=>`<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("");
  select.value=value;
}
function renderExpenses(){
  if(!currentUser)return;
  const query=$("searchInput").value.trim().toLowerCase(), category=$("categoryFilter").value, sort=$("sortFilter").value;
  let expenses=userExpenses().filter(e=>(!category||e.category===category)&&(!query||e.description.toLowerCase().includes(query)||e.category.toLowerCase().includes(query)||(e.notes||"").toLowerCase().includes(query)));
  expenses.sort((a,b)=>sort==="oldest"?a.date.localeCompare(b.date):sort==="high"?b.amount-a.amount:sort==="low"?a.amount-b.amount:b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
  $("filteredCount").textContent=expenses.length;
  $("expenseTableBody").innerHTML=expenses.map(e=>`<tr>
    <td><div class="table-description">${getCategoryIcon(e.category)}<div>${escapeHtml(e.description)}${e.notes?`<div style="font-weight:400;color:#9ba3b2;font-size:10px;margin-top:4px">${escapeHtml(e.notes)}</div>`:""}</div></div></td>
    <td>${escapeHtml(e.category)}</td><td>${dateLabel(e.date)}</td><td class="align-right"><strong>${money(e.amount)}</strong></td>
    <td><div class="table-actions"><button class="action-btn" data-edit="${e.id}">Edit</button><button class="action-btn delete" data-delete="${e.id}">Delete</button></div></td></tr>`).join("");
  $("tableEmpty").classList.toggle("hidden",expenses.length>0);
  $("expenseTableBody").querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>openExpenseModal(b.dataset.edit)));
  $("expenseTableBody").querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteExpense(b.dataset.delete)));
}
["searchInput","categoryFilter","sortFilter"].forEach(id=>$(id).addEventListener(id==="searchInput"?"input":"change",renderExpenses));

function openExpenseModal(id=null){
  $("expenseForm").reset();$("expenseFormError").textContent="";$("editExpenseId").value="";
  $("expenseDate").value=new Date().toISOString().slice(0,10);
  $("modalTitle").textContent=id?"Edit expense":"Add expense";$("saveExpenseBtn").textContent=id?"Update expense":"Save expense";
  if(id){
    const e=userExpenses().find(x=>x.id===id);if(!e)return;
    $("editExpenseId").value=e.id;$("expenseDescription").value=e.description;$("expenseAmount").value=e.amount;
    $("expenseDate").value=e.date;$("expenseCategory").value=e.category;$("expenseNotes").value=e.notes||"";
  }
  $("expenseModal").classList.remove("hidden");setTimeout(()=>$("expenseDescription").focus(),50);
}
function closeExpenseModal(){$("expenseModal").classList.add("hidden");}
$("closeModalBtn").addEventListener("click",closeExpenseModal);$("cancelModalBtn").addEventListener("click",closeExpenseModal);
$("expenseModal").addEventListener("click",e=>{if(e.target===$("expenseModal"))closeExpenseModal();});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeExpenseModal();});
$("expenseForm").addEventListener("submit",e=>{
  e.preventDefault();
  const description=$("expenseDescription").value.trim(),amount=Number($("expenseAmount").value),date=$("expenseDate").value,category=$("expenseCategory").value,notes=$("expenseNotes").value.trim(),id=$("editExpenseId").value;
  if(!description)return $("expenseFormError").textContent="Please enter a description.";
  if(!Number.isFinite(amount)||amount<=0)return $("expenseFormError").textContent="Amount must be greater than zero.";
  if(!date)return $("expenseFormError").textContent="Please choose a date.";
  if(!category)return $("expenseFormError").textContent="Please choose a category.";
  const expenses=allExpenses();
  if(id){
    const index=expenses.findIndex(x=>x.id===id&&x.userId===currentUser.id);
    if(index<0)return $("expenseFormError").textContent="This expense could not be found.";
    expenses[index]={...expenses[index],description,amount,date,category,notes,updatedAt:Date.now()};
    write(EXPENSES_KEY,expenses);
    const savedExpense = expenses[index];
    closeExpenseModal();renderAll();checkBudgetExceeded(savedExpense);showToast("Expense updated successfully.");
  }else{
    const savedExpense={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),userId:currentUser.id,description,amount,date,category,notes,createdAt:Date.now()};
    expenses.push(savedExpense);
    write(EXPENSES_KEY,expenses);closeExpenseModal();renderAll();checkBudgetExceeded(savedExpense);showToast("Expense added successfully.");
  }
});
function deleteExpense(id){
  const e=userExpenses().find(x=>x.id===id);if(!e)return;
  if(!confirm(`Delete "${e.description}"? This cannot be undone.`))return;
  write(EXPENSES_KEY,allExpenses().filter(x=>!(x.id===id&&x.userId===currentUser.id)));
  renderAll();showToast("Expense deleted.");
}
function renderCategories(){
  if(!currentUser || !$("categoriesGrid")) return;
  const expenses=userExpenses();
  const totals={}; expenses.forEach(e=>totals[e.category]=(totals[e.category]||0)+Number(e.amount));
  if(!categories.some(c=>c.name===selectedCategory)) selectedCategory=categories[0]?.name || "Other";
  $("categoriesGrid").innerHTML=categories.map(c=>{
    const count=expenses.filter(e=>e.category===c.name).length;
    return `<button type="button" class="category-insight-card ${selectedCategory===c.name?"selected":""}" data-category-select="${escapeHtml(c.name)}" aria-pressed="${selectedCategory===c.name}">
      <div class="category-insight-card-top">${getCategoryIcon(c.name)}<span class="category-card-arrow">↗</span></div>
      <strong>${escapeHtml(c.name)}</strong><span class="category-insight-amount">${money(totals[c.name]||0)}</span>
      <span class="category-insight-count">${count} transaction${count===1?"":"s"}</span>
      <div class="progress"><span style="width:${Math.min(100,expenses.length?(totals[c.name]||0)/Math.max(1,expenses.reduce((sum,e)=>sum+Number(e.amount),0))*100:0)}%"></span></div>
    </button>`;
  }).join("");
  $("categoriesGrid").querySelectorAll("[data-category-select]").forEach(btn=>btn.addEventListener("click",()=>{selectedCategory=btn.dataset.categorySelect;renderCategories();}));
  renderCategoryDetail();
}
function renderCategoryDetail(){
  if(!currentUser || !$("categoryDetailTitle")) return;
  const category=selectedCategory;
  const rows=userExpenses().filter(e=>e.category===category).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
  const total=rows.reduce((sum,e)=>sum+Number(e.amount),0);
  $("categoryDetailTitle").textContent=`${category} details`;
  $("categoryDetailSubtitle").textContent=`A focused view of your ${category.toLowerCase()} spending.`;
  $("categoryTotalSpent").textContent=money(total);
  $("categoryTransactionCount").textContent=rows.length;
  $("categoryAverageSpent").textContent=money(rows.length?total/rows.length:0);
  const months=[]; const now=new Date();
  for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,label:d.toLocaleDateString("en-IN",{month:"short"}),amount:0});}
  rows.forEach(e=>{const m=months.find(m=>m.key===String(e.date||"").slice(0,7));if(m)m.amount+=Number(e.amount);});
  const max=Math.max(1,...months.map(m=>m.amount));
  $("categoryMonthlyBars").innerHTML=months.map(m=>`<div class="category-month-bar-wrap"><div class="category-month-value">${m.amount?money(m.amount):"—"}</div><div class="category-month-bar-track"><span style="height:${m.amount?Math.max(5,m.amount/max*100):0}%"></span></div><span class="category-month-label">${m.label}</span></div>`).join("");
  $("categoryRecentTransactions").innerHTML=rows.slice(0,5).map(e=>`<div class="transaction-row">${getCategoryIcon(e.category)}<div class="transaction-copy"><strong>${escapeHtml(e.description)}</strong><span>${dateLabel(e.date)}${e.notes?" · "+escapeHtml(e.notes):""}</span></div><span class="transaction-amount">− ${money(e.amount)}</span></div>`).join("");
  $("categoryTransactionsEmpty").classList.toggle("hidden",rows.length>0);
  const budget=userBudgets().find(b=>b.category===category&&b.month===currentMonth());
  const thisMonth=rows.filter(e=>String(e.date||"").slice(0,7)===currentMonth()).reduce((sum,e)=>sum+Number(e.amount),0);
  if(budget){const pct=Number(budget.amount)>0?thisMonth/Number(budget.amount)*100:0;$("categoryBudgetInsight").innerHTML=`<strong>Monthly budget: ${money(budget.amount)}</strong><span>This month: ${money(thisMonth)} spent · ${money(Number(budget.amount)-thisMonth)} ${Number(budget.amount)-thisMonth>=0?"remaining":"over budget"}</span><div class="budget-progress"><span class="${pct>=100?"over":pct>=75?"warning":""}" style="width:${Math.min(100,pct)}%"></span></div>`;}
  else {$ ("categoryBudgetInsight").innerHTML=`<strong>No budget set for ${escapeHtml(category)}</strong><span>Set a monthly budget to compare spending against a target.</span>`;}
}
$("categoryViewExpensesBtn")?.addEventListener("click",()=>{navigate("expenses");$("categoryFilter").value=selectedCategory;renderExpenses();});
function renderReports(){const expenses=userExpenses();$("reportCount").textContent=expenses.length;$("reportTotal").textContent=money(expenses.reduce((s,e)=>s+Number(e.amount),0));}

$("categoryFilter").addEventListener("change",renderExpenses);

// MODULE 3 — Income Management
$("addIncomeBtn").addEventListener("click",()=>openIncomeModal());
$("incomeSearchInput").addEventListener("input",renderIncome);
$("closeIncomeModalBtn").addEventListener("click",closeIncomeModal);
$("cancelIncomeModalBtn").addEventListener("click",closeIncomeModal);
$("incomeModal").addEventListener("click",e=>{if(e.target===$("incomeModal"))closeIncomeModal();});
$("incomeForm").addEventListener("submit",e=>{
  e.preventDefault();
  const description=$("incomeDescription").value.trim(), amount=Number($("incomeAmount").value),
    date=$("incomeDate").value, category=$("incomeCategory").value,
    notes=$("incomeNotes").value.trim(), id=$("editIncomeId").value;
  if(!description)return $("incomeFormError").textContent="Please enter an income source.";
  if(!Number.isFinite(amount)||amount<=0)return $("incomeFormError").textContent="Amount must be greater than zero.";
  if(!date)return $("incomeFormError").textContent="Please choose the date received.";
  if(!category)return $("incomeFormError").textContent="Please choose an income category.";
  const records=allIncome();
  if(id){
    const ix=records.findIndex(x=>x.id===id&&x.userId===currentUser.id);
    if(ix<0)return $("incomeFormError").textContent="This income record could not be found.";
    records[ix]={...records[ix],description,amount,date,category,notes,updatedAt:Date.now()};
  }else{
    records.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),userId:currentUser.id,description,amount,date,category,notes,createdAt:Date.now()});
  }
  write(INCOME_KEY,records);closeIncomeModal();renderAll();showToast(id?"Income updated successfully.":"Income added successfully.");
});
function openIncomeModal(id=null){
  $("incomeForm").reset();$("incomeFormError").textContent="";$("editIncomeId").value="";
  $("incomeDate").value=new Date().toISOString().slice(0,10);
  $("incomeModalTitle").textContent=id?"Edit income":"Add income";
  $("saveIncomeBtn").textContent=id?"Update income":"Save income";
  if(id){
    const rec=userIncome().find(x=>x.id===id);if(!rec)return;
    $("editIncomeId").value=rec.id;$("incomeDescription").value=rec.description;
    $("incomeAmount").value=rec.amount;$("incomeDate").value=rec.date;
    $("incomeCategory").value=rec.category;$("incomeNotes").value=rec.notes||"";
  }
  $("incomeModal").classList.remove("hidden");setTimeout(()=>$("incomeDescription").focus(),50);
}
function closeIncomeModal(){$("incomeModal").classList.add("hidden");}
function renderIncome(){
  if(!currentUser)return;
  const query=($("incomeSearchInput")?.value||"").trim().toLowerCase();
  const records=userIncome().filter(r=>!query||r.description.toLowerCase().includes(query)||r.category.toLowerCase().includes(query)||(r.notes||"").toLowerCase().includes(query))
    .sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
  const all=userIncome(), total=all.reduce((sum,r)=>sum+Number(r.amount),0);
  $("totalIncome").textContent=money(total);$("incomeCount").textContent=all.length;
  $("averageIncome").textContent=money(all.length?total/all.length:0);
  $("incomeFilteredCount").textContent=records.length;
  $("incomeTableBody").innerHTML=records.map(r=>`<tr>
    <td><div class="table-description">${getCategoryIcon("Other")}<div>${escapeHtml(r.description)}${r.notes?`<div style="font-weight:400;color:#9ba3b2;font-size:10px;margin-top:4px">${escapeHtml(r.notes)}</div>`:""}</div></div></td>
    <td>${escapeHtml(r.category)}</td><td>${dateLabel(r.date)}</td><td class="align-right"><strong>+ ${money(r.amount)}</strong></td>
    <td><div class="table-actions"><button class="action-btn" data-income-edit="${r.id}">Edit</button><button class="action-btn delete" data-income-delete="${r.id}">Delete</button></div></td></tr>`).join("");
  $("incomeEmpty").classList.toggle("hidden",records.length>0);
  $("incomeTableBody").querySelectorAll("[data-income-edit]").forEach(b=>b.addEventListener("click",()=>openIncomeModal(b.dataset.incomeEdit)));
  $("incomeTableBody").querySelectorAll("[data-income-delete]").forEach(b=>b.addEventListener("click",()=>{
    const rec=userIncome().find(x=>x.id===b.dataset.incomeDelete);if(!rec)return;
    if(!confirm(`Delete income record "${rec.description}"?`))return;
    write(INCOME_KEY,allIncome().filter(x=>!(x.id===rec.id&&x.userId===currentUser.id)));
    renderAll();showToast("Income record deleted.");
  }));
}

// MODULE 6 — Combined transaction history and CSV export
function getUserTransactions(){
  const expenses=userExpenses().map(e=>({...e,type:"expense",signedAmount:-Number(e.amount)}));
  const income=userIncome().map(i=>({...i,type:"income",signedAmount:Number(i.amount)}));
  return [...expenses,...income].sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||0)-(a.createdAt||0));
}
function renderTransactionHistory(){
  if(!currentUser || !$("historyTableBody")) return;
  const all=getUserTransactions();
  const totalIncome=all.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount),0);
  const totalExpenses=all.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0);
  $("historyIncomeTotal").textContent=money(totalIncome); $("historyExpenseTotal").textContent=money(totalExpenses); $("historyNetTotal").textContent=money(totalIncome-totalExpenses);
  const q=$("historySearch").value.trim().toLowerCase(), type=$("historyType").value, from=$("historyFrom").value, to=$("historyTo").value;
  const rows=all.filter(t=>(type==="all"||t.type===type)&&(!from||t.date>=from)&&(!to||t.date<=to)&&(!q||[t.description,t.category,t.notes||""].some(v=>String(v).toLowerCase().includes(q))));
  $("historyCount").textContent=rows.length;
  $("historyTableBody").innerHTML=rows.map(t=>`<tr><td><span class="type-pill ${t.type}">${t.type==="income"?"Income":"Expense"}</span></td><td><div class="table-description">${getCategoryIcon(t.category)}<div>${escapeHtml(t.description)}${t.notes?`<div class="history-note">${escapeHtml(t.notes)}</div>`:""}</div></div></td><td>${escapeHtml(t.category)}</td><td>${dateLabel(t.date)}</td><td class="align-right"><strong class="${t.type==="income"?"income-value":"expense-value"}">${t.type==="income"?"+":"−"} ${money(t.amount)}</strong></td></tr>`).join("");
  $("historyEmpty").classList.toggle("hidden",rows.length>0);
}
["historySearch","historyType","historyFrom","historyTo"].forEach(id=>$(id).addEventListener("input",renderTransactionHistory));
$("exportTransactionsBtn").addEventListener("click",()=>{
  const q=$("historySearch").value.trim().toLowerCase(), type=$("historyType").value, from=$("historyFrom").value, to=$("historyTo").value;
  const rows=getUserTransactions().filter(t=>(type==="all"||t.type===type)&&(!from||t.date>=from)&&(!to||t.date<=to)&&(!q||[t.description,t.category,t.notes||""].some(v=>String(v).toLowerCase().includes(q))));
  if(!rows.length){showToast("No transactions to export for these filters.");return;}
  const cell=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  const csv=[["Type","Description","Category","Date","Amount (INR)","Notes"],...rows.map(t=>[t.type,t.description,t.category,t.date,Number(t.amount).toFixed(2),t.notes||""])].map(r=>r.map(cell).join(",")).join("\r\n");
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`spendwise-transactions-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);showToast("Transaction history exported.");
});

// Student profile — each profile and all records are scoped to the signed-in user's ID.
function renderProfile(){
  if(!currentUser || !$ ("profileForm")) return;
  const user=allUsers().find(u=>u.id===currentUser.id)||currentUser;
  $("profileDisplayName").textContent=user.name||"Student"; $("profileDisplayEmail").textContent=user.email||"";
  $("profileAvatar").textContent=(user.name||"S").trim().charAt(0).toUpperCase();
  $("profileName").value=user.name||""; $("profileStudentId").value=user.studentId||""; $("profileDepartment").value=user.department||""; $("profileYear").value=user.year||""; $("profilePhone").value=user.phone||""; $("profileEmail").value=user.email||"";
  $("profileVerificationBadge").textContent=user.emailVerified===false?"● Email not verified":"● Demo verification complete";
  $("profileVerificationBadge").classList.toggle("unverified-badge",user.emailVerified===false);
  $("profileExpenseCount").textContent=userExpenses().length; $("profileIncomeCount").textContent=userIncome().length; $("profileBudgetCount").textContent=userBudgets().length;
}
$("profileForm").addEventListener("submit",e=>{
  e.preventDefault(); const name=$("profileName").value.trim(); if(name.length<2){$("profileFormMessage").textContent="Please enter a name with at least 2 characters.";return;}
  const users=allUsers(),ix=users.findIndex(u=>u.id===currentUser.id); if(ix<0){$("profileFormMessage").textContent="Could not find this local account.";return;}
  users[ix]={...users[ix],name,studentId:$("profileStudentId").value.trim(),department:$("profileDepartment").value.trim(),year:$("profileYear").value,phone:$("profilePhone").value.trim()}; write(USERS_KEY,users);
  currentUser={...users[ix]};write(SESSION_KEY,currentUser);$("sidebarName").textContent=name;$("greeting").textContent=`Good ${getDayPart()}, ${name.trim().split(/\\s+/)[0]} 👋`;$("avatar").textContent=name.charAt(0).toUpperCase();$("topAvatar").textContent=name.charAt(0).toUpperCase();$("profileFormMessage").textContent="Profile saved successfully.";$("profileFormMessage").style.color="#16855f";renderProfile();showToast("Profile updated.");
});

// MODULE 4 — Monthly Budget Management
$("addBudgetBtn").addEventListener("click",()=>openBudgetModal());
$("emptyBudgetBtn").addEventListener("click",()=>openBudgetModal());
$("budgetMonth").value=currentMonth();
$("budgetMonth").addEventListener("change",renderBudgets);
$("closeBudgetModalBtn").addEventListener("click",closeBudgetModal);
$("cancelBudgetModalBtn").addEventListener("click",closeBudgetModal);
$("budgetModal").addEventListener("click",e=>{if(e.target===$("budgetModal"))closeBudgetModal();});
$("budgetForm").addEventListener("submit",e=>{
  e.preventDefault();
  const category=$("budgetCategory").value, amount=Number($("budgetAmount").value), month=$("budgetForMonth").value, id=$("editBudgetId").value;
  if(!category)return $("budgetFormError").textContent="Please choose a category.";
  if(!Number.isFinite(amount)||amount<=0)return $("budgetFormError").textContent="Budget must be greater than zero.";
  if(!month)return $("budgetFormError").textContent="Please choose a month.";
  const budgets=allBudgets();
  const duplicate=budgets.find(b=>b.userId===currentUser.id&&b.month===month&&b.category===category&&b.id!==id);
  if(duplicate)return $("budgetFormError").textContent="A budget already exists for this category and month. Edit the existing budget instead.";
  if(id){
    const ix=budgets.findIndex(b=>b.id===id&&b.userId===currentUser.id);
    if(ix<0)return $("budgetFormError").textContent="This budget could not be found.";
    budgets[ix]={...budgets[ix],category,amount,month,updatedAt:Date.now()};
  }else{
    budgets.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),userId:currentUser.id,category,amount,month,createdAt:Date.now()});
  }
  write(BUDGETS_KEY,budgets);closeBudgetModal();$("budgetMonth").value=month;renderAll();showToast(id?"Budget updated.":"Budget saved.");
});
function openBudgetModal(id=null){
  $("budgetForm").reset();$("budgetFormError").textContent="";$("editBudgetId").value="";
  $("budgetForMonth").value=$("budgetMonth").value||currentMonth();
  $("budgetModalTitle").textContent=id?"Edit budget":"Set a budget";$("saveBudgetBtn").textContent=id?"Update budget":"Save budget";
  if(id){
    const b=userBudgets().find(x=>x.id===id);if(!b)return;
    $("editBudgetId").value=b.id;$("budgetCategory").value=b.category;
    $("budgetAmount").value=b.amount;$("budgetForMonth").value=b.month;
  }
  $("budgetModal").classList.remove("hidden");
}
function closeBudgetModal(){$("budgetModal").classList.add("hidden");}
function renderBudgets(){
  if(!currentUser)return;
  const month=$("budgetMonth").value||currentMonth();
  const budgets=userBudgets().filter(b=>b.month===month);
  const expenses=userExpenses().filter(e=>e.date.slice(0,7)===month);
  const totalBudget=budgets.reduce((s,b)=>s+Number(b.amount),0);
  const spent=expenses.reduce((s,e)=>s+Number(e.amount),0);
  $("budgetTotal").textContent=money(totalBudget);$("budgetSpent").textContent=money(spent);
  $("budgetRemaining").textContent=money(totalBudget-spent);
  $("budgetList").innerHTML=budgets.map(b=>{
    const catSpent=expenses.filter(e=>e.category===b.category).reduce((s,e)=>s+Number(e.amount),0);
    const pct=b.amount?Math.round(catSpent/b.amount*100):0;
    const width=Math.min(pct,100);
    const status=pct>=100?"Over budget":pct>=80?"Almost at limit":"On track";
    const statusClass=pct>=100?"over":pct>=80?"warning":"good";
    return `<article class="budget-item">
      <div class="budget-item-top">${getCategoryIcon(b.category)}<div class="budget-name"><strong>${escapeHtml(b.category)}</strong><span>${money(catSpent)} spent of ${money(b.amount)}</span></div><span class="budget-status ${statusClass}">${status}</span></div>
      <div class="budget-progress"><span class="${statusClass}" style="width:${width}%"></span></div>
      <div class="budget-item-bottom"><span>${pct}% used</span><span>${money(Number(b.amount)-catSpent)} remaining</span><div class="table-actions"><button class="action-btn" data-budget-edit="${b.id}">Edit</button><button class="action-btn delete" data-budget-delete="${b.id}">Delete</button></div></div>
    </article>`;
  }).join("");
  $("budgetEmpty").classList.toggle("hidden",budgets.length>0);
  $("budgetList").querySelectorAll("[data-budget-edit]").forEach(b=>b.addEventListener("click",()=>openBudgetModal(b.dataset.budgetEdit)));
  $("budgetList").querySelectorAll("[data-budget-delete]").forEach(b=>b.addEventListener("click",()=>{
    const id=b.dataset.budgetDelete;const rec=userBudgets().find(x=>x.id===id);if(!rec)return;
    if(!confirm(`Delete the ${rec.category} budget for ${rec.month}?`))return;
    write(BUDGETS_KEY,allBudgets().filter(x=>!(x.id===id&&x.userId===currentUser.id)));
    renderAll();showToast("Budget deleted.");
  }));
}

if(read(SESSION_KEY,null)){
  const session=read(SESSION_KEY,null),user=allUsers().find(u=>u.id===session.id);
  if(user){currentUser={...user};enterApp();}
  else localStorage.removeItem(SESSION_KEY);
}
