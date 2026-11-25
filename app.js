import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
const supabase=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const $=id=>document.getElementById(id);
$("year").textContent=new Date().getFullYear();
const notice=(msg,error=false)=>{$("notice").textContent=msg;$("notice").style.color=error?"#b42318":"#2366d1"};
let currentUser=null,currentProfile=null,adminTab="pending";
async function refreshSession(){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session){showLoggedOut();return}
 currentUser=session.user;
 const {data:profile,error}=await supabase.from("profiles").select("*").eq("id",currentUser.id).single();
 if(error){notice("Impossible de charger le profil : "+error.message,true);return}
 currentProfile=profile;
 $("customerName").value=profile.full_name||"";
 $("customerPhone").value=profile.phone||"";
 $("customerEmail").value=profile.email||currentUser.email||"";
 showDashboard();
}
function showLoggedOut(){currentUser=null;currentProfile=null;$("authPanel").hidden=false;$("dashboard").hidden=true;$("adminPanel").hidden=true;$("logoutBtn").hidden=true}
async function showDashboard(){
 $("authPanel").hidden=true;$("dashboard").hidden=false;$("logoutBtn").hidden=false;
 $("welcome").textContent="Bonjour, "+(currentProfile.full_name||"client")+" !";
 $("balance").textContent=Number(currentProfile.balance||0).toFixed(2)+" USD";
 await loadTransactions();
 if(currentProfile.role==="admin"){$("adminPanel").hidden=false;await loadAdmin()}else $("adminPanel").hidden=true;
}
$("signupForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const full_name=$("fullName").value.trim(),phone=$("phone").value.trim();
 const {data,error}=await supabase.auth.signUp({email:$("signupEmail").value,password:$("signupPassword").value,options:{data:{full_name,phone}}});
 if(error)return notice(error.message,true);
 notice("Compte créé. Vérifiez votre e-mail si la confirmation est activée.");
 if(data.session)await refreshSession();
});
$("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();const {error}=await supabase.auth.signInWithPassword({email:$("loginEmail").value,password:$("loginPassword").value});
 if(error)return notice(error.message,true);await refreshSession();notice("Connexion réussie.");
});
$("logoutBtn").addEventListener("click",async()=>{await supabase.auth.signOut();showLoggedOut();notice("Vous êtes déconnecté.")});
$("serviceType").addEventListener("change",()=>{
 const meru=$("serviceType").value==="meru_recharge";
 $("amount").min=meru?"5":"1";
 $("amount").placeholder=meru?"Minimum 5 USD":"Montant en USD";
});
$("orderForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!currentUser)return;
 const service=$("serviceType").value,amount=Number($("amount").value);
 if(service==="meru_recharge"&&amount<5)return notice("Le montant minimum pour une recharge Meru est de 5 USD.",true);
 if(!Number.isFinite(amount)||amount<=0)return notice("Montant invalide.",true);
 const file=$("receipt").files[0];if(!file)return notice("Ajoutez la photo de votre preuve de paiement.",true);
 if(file.size>5*1024*1024)return notice("Le fichier dépasse 5 Mo.",true);
 if(!["image/jpeg","image/png","image/webp"].includes(file.type))return notice("Format accepté : JPG, PNG ou WEBP.",true);
 const id=crypto.randomUUID(),ext=file.name.split(".").pop().toLowerCase(),path=`${currentUser.id}/${id}.${ext}`;
 notice("Envoi de la demande et de la preuve...");
 const {error:uploadError}=await supabase.storage.from("payment-proofs").upload(path,file,{contentType:file.type,upsert:false});
 if(uploadError)return notice("Échec de l'envoi du reçu : "+uploadError.message,true);
 const payload={user_id:currentUser.id,customer_name:$("customerName").value.trim(),customer_phone:$("customerPhone").value.trim(),customer_email:$("customerEmail").value.trim(),service_type:service,amount,destination:$("destination").value.trim(),payment_method:$("paymentMethod").value,payment_reference:$("paymentReference").value.trim(),receipt_path:path,status:"pending"};
 const {error}=await supabase.from("transactions").insert(payload);
 if(error){notice("Demande non enregistrée : "+error.message,true);return}
 notice("Demande envoyée. Votre paiement sera vérifié manuellement par l'administrateur.");
 $("amount").value="";$("destination").value="";$("paymentReference").value="";$("receipt").value="";
 await loadTransactions();
});
async function loadTransactions(){
 const {data,error}=await supabase.from("transactions").select("id,service_type,amount,payment_method,status,created_at,admin_note,payment_reference").eq("user_id",currentUser.id).order("created_at",{ascending:false});
 if(error){$("transactions").textContent=error.message;return}
 $("transactions").innerHTML=data.length?data.map(t=>`<div class="transaction"><div class="transaction-top"><span>${esc(labelService(t.service_type))} · ${Number(t.amount).toFixed(2)} USD</span><span class="status ${t.status}">${esc(t.status)}</span></div><p>${esc(t.payment_method.toUpperCase())} · ID : ${esc(t.payment_reference)} · ${new Date(t.created_at).toLocaleString()}</p>${t.admin_note?`<small>${esc(t.admin_note)}</small>`:""}</div>`).join(""):"<p>Aucune transaction pour le moment.</p>";
}
function labelService(v){return v==="meru_recharge"?"Recharge Meru":"Service PayPal"}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",async()=>{adminTab=b.dataset.tab;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));await loadAdmin()}));
async function loadAdmin(){
 if(currentProfile?.role!=="admin")return;
 if(adminTab==="users"){
  const {data,error}=await supabase.from("profiles").select("id,full_name,email,phone,balance,role,created_at").order("created_at",{ascending:false});
  if(error){$("adminContent").textContent=error.message;return}
  $("adminContent").innerHTML=`<div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>Nom</th><th>E-mail</th><th>Téléphone</th><th>Solde</th><th>Rôle</th><th>Inscription</th></tr></thead><tbody>${data.map(u=>`<tr><td>${esc(u.full_name)}</td><td>${esc(u.email)}</td><td>${esc(u.phone)}</td><td>${Number(u.balance).toFixed(2)}</td><td>${esc(u.role)}</td><td>${new Date(u.created_at).toLocaleDateString()}</td></tr>`).join("")}</tbody></table></div>`;return;
 }
 const {data,error}=await supabase.from("transactions").select("id,user_id,customer_name,customer_phone,customer_email,service_type,amount,payment_method,payment_reference,receipt_path,status,created_at,profiles(full_name,email,phone)").order("created_at",{ascending:false}).limit(100);
 if(error){$("adminContent").textContent=error.message;return}
 $("adminContent").innerHTML=data.length?`<div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>Client</th><th>Demande</th><th>Paiement</th><th>Preuve</th><th>Validation</th></tr></thead><tbody>${data.map(t=>`<tr><td>${esc(t.customer_name)}<br>${esc(t.customer_email)}<br>${esc(t.customer_phone)}</td><td>${esc(labelService(t.service_type))}<br>${Number(t.amount).toFixed(2)} USD<br><small>${new Date(t.created_at).toLocaleString()}</small></td><td>${esc(t.payment_method)}<br>ID : ${esc(t.payment_reference)}</td><td><button class="btn small" data-proof="${esc(t.receipt_path)}">Voir photo</button></td><td><span class="status ${t.status}">${esc(t.status)}</span><br>${t.status==="pending"?`<button class="btn small" data-approve="${t.id}">Valider</button><button class="btn small" style="background:#a83232" data-reject="${t.id}">Refuser</button>`:""}</td></tr>`).join("")}</tbody></table></div>`:"Aucune demande.";
 $("adminContent").querySelectorAll("[data-proof]").forEach(b=>b.addEventListener("click",async()=>{const {data,error}=await supabase.storage.from("payment-proofs").createSignedUrl(b.dataset.proof,120);if(error)return notice(error.message,true);window.open(data.signedUrl,"_blank","noopener")}));
 $("adminContent").querySelectorAll("[data-approve]").forEach(b=>b.addEventListener("click",()=>review(b.dataset.approve,"approved")));
 $("adminContent").querySelectorAll("[data-reject]").forEach(b=>b.addEventListener("click",()=>review(b.dataset.reject,"rejected")));
}
async function review(id,status){
 const note=prompt(status==="approved"?"Note facultative :":"Motif du refus :");if(note===null)return;
 const {error}=await supabase.rpc("admin_review_transaction",{p_transaction_id:id,p_status:status,p_admin_note:note});
 if(error)return notice("Action impossible : "+error.message,true);
 notice(status==="approved"?"Transaction validée et solde crédité.":"Transaction refusée.");await loadAdmin();await refreshSession();
}
supabase.auth.onAuthStateChange(()=>{setTimeout(refreshSession,0)});
refreshSession();
