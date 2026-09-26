// Theme Initialization
if (localStorage.getItem('cmt_theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
}

// --- SUPABASE CONFIGURATION (V2) ---
const supabaseUrl = 'https://jhbgnbzgzncngrdtnynd.supabase.co';
const supabaseKey = 'sb_publishable_45OcfQmD0-w_pd0AhcjZqQ_rim5OYc-';
const _supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// --- GLOBAL VARIABLES ---
let globalClientData = [];
let globalUserData = [];
let globalStages = [];
let emailTemplates = [];
let currentUser = "", currentRole = "", currentName = "", currentPic = "", currentEmail = "", currentUserIdPhone = "";
let currentUserIdDb = null;
let currentUserIP = "";
let currentModalMode = 'add', activeRowIndex = null;
let currentClientPage = 1;
const rowsPerPage = 100;
let stageChartInstance = null, workloadChartInstance = null;
let currentViewMode = 'table';
let notifs = [];
let uploadedBase64 = "", uploadedFileName = "", uploadedMimeType = "";
let stickyNotes = [];
let ctxMenuTargetId = null;
let activeUsersChannel = null;
let activeEmailTempId = null;
let uUploadedBase64 = "", uUploadedMimeType = "";

// --- IPIFY BACKGROUND FETCH ---
async function getClientIP() {
    try {
        let res = await fetch('https://api.ipify.org?format=json');
        let data = await res.json();
        currentUserIP = data.ip;
        return data.ip;
    } catch(e) {
        console.error("IP Fetch Error:", e);
        return "0.0.0.0";
    }
}

// --- ESSENTIAL UI & ANIMATION FUNCTIONS ---
function createDustParticles() {
    let screen = document.getElementById('loginScreen');
    if(!screen) return;
    for(let i=0; i<30; i++) {
        let dust = document.createElement('div');
        dust.className = 'dust';
        dust.style.left = Math.random() * 100 + 'vw';
        dust.style.top = Math.random() * 100 + 'vh';
        dust.style.animationDuration = (Math.random() * 3 + 2) + 's';
        dust.style.animationDelay = Math.random() * 2 + 's';
        screen.appendChild(dust);
    }
}

function updateBottomNav(el) {
    document.querySelectorAll('.bottom-nav-item').forEach(nav => nav.classList.remove('active'));
    if(el) el.classList.add('active');
}

function toggleSmartMenu() {
    let menu = document.getElementById('smartMenu');
    menu.style.display = (menu.style.display === 'flex') ? 'none' : 'flex';
}

function initPhysics() {
    document.querySelectorAll('.dash-card').forEach(card => {
        card.style.transition = 'transform 0.2s ease-out, box-shadow 0.2s ease';
        card.addEventListener('mousemove', e => {
            let rect = card.getBoundingClientRect();
            let x = e.clientX - rect.left - rect.width/2;
            let y = e.clientY - rect.top - rect.height/2;
            card.style.transform = `perspective(1000px) rotateX(${-y/40}deg) rotateY(${x/40}deg) scale3d(1.01, 1.01, 1.01)`;
        });
        card.addEventListener('mouseleave', e => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        });
    });
    document.querySelectorAll('.btn-primary').forEach(btn => {
        btn.addEventListener('mousemove', e => {
            let rect = btn.getBoundingClientRect();
            let x = (e.clientX - rect.left) - rect.width/2;
            let y = (e.clientY - rect.top) - rect.height/2;
            btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
        });
        btn.addEventListener('mouseleave', e => btn.style.transform = '');
    });
}

function triggerConfetti() {
    let conf = document.getElementById('confettiLayer');
    conf.innerHTML = ''; conf.style.display = 'block';
    for(let i=0; i<100; i++) {
        let el = document.createElement('div'); el.className = 'confetti';
        el.style.left = Math.random() * 100 + 'vw';
        el.style.backgroundColor = ['#fde047', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'][Math.floor(Math.random()*5)];
        el.style.animationDelay = Math.random() * 2 + 's';
        conf.appendChild(el);
    }
    setTimeout(() => { conf.style.display = 'none'; }, 5000);
}

document.addEventListener('keydown', function(e) {
    if (e.shiftKey && (e.key === 'A' || e.key === 'a') && document.getElementById('appLayout').style.display !== 'none') {
        e.preventDefault(); document.getElementById('cmdPalette').style.display = 'flex'; document.getElementById('cmdInput').focus();
    }
    if (e.key === 'Escape') {
        document.getElementById('cmdPalette').style.display = 'none'; 
        document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    }
    if (e.ctrlKey && e.key === 'Enter' && document.getElementById('clientModal').style.display === 'flex') { e.preventDefault(); saveClient(); }
});

document.getElementById('cmdInput').addEventListener('keyup', function(e) {
    let filter = this.value.toLowerCase(); let items = document.querySelectorAll('#cmdList li');
    items.forEach(li => { li.style.display = li.innerText.toLowerCase().includes(filter) ? 'flex' : 'none'; });
});

function executeCommand(cmd) {
    document.getElementById('cmdPalette').style.display = 'none'; document.getElementById('cmdInput').value = '';
    if (cmd === 'close') return; if (cmd === 'add') openModal('add'); if (cmd === 'report') switchTab('reports');
    if (cmd === 'team') switchTab('team'); if (cmd === 'theme') toggleTheme(); if (cmd === 'logout') logout();
}

// --- WHATSAPP CALLING & REALTIME ACTIVE USERS ---
function initRealtimePresence() {
    activeUsersChannel = _supabase.channel('online-users');
    activeUsersChannel.on('presence', { event: 'sync' }, () => {
        let state = activeUsersChannel.presenceState();
        renderLiveUsers(state);
    }).subscribe(async (status) => {
        if(status === 'SUBSCRIBED') {
            await activeUsersChannel.track({
                user_id: currentUserIdPhone, 
                name: currentName,
                role: currentRole
            });
        }
    });
}

function renderLiveUsers(state) {
    let container = document.getElementById('activeUsersContainer');
    if(!container) return;
    let html = '';
    for(let key in state) {
        let userObj = state[key][0]; 
        html += `
        <div class="active-user-card">
            <div class="active-dot"></div>
            <div style="flex:1;">
                <b style="color:var(--text-title); display:block; font-size:15px;">${userObj.name}</b>
                <span style="font-size:12px; color:var(--text-muted); background:var(--bg-input); padding:2px 8px; border-radius:10px;">${userObj.role}</span>
            </div>
            <div style="display:flex; gap: 15px; align-items:center;">
                <i class="fa fa-phone-alt action-icon" style="font-size:20px; color:#3b82f6; cursor:pointer; transition:0.3s; margin: 0;" onclick="initiateContact('${userObj.user_id}', 'call', '${userObj.name}')" title="Direct Phone Call"></i>
                <i class="fab fa-whatsapp action-icon" style="font-size:24px; color:#25D366; cursor:pointer; transition:0.3s; margin: 0;" onclick="initiateContact('${userObj.user_id}', 'whatsapp', '${userObj.name}')" title="Direct WhatsApp Chat"></i>
            </div>
        </div>`;
    }
    container.innerHTML = html || "<div style='color:var(--text-muted); font-size:14px; padding:20px; text-align:center;'>No active users currently.</div>";
}

// --- DYNAMIC LIVE USER CONTACT FUNCTION ---
async function initiateContact(loginId, type, userName) {
    showLoader(`Fetching details for ${userName}...`);
    
    try {
        // Query database for the exact mobile number using the user's login ID
        const { data, error } = await _supabase.from('users').select('mobilenumber').eq('loginid', loginId).single();
        hideLoader();

        let phone = data ? data.mobilenumber : null;

        // Check if phone is empty, null, or a generic placeholder like "Optional"
        if (error || !phone || phone.trim() === '' || phone.trim().toLowerCase() === 'optional') {
            return Swal.fire({
                icon: 'info',
                title: 'Mobile Number Not Available',
                text: `${userName} has not updated their mobile number in the system.`,
                confirmButtonColor: '#3b82f6'
            });
        }

        // Format number logically
        let num = String(phone).replace(/[^0-9+]/g, '');
        if(num.startsWith('0')) { num = '88' + num; } // Append Bangladesh country code if starts with 0
        
        let waNum = num.replace('+', ''); // WhatsApp usually prefers numbers without '+'

        if (type === 'call') {
            window.open(`tel:+${waNum}`, '_self');
        } else if (type === 'whatsapp') {
            window.open(`https://wa.me/${waNum}`, '_blank');
        }

    } catch(e) {
        hideLoader();
        showToast("Error connecting to user database.", "error");
    }
}

// --- EMAIL TEMPLATES LOGIC ---
async function fetchEmailTemplates() {
    const {data, error} = await _supabase.from('emailtemp').select('*').eq('isactive', 1);
    if(!error && data) { emailTemplates = data; renderEmailTemplates(); }
}

function renderEmailTemplates() {
    let container = document.getElementById('emailTableContainer');
    if(!container) return;
    // Applied perfect column width distribution to fix the spacing issue
    let html = '<table style="width:100%; table-layout: auto;"><thead><tr><th style="width: 30%;">Template Name</th><th style="width: 45%;">Subject</th><th style="width: 25%;">Action</th></tr></thead><tbody>';
    if(emailTemplates.length === 0) {
        html += '<tr><td colspan="3" style="text-align:center;">No templates saved yet.</td></tr>';
    } else {
        emailTemplates.forEach(t => {
            html += `<tr>
                <td><b>${t.emailname}</b></td>
                <td>${t.emailsubject}</td>
                <td style="display:flex; gap:12px; align-items:center; flex-wrap: wrap;">
                    <button class="btn-primary" style="padding:6px 12px; font-size:12px; background:#3b82f6;" onclick="sendEmailTemplate('${t.emailtempid}')"><i class="fa fa-paper-plane"></i> Send Email</button>
                    <i class="fa fa-eye action-icon view-icon" style="margin-left:5px;" onclick="openEmailViewModal('${t.emailtempid}')" title="View Details"></i>
                    <i class="fa fa-edit action-icon edit-icon" onclick="openEmailTemplateModal('${t.emailtempid}')" title="Edit Template"></i>
                    <i class="fa fa-trash action-icon delete-icon" onclick="deleteEmailTemplate('${t.emailtempid}')" title="Delete"></i>
                </td>
            </tr>`;
        });
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

// --- USER PROFILE VIEW MODAL ---
function openUserViewModal(idx) {
    let r = globalUserData[idx];
    if (!r) return;
    
    // Set Profile Image or Initials
    if (r.profilepic) {
        document.getElementById('uv-avatar-img').src = r.profilepic;
        document.getElementById('uv-avatar-img').style.display = 'block';
        document.getElementById('uv-avatar-text').style.display = 'none';
    } else {
        document.getElementById('uv-avatar-text').innerText = r.username ? r.username.charAt(0).toUpperCase() : 'U';
        document.getElementById('uv-avatar-img').style.display = 'none';
        document.getElementById('uv-avatar-text').style.display = 'flex';
    }
    
    document.getElementById('uv-name').innerText = r.username || 'N/A';
    document.getElementById('uv-role').innerText = r.role || 'User';
    document.getElementById('uv-pin').innerText = r.otp || 'N/A';
    // Set Status
    let statusBadge = document.getElementById('uv-status');
    if(r.isactive === 1) {
        statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
        statusBadge.style.color = '#10b981';
        statusBadge.innerText = 'Active User';
    } else {
        statusBadge.style.background = 'rgba(239, 68, 68, 0.15)';
        statusBadge.style.color = '#ef4444';
        statusBadge.innerText = 'Inactive User';
    }
    
    // Set other info
    document.getElementById('uv-mobile').innerText = r.mobilenumber || 'N/A';
    document.getElementById('uv-email').innerText = r.email || 'N/A';
    document.getElementById('uv-loginid').innerText = r.loginid || 'N/A';
    
    // Password with Mask & Eye toggle
    let passVal = r.password || '';
    document.getElementById('uv-pass').innerHTML = passVal ? `<span class="pwd-mask" data-pwd="${passVal}">••••••••</span> <i class="fa fa-eye toggle-table-pwd" style="cursor:pointer; color:#3b82f6; font-size:15px;" onclick="toggleTablePwd(this)"></i>` : 'N/A';
    
    document.getElementById('uv-designation').innerText = r.designation || 'N/A';
    document.getElementById('uv-department').innerText = r.department || 'N/A';
    document.getElementById('uv-organization').innerText = r.organization || 'N/A';
    document.getElementById('uv-address').innerText = r.address || 'N/A';
    document.getElementById('uv-create-date').innerText = r.createdate ? formatDateBD(r.createdate) : 'N/A';
    
    document.getElementById('userViewModal').style.display = 'flex';
}

// --- EMAIL TEMPLATE VIEW MODAL ---
function openEmailViewModal(id) {
    let t = emailTemplates.find(x => x.emailtempid == id);
    if(!t) return;
    
    document.getElementById('ev-name').innerText = t.emailname || 'N/A';
    document.getElementById('ev-subject').innerText = t.emailsubject || 'N/A';
    document.getElementById('ev-body').innerText = t.emailbody || 'N/A';
    
    // Link the modal's Send button to the specific template
    document.getElementById('ev-send-btn').setAttribute('onclick', `sendEmailTemplate('${id}')`);
    
    document.getElementById('emailViewModal').style.display = 'flex';
}

function openEmailTemplateModal(id = null) {
    if(id) {
        let t = emailTemplates.find(x => x.emailtempid == id);
        document.getElementById('et-name').value = t.emailname || '';
        document.getElementById('et-subject').value = t.emailsubject || '';
        document.getElementById('et-body').value = t.emailbody || '';
        activeEmailTempId = id;
        document.getElementById('eModalTitle').innerText = 'Edit Email Template';
    } else {
        document.getElementById('et-name').value = ''; 
        document.getElementById('et-subject').value = ''; 
        document.getElementById('et-body').value = '';
        activeEmailTempId = null;
        document.getElementById('eModalTitle').innerText = 'Add Email Template';
    }
    document.getElementById('emailTemplateModal').style.display = 'flex';
}
function closeEmailTemplateModal() { document.getElementById('emailTemplateModal').style.display = 'none'; }

async function saveEmailTemplate() {
    let name = document.getElementById('et-name').value;
    let sub = document.getElementById('et-subject').value;
    let body = document.getElementById('et-body').value;
    if(!name || !sub || !body) return showToast("All fields are required!", "error");
    
    showLoader("Saving Template...");
    let resErr;
    
    if(activeEmailTempId) {
        const { error } = await _supabase.from('emailtemp').update({ emailname: name, emailsubject: sub, emailbody: body, updatedby: currentUserIdDb }).eq('emailtempid', activeEmailTempId);
        resErr = error;
    } else {
        const { error } = await _supabase.from('emailtemp').insert([{ emailname: name, emailsubject: sub, emailbody: body, createdby: currentUserIdDb, isactive: 1 }]);
        resErr = error;
    }
    
    hideLoader(); 
    if (resErr) {
        showToast("Error saving template!", "error");
    } else {
        closeEmailTemplateModal(); 
        fetchEmailTemplates(); 
        showToast("Template Saved!");
    }
}

async function deleteEmailTemplate(id) {
    let result = await Swal.fire({
        title: "Are you sure?",
        text: "You want to delete this email template?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444", 
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, delete it!"
    });

    if (result.isConfirmed) {
        await _supabase.from('emailtemp').update({isactive: 0}).eq('emailtempid', id);
        fetchEmailTemplates(); 
        Swal.fire("Deleted!", "Template has been removed successfully.", "success");
    }
}

function sendEmailTemplate(id) {
    let t = emailTemplates.find(x => x.emailtempid == id);
    if(!t) return;
    let gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(t.emailsubject)}&body=${encodeURIComponent(t.emailbody)}`;
    window.open(gmailUrl, '_blank');
}

// --- SUPABASE STICKY NOTES ---
async function fetchStickyNotes() {
    const { data, error } = await _supabase.from('notes').select('*').eq('isactive', 1);
    if(!error && data) { stickyNotes = data; renderStickyNotes(); }
}

askNotificationPermission(); // Eta browser e permission popup dekhabe

function renderStickyNotes() {
    let board = document.getElementById('stickyNotesBoard'); 
    if(!board) return;
    board.innerHTML = '';
    stickyNotes.forEach((note) => {
        board.innerHTML += `<div class='sticky-note'>
            <div class='sticky-note-header'><span>${note.notesubject || 'Pin'}</span> <i class="fa fa-times" style="cursor:pointer;" onclick="deleteStickyNote('${note.noteid}')"></i></div>
            <textarea onchange="updateStickyNote('${note.noteid}', this.value)">${note.notebody}</textarea>
        </div>`;
    });
}
async function addStickyNote() {
    const { value: text } = await Swal.fire({
        title: 'Add New Note',
        input: 'textarea',
        inputPlaceholder: 'Write your important note here...',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Save Note'
    });

    if (text && text.trim() !== '') {
        showLoader("Saving Note...");
        const newNote = { notesubject: currentName, notebody: text, createdby: currentUserIdDb, isactive: 1 };
        const { data, error } = await _supabase.from('notes').insert([newNote]).select();
        hideLoader();
        
        if(!error && data) { 
            stickyNotes.push(data[0]); 
            renderStickyNotes(); 
            showToast("Note Added Successfully!");
        } else {
            showToast("Failed to add note.", "error");
        }
    }
}
async function updateStickyNote(id, val) { await _supabase.from('notes').update({ notebody: val }).eq('noteid', id); }
async function deleteStickyNote(id) { 
    await _supabase.from('notes').update({isactive: 0}).eq('noteid', id); 
    stickyNotes = stickyNotes.filter(n => n.noteid !== id); renderStickyNotes(); 
}

// --- CONTEXT MENUS & PiP ---
document.addEventListener('click', () => { document.getElementById('glassContextMenu').style.display = 'none'; });
function showContextMenu(e, rowIdx) {
    e.preventDefault(); ctxMenuTargetId = rowIdx;
    let menu = document.getElementById('glassContextMenu');
    menu.style.display = 'block'; menu.style.left = e.pageX + 'px'; menu.style.top = e.pageY + 'px';
}
function ctxAction(action) {
    if(!ctxMenuTargetId) return;
    let row = globalClientData.find(x => x.id == ctxMenuTargetId);
    if(!row) return;
    let rIdx = globalClientData.indexOf(row);
    
    if(action === 'copy') { navigator.clipboard.writeText(row.password); showToast("Password Copied!"); } 
    else if(action === 'whatsapp') {
        let text = `Hello ${row.client_name},\nYour portal is ready.\nURL: ${row.login_url}\nID: ${row.user_id}\nPass: ${row.password}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } 
    else if(action === 'edit') { openModal('edit', rIdx, ctxMenuTargetId); } 
    else if(action === 'pin') { pinClient(rIdx); }
}

function pinClient(rIdx) {
    let row = globalClientData[rIdx];
    document.getElementById('pipBody').innerHTML = `
        <div class='pip-row'><b>Client:</b> <span>${row.client_name}</span></div>
        <div class='pip-row'><b>Stage:</b> <span>${row.stage}</span></div>
        <div class='pip-row'><b>ID:</b> <span>${row.user_id}</span></div>
        <div class='pip-row'><b>Pass:</b> <span>${row.password}</span></div>
    `;
    document.getElementById('pipCard').style.display = 'block';
}
function closePip() { document.getElementById('pipCard').style.display = 'none'; }
let pip = document.getElementById('pipCard');
let isDragging = false, offset = [0,0];
pip.addEventListener('mousedown', function(e) { isDragging = true; offset = [pip.offsetLeft - e.clientX, pip.offsetTop - e.clientY]; });
document.addEventListener('mouseup', function() { isDragging = false; });
document.addEventListener('mousemove', function(e) {
    if (isDragging) { pip.style.left = (e.clientX + offset[0]) + 'px'; pip.style.top = (e.clientY + offset[1]) + 'px'; pip.style.bottom = 'auto'; pip.style.right = 'auto'; }
});

// --- ADVANCED TOUCH-PAUSE STORY UI ---
let currentStorySlides = [], currentSlideIndex = 0, storyTimer, isStoryPaused = false;

setTimeout(() => {
    const storyModContainer = document.querySelector('.story-container');
    if(storyModContainer) {
        storyModContainer.addEventListener('mousedown', pauseStory);
        storyModContainer.addEventListener('mouseup', resumeStory);
        storyModContainer.addEventListener('mouseleave', resumeStory);
        storyModContainer.addEventListener('touchstart', pauseStory);
        storyModContainer.addEventListener('touchend', resumeStory);
    }
}, 1000);

function pauseStory() {
    if(!currentStorySlides.length) return;
    isStoryPaused = true;
    clearTimeout(storyTimer);
    let activeFill = document.getElementById(`s-fill-${currentSlideIndex}`);
    if(activeFill) activeFill.classList.add('paused');
}
function resumeStory() {
    if(!currentStorySlides.length || !isStoryPaused) return;
    isStoryPaused = false;
    let activeFill = document.getElementById(`s-fill-${currentSlideIndex}`);
    if(activeFill) activeFill.classList.remove('paused');
    storyTimer = setTimeout(() => { showSlide(currentSlideIndex + 1); }, 2500);
}

// --- ADVANCED TOUCH-PAUSE STORY UI (UPDATED) ---
function openStory(rIdx) {
    let row = globalClientData[rIdx];
    document.getElementById('storyClientName').innerText = row.client_name;
    
    currentStorySlides = [];
    
    // Slide 1: Initial Setup (Client Name, Create Date, Initial Stage)
    currentStorySlides.push({ 
        text: `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 50%; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                    <i class="fa fa-user-circle fa-4x" style="color: #60a5fa;"></i>
                </div>
                <h2 style="font-size:32px; font-weight: 700; margin: 0 0 10px 0; letter-spacing: 1px; color: #ffffff;">${row.client_name}</h2>
                <div style="display: inline-block; background: rgba(59, 130, 246, 0.2); padding: 5px 15px; border-radius: 20px; margin-bottom: 15px; border: 1px solid rgba(59, 130, 246, 0.3);">
                    <p style="font-size:14px; margin: 0; font-weight: 500; color: #93c5fd;"><i class="fa fa-flag" style="margin-right: 5px;"></i> First Stage: ${row.stage}</p>
                </div>
                <p style="color:#cbd5e1; font-size: 14px; margin: 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fa fa-calendar-alt"></i> Created On: ${formatDateBD(row.created_date)}
                </p>
            </div>
        `, 
        color: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' 
    });
    
    // Slide 2: Recent Activity (Only if stage was updated)
    if(row.update_date && row.update_date !== row.created_date) {
        currentStorySlides.push({ 
            text: `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                    <div style="background: rgba(255,255,255,0.15); padding: 20px; border-radius: 50%; margin-bottom: 20px; animation: pulseBadge 2s infinite;">
                        <i class="fa fa-sync-alt fa-3x" style="color: #93c5fd;"></i>
                    </div>
                    <h2 style="font-size:28px; font-weight: 700; color: #ffffff; margin-bottom: 15px;">Stage Updated</h2>
                    <div style="background: rgba(0,0,0,0.2); padding: 15px 25px; border-radius: 12px; border-left: 4px solid #3b82f6;">
                        <p style="color:#e2e8f0; font-size: 15px; margin: 0 0 5px 0;">Recent Activity Logged On:</p>
                        <p style="color:#93c5fd; font-size: 18px; font-weight: 600; margin: 0; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fa fa-clock"></i> ${formatDateBD(row.update_date)}
                        </p>
                    </div>
                </div>
            `, 
            color: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' 
        });
    }
    
    // Slide 3 (or 2 if no update): Current Milestone/Stage
    currentStorySlides.push({ 
        text: `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                <div style="margin-bottom: 30px; position: relative;">
                    <i class="fa fa-trophy fa-5x" style="color: #fcd34d; filter: drop-shadow(0 0 15px rgba(252, 211, 77, 0.4));"></i>
                    <i class="fa fa-star" style="position: absolute; top: -10px; right: -15px; color: #fff; font-size: 20px; animation: pulseBadge 1.5s infinite;"></i>
                </div>
                <h3 style="color:#a7f3d0; margin: 0 0 10px 0; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">Current Milestone</h3>
                <div style="background: rgba(16, 185, 129, 0.15); border: 2px solid rgba(16, 185, 129, 0.4); padding: 10px 30px; border-radius: 30px; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.2);">
                    <h1 style="color:#10b981; font-size:38px; font-weight: 800; margin: 0; text-transform:uppercase; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        ${row.stage}
                    </h1>
                </div>
            </div>
        `, 
        color: 'linear-gradient(135deg, #022c22 0%, #065f46 100%)' 
    });
    
    let barsHTML = '';
    currentStorySlides.forEach((s, i) => { barsHTML += `<div class='story-bar'><div class='story-bar-fill' id='s-fill-${i}'></div></div>`; });
    document.getElementById('storyBars').innerHTML = barsHTML;
    
    document.getElementById('storyModal').style.display = 'flex';
    showSlide(0);
}

function showSlide(index) {
    if(index < 0 || index >= currentStorySlides.length) { closeStory(); return; }
    currentSlideIndex = index;
    isStoryPaused = false;
    
    for(let i=0; i<currentStorySlides.length; i++) {
        let f = document.getElementById(`s-fill-${i}`);
        f.className = 'story-bar-fill'; 
        f.style.width = i < index ? '100%' : '0%';
    }
    let slide = currentStorySlides[index]; let content = document.getElementById('storyContent');
    content.innerHTML = slide.text; content.style.background = slide.color;
    
    setTimeout(() => {
        let activeFill = document.getElementById(`s-fill-${index}`);
        activeFill.classList.add('active');
    }, 50);
    
    clearTimeout(storyTimer); 
    storyTimer = setTimeout(() => { showSlide(index + 1); }, 4000); 
}

function prevStory(e) { if(e) e.stopPropagation(); clearTimeout(storyTimer); showSlide(currentSlideIndex - 1); }
function nextStory(e) { if(e) e.stopPropagation(); clearTimeout(storyTimer); showSlide(currentSlideIndex + 1); }
function closeStory() { clearTimeout(storyTimer); document.getElementById('storyModal').style.display = 'none'; }

// --- PWA LOGIC ---
const swCode = `
  const CACHE_NAME = 'cmt-erp-v5';
  self.addEventListener('install', e => { self.skipWaiting(); });
  self.addEventListener('fetch', e => { });
`;
const swBlob = new Blob([swCode], {type: 'application/javascript'});
const swUrl = URL.createObjectURL(swBlob);

function setupPWA() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register(swUrl).catch(err => console.log('PWA SW Blocked, but app is safe.'));
   
    let manifest = {
        "name": "E-Mahajon ERP", 
        "short_name": "E-Mahajon", 
        "start_url": window.location.origin + "/",
        "display": "standalone",
        "background_color": "#0f172a", 
        "theme_color": "#0f172a",
        "icons": [{
            "src": "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhVOQnGe5S7-y5rw98DVzW3POKtFznfF5MYn_3qep_30GRxohi2gU3pT_mXzzhKBQY6kwxO_vkaRx3BIip82mkOEjlFBbxWKcXcZ6f-17vgduWfPLB_NzbnnYgBqsPM4sVzSae95BAqZSxk7lP6V9dJwsQVagyVvsF_JL0v_Ir1ham9zOVYPafj4sMGvh8/s320/emahajon-logo.png", 
            "sizes": "512x512", 
            "type": "image/png",
            "purpose": "any maskable" 
        }]
    };

    let blob = new Blob([JSON.stringify(manifest)], {type: 'application/json'});
    let link = document.createElement('link'); link.rel = 'manifest'; link.href = URL.createObjectURL(blob);
    document.head.appendChild(link);
}

window.addEventListener('offline', () => showToast("You are offline! App running in cached mode.", "warning"));
window.addEventListener('online', () => { showToast("Back online! Resyncing...", "success"); if(currentUser) fetchData(); });

let audioCtx;
function initAudio() { if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }

document.addEventListener("DOMContentLoaded", () => {
    setupPWA(); 
    createDustParticles(); 
    getClientIP();
    
    let saved = localStorage.getItem('cmt_session') || sessionStorage.getItem('cmt_session');
    if(saved) { 
        let d = JSON.parse(saved); 
        document.getElementById('user').value = d.username; 
        document.getElementById('pass').value = d.password; 
        if(localStorage.getItem('cmt_session')) document.getElementById('rememberMe').checked = true; 
        login(); 
    } else {
         setTimeout(() => {
            let cssMan = document.getElementById('cssMan');
            if(cssMan) cssMan.classList.add('waving');
            let helperSpeech = document.getElementById('helperSpeech');
            if(helperSpeech) helperSpeech.style.opacity = '1';
        }, 800);
    }
});

function startVoiceAssistant() {
    initAudio();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition) return showToast("Voice Assistant not supported in this browser.", "error");
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    const micIcon = document.getElementById('voiceBtn');
    const mascot = document.getElementById('cssMan');
    
    recognition.onstart = function() { 
        if(micIcon) micIcon.classList.add('mic-active'); 
        showToast("Listening... Say anything!", "success"); playSound('click'); 
        if(mascot) mascot.classList.add('ears-up');
    };
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        if(mascot) { mascot.classList.add('talking'); setTimeout(() => mascot.classList.remove('talking'), 1500); }
        if (transcript === "add client" || transcript === "new client") { openModal('add'); } 
        else if (transcript.includes("report")) { switchTab('reports'); } 
        else if (transcript.includes("dashboard")) { switchTab('admin-dashboard'); } 
        else if (transcript.includes("log out")) { logout(); } 
        else { let q = transcript.replace("search for", "").replace("search", "").replace("find", "").trim(); document.getElementById('searchInput').value = q; filterTable(); }
    };
    recognition.onend = function() { 
        if(micIcon) micIcon.classList.remove('mic-active'); 
        if(mascot) mascot.classList.remove('ears-up');
    };
    recognition.start();
}

function bufferToBase64url(buffer) {
    const bytes = new Uint8Array(buffer); let str = '';
    for (const charCode of bytes) str += String.fromCharCode(charCode);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToBuffer(base64url) {
    let padding = '='.repeat((4 - base64url.length % 4) % 4);
    let base64 = (base64url + padding).replace(/\-/g, '+').replace(/_/g, '/');
    let rawData = window.atob(base64);
    let outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function registerBiometric() {
    if (!window.PublicKeyCredential) return alert("Sorry! Fingerprint is not supported on your device/browser.");
    try {
        showToast("Processing... Please verify your fingerprint.", "success");
        const challenge = window.crypto.getRandomValues(new Uint8Array(32));
        const userId = window.crypto.getRandomValues(new Uint8Array(16));
        const options = {
            publicKey: {
                challenge: challenge, rp: { name: "CMT ERP", id: window.location.hostname },
                user: { id: userId, name: currentUser || "cmt_user", displayName: currentName || "CMT User" },
                pubKeyCredParams: [ { type: "public-key", alg: -7 }, { type: "public-key", alg: -257 } ],
                authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "required", requireResidentKey: true },
                timeout: 60000, attestation: "none"
            }
        };
        const cred = await navigator.credentials.create(options);
        const credIdBase64 = bufferToBase64url(cred.rawId);
        
        let savedPass = document.getElementById('p-pass').value;
        if(!savedPass) { try { let s = JSON.parse(localStorage.getItem('cmt_session') || sessionStorage.getItem('cmt_session')); savedPass = s.password; } catch(e) {} }

        let vault = JSON.parse(localStorage.getItem('cmt_passkeys') || '{}');
        vault[credIdBase64] = { username: currentUser, password: savedPass, name: currentName };
        localStorage.setItem('cmt_passkeys', JSON.stringify(vault));
        
        Swal.fire({icon: 'success', title: 'Success!', text: 'Fingerprint Registered Successfully!\nNow you can log out and try Fingerprint login.'});
        document.getElementById('profileModal').style.display = 'none';
    } catch(e) { Swal.fire({icon: 'error', title: 'Registration Failed!', text: 'Reason: ' + e.message}); }
}

async function loginWithBiometric() {
    if (!window.PublicKeyCredential) return Swal.fire({icon: 'error', title: 'Oops!', text: 'Fingerprint not supported on this browser.'});

    let vault = JSON.parse(localStorage.getItem('cmt_passkeys') || '{}');
    let registeredKeys = Object.keys(vault);

    if (registeredKeys.length === 0) {
        return Swal.fire({ icon: 'warning', title: 'No Fingerprint Registered!', text: "Please login manually first, go to 'My Profile', and click 'Enable Fingerprint Login'." });
    }

    try {
        // Prepare allowed credentials array to skip the account picker popup
        let allowedCredentials = registeredKeys.map(key => {
            return {
                type: "public-key",
                id: base64urlToBuffer(key),
                transports: ["internal"] // Force using device's built-in biometric sensor
            };
        });

        const challenge = window.crypto.getRandomValues(new Uint8Array(32));
        const options = { 
            publicKey: { 
                challenge: challenge, 
                rpId: window.location.hostname,
                allowCredentials: allowedCredentials, // This bypasses the popup and goes direct to fingerprint
                userVerification: "required", 
                timeout: 60000 
            } 
        };
        
        const assertion = await navigator.credentials.get(options);
        if (assertion) {
            const credIdBase64 = bufferToBase64url(assertion.rawId);
            if (vault[credIdBase64]) {
                document.getElementById('user').value = vault[credIdBase64].username;
                document.getElementById('pass').value = vault[credIdBase64].password;
                document.getElementById('rememberMe').checked = true;
                showToast("Fingerprint Verified! Logging in...", "success");
                login();
            } else {
                Swal.fire({icon: 'warning', title: 'Warning!', text: 'Fingerprint matched, but user not found in CMT system! Try registering again.'});
            }
        }
    } catch(e) { 
        if(e.name !== 'AbortError' && e.name !== 'NotAllowedError') {
            Swal.fire({icon: 'error', title: 'Login Error', text: e.message}); 
        }
    }
}

document.addEventListener('mousemove', (e) => {
    let loginScreen = document.getElementById('loginScreen');
    if(loginScreen && loginScreen.style.display !== 'none') {
        document.documentElement.style.setProperty('--cursor-x', `${e.clientX}px`);
        document.documentElement.style.setProperty('--cursor-y', `${e.clientY}px`);
        if(window.innerWidth > 768) {
            let x = (window.innerWidth / 2 - e.pageX) / 60;
            let y = (window.innerHeight / 2 - e.pageY) / 60;
            document.documentElement.style.setProperty('--px', `${x}px`);
            document.documentElement.style.setProperty('--py', `${y}px`);
        }
    }
});

let passInput = document.getElementById('pass');
if(passInput) {
    passInput.addEventListener('focus', () => { let cssMan = document.getElementById('cssMan'); if(cssMan) cssMan.classList.add('blindfold'); });
    passInput.addEventListener('blur', () => { let cssMan = document.getElementById('cssMan'); if(cssMan) cssMan.classList.remove('blindfold'); });
}

function toggleFullScreen() { if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(err => {}); document.getElementById('fullscreenIcon').className = 'fa fa-compress theme-toggle'; } else { if (document.exitFullscreen) { document.exitFullscreen(); document.getElementById('fullscreenIcon').className = 'fa fa-expand theme-toggle'; } } }

function getTodayStr() { let d = new Date(), m=''+(d.getMonth()+1), day=''+d.getDate(); if(m.length<2)m='0'+m; if(day.length<2)day='0'+day; return [d.getFullYear(), m, day].join('-'); }
function getFirstDayStr() { let d = new Date(), m=''+(d.getMonth()+1); if(m.length<2)m='0'+m; return [d.getFullYear(), m, '01'].join('-'); }
function formatDateBD(dStr) { if(!dStr) return 'N/A'; let raw = String(dStr).replace(/^'/, ''); let p=raw.split('-'); if(p.length>=3) return `${p[2].substring(0,2)}/${p[1]}/${p[0]}`; return raw; }
function getGreeting() { let hr = new Date().getHours(); if(hr < 12) return "Good Morning"; if(hr < 18) return "Good Afternoon"; return "Good Evening"; }

function getStageColor(stage) { let s = (stage || '').toLowerCase(); if(s.includes('live')) return '#10b981'; if(s.includes('maintenance')) return '#3b82f6'; if(s.includes('training')) return '#f59e0b'; if(s.includes('lead')) return '#64748b'; if(s.includes('warranty')) return '#8b5cf6'; if(s.includes('closed')) return '#ef4444'; return '#cbd5e1'; }
function getStageBadge(stage) { let s = (stage || '').toLowerCase(); if(s.includes('live')) return `<span class="stage-badge stage-live">${stage}</span>`; if(s.includes('maintenance')) return `<span class="stage-badge stage-maintenance">${stage}</span>`; if(s.includes('training')) return `<span class="stage-badge stage-training">${stage}</span>`; if(s.includes('lead')) return `<span class="stage-badge stage-lead">${stage}</span>`; if(s.includes('warranty')) return `<span class="stage-badge stage-warranty">${stage}</span>`; if(s.includes('closed')) return `<span class="stage-badge stage-closed">${stage}</span>`; return `<span class="stage-badge stage-default">${stage || 'N/A'}</span>`; }

function addNotification(title, msg, icon, color) { 
    notifs.unshift({title, msg, icon, color, time: new Date().toLocaleTimeString()}); 
    if(notifs.length > 15) notifs.pop(); 
    renderNotifs(); 
    
    // Trigger Native OS Notification
    sendNativeNotification(title, msg);
}

function renderNotifs() { let badge = document.getElementById('notifBadge'); let list = document.getElementById('notifList'); if(notifs.length === 0) { badge.style.display = 'none'; list.innerHTML = '<li style="padding:15px; text-align:center; color:var(--text-muted); font-size:12px;">No new notifications</li>'; } else { badge.style.display = 'flex'; badge.innerText = notifs.length; list.innerHTML = notifs.map(n => `<li class='notif-item'><div class='notif-icon' style='background:${n.color}'><i class='fa ${n.icon}'></i></div><div><div style='font-weight:600; color:var(--text-title);'>${n.title}</div><div style='color:var(--text-muted); margin-top:3px;'>${n.msg}</div><div style='font-size:10px; color:#cbd5e1; margin-top:4px;'>${n.time}</div></div></li>`).join(''); } }
function toggleNotifMenu(e) { e.stopPropagation(); document.getElementById('notifMenu').classList.toggle('show'); }
function clearNotifs(e) { e.stopPropagation(); notifs = []; renderNotifs(); }

function toggleReportFilters() { let f = document.getElementById('reportFilterSection'); f.classList.toggle('hidden'); }

function applyUserTheme() { 
    let themeKey = 'cmt_theme_' + currentUser; 
    let man = document.getElementById('cssMan');
    if(man) man.classList.remove('hacker-outfit', 'suit-outfit');
    if(localStorage.getItem(themeKey) === 'dark') { 
        document.documentElement.setAttribute('data-theme', 'dark'); 
        document.getElementById('themeIcon').className = 'fa fa-sun theme-toggle'; 
        if(man) man.classList.add('hacker-outfit');
    } else { 
        document.documentElement.removeAttribute('data-theme'); 
        document.getElementById('themeIcon').className = 'fa fa-moon theme-toggle'; 
        if(man) man.classList.add('suit-outfit');
    } 
}
function toggleTheme() { 
    let themeKey = 'cmt_theme_' + currentUser; 
    const body = document.documentElement; 
    let man = document.getElementById('cssMan');
    if(man) man.classList.remove('hacker-outfit', 'suit-outfit');
    if(body.getAttribute('data-theme') === 'dark') { 
        body.removeAttribute('data-theme'); localStorage.setItem(themeKey, 'light'); 
        document.getElementById('themeIcon').className = 'fa fa-moon theme-toggle'; 
        if(man) man.classList.add('suit-outfit');
    } else { 
        body.setAttribute('data-theme', 'dark'); localStorage.setItem(themeKey, 'dark'); 
        document.getElementById('themeIcon').className = 'fa fa-sun theme-toggle'; 
        if(man) man.classList.add('hacker-outfit');
    } 
    setTimeout(renderAdminDashboard, 300); 
}

// --- STAGE MANAGE & DROPDOWN FROM DB ---
async function fetchStages() {
    const {data, error} = await _supabase.from('clientstages').select('*').eq('isactive', 1);
    if(!error && data) {
        globalStages = data;
        renderStageDropdown();
    }
}

function renderStageDropdown() { 
    let html = `<option value='' disabled selected>Select a Stage...</option>`; 
    globalStages.forEach(s => html += `<option value="${s.stageid}">${s.stagename}</option>`); 
    let mStage = document.getElementById('m-stage');
    if(mStage) mStage.innerHTML = html; 
    
    let listHtml = ''; 
    globalStages.forEach((s) => { 
        listHtml += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 15px; background:var(--bg-main); border:1px solid var(--border-color); border-radius:8px; font-size:13px;">
            <span style="color:var(--text-main); font-weight:600;">${s.stagename}</span> 
            <div style="display:flex; gap:12px;">
                <i class="fa fa-edit" style="color:#f59e0b; cursor:pointer;" title="Edit" onclick="editCustomStage('${s.stageid}', '${s.stagename}')"></i>
                <i class="fa fa-times" style="color:#ef4444; cursor:pointer;" title="Delete" onclick="removeCustomStage('${s.stageid}')"></i>
            </div>
        </div>`; 
    }); 
    let container = document.getElementById('stageListContainer');
    if(container) container.innerHTML = listHtml; 
}

async function editCustomStage(id, currentName) {
    let newName = prompt("Enter new stage name:", currentName);
    if(!newName || newName.trim() === currentName) return;
    showLoader("Updating Stage...");
    await _supabase.from('clientstages').update({stagename: newName.trim(), updatedby: currentUserIdDb, actiondate: new Date().toISOString()}).eq('stageid', id);
    hideLoader(); fetchStages(); showToast("Stage Updated", "success");
}

function openStageManage() {
    let modal = document.getElementById('stageManageModal');
    if (modal) {
        modal.style.display = 'flex';
        renderStageListInModal(); 
    }
}

function closeStageManage() {
    let modal = document.getElementById('stageManageModal');
    if (modal) modal.style.display = 'none';
}

function renderStageListInModal() {
    let ul = document.getElementById('stageListUl');
    if (!ul) return;
    ul.innerHTML = '';
    
    if (typeof globalStages !== 'undefined' && globalStages.length > 0) {
        globalStages.forEach(stage => {
            let li = document.createElement('li');
            li.style.cssText = "background: var(--bg-main); margin-bottom: 8px; padding: 10px 15px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border-input); color: var(--text-main); font-size: 14px;";
            li.innerHTML = `<span>${stage.stagename}</span>`; 
            ul.appendChild(li);
        });
    } else {
        ul.innerHTML = '<li style="text-align:center; color: var(--text-muted); font-size: 13px;">No stages found</li>';
    }
}

async function addNewStage() {
    let stageInput = document.getElementById('newStageName');
    let name = stageInput.value.trim();
    
    if (!name) return showToast("Enter a stage name", "warning");

    showLoader("Adding Stage...");
    
    const { data, error } = await _supabase
        .from('clientstages') 
        .insert([{ 
            stagename: name, 
            isactive: 1, 
            createdby: typeof currentUserIdDb !== 'undefined' ? currentUserIdDb : null 
        }])
        .select();

    hideLoader();

    if (error) {
        console.error("Stage Insert Error:", error);
        showToast("Failed to add stage", "error");
    } else {
        showToast("Stage added successfully!", "success");
        stageInput.value = ''; 
        await fetchStages();
        renderStageListInModal();
        renderStageDropdown(); 
    }
}

async function fetchUsersForDropdown() {
    const {data, error} = await _supabase.from('users').select('userid, username').eq('isactive', 1);
    if(!error && data) {
        let html = `<option value='' disabled selected>Select Person...</option>`;
        data.forEach(u => html += `<option value="${u.userid}">${u.username}</option>`);
        let assignEl = document.getElementById('m-assigned');
        if(assignEl) assignEl.innerHTML = html;
    }
}

function toggleSidebar() { let sidebar = document.getElementById('sidebarElement'); if(sidebar) sidebar.classList.toggle('collapsed'); }
function toggleProfileMenu(e) { e.stopPropagation(); document.getElementById('profileMenu').classList.toggle('show'); }

document.addEventListener('click', function(e) { let menu = document.getElementById('profileMenu'); if(menu && menu.classList.contains('show') && !e.target.closest('.profile-dropdown-container')) menu.classList.remove('show'); let notifMenu = document.getElementById('notifMenu'); if(notifMenu && notifMenu.classList.contains('show') && !e.target.closest('.notification-container')) notifMenu.classList.remove('show'); });

function showToast(msg, type="success") { let toast = document.getElementById('customToast'), icon = document.getElementById('toastIcon'); document.getElementById('toastMsgTxt').innerText = msg; if(type==="error"){ toast.style.background="#ef4444"; icon.className="fa fa-exclamation-triangle"; } else if(type==="warning"){ toast.style.background="#f59e0b"; icon.className="fa fa-exclamation-circle"; } else { toast.style.background="#10b981"; icon.className="fa fa-check-circle"; } toast.classList.add('show'); setTimeout(() => { toast.classList.remove('show'); }, 3000); }

function startClock() { setInterval(() => { let d = new Date(); let ct = document.getElementById('clockTime'); if(ct) ct.innerText = d.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', second:'2-digit'}); }, 1000); }
let userInput = document.getElementById('user');
if(userInput) userInput.addEventListener('keypress', function(e) { if(e.key === 'Enter') document.getElementById('pass').focus(); });
let pwInput = document.getElementById('pass');
if(pwInput) pwInput.addEventListener('keypress', function(e) { if(e.key === 'Enter') login(); });
function togglePassword() { let pwd = document.getElementById('pass'), icon = document.getElementById('togglePwd'); if(pwd.type === 'password') { pwd.type = 'text'; icon.className = "fa fa-eye-slash pwd-toggle"; } else { pwd.type = 'password'; icon.className = "fa fa-eye pwd-toggle"; } }

function showLoader(msg) { document.getElementById('loaderMsg').innerText = msg; document.getElementById('fullLoader').style.display = 'flex'; }
function hideLoader() { document.getElementById('fullLoader').style.display = 'none'; }
function toggleTablePwd(icon) { let span = icon.previousElementSibling; if(span.textContent === '••••••••') { span.textContent = span.getAttribute('data-pwd'); icon.className = 'fa fa-eye-slash toggle-table-pwd'; } else { span.textContent = '••••••••'; icon.className = 'fa fa-eye toggle-table-pwd'; } }

async function login() {
  initAudio(); 
  let u = document.getElementById('user').value, p = document.getElementById('pass').value;
  if(!u || !p) return showToast("Enter Username and Password", "warning");
  showLoader("...Authenticating..."); 
  
  const { data, error } = await _supabase.from('users').select('*').eq('loginid', u).eq('password', p).eq('isactive', 1).single();
  
  hideLoader();
  if(data && !error) {
      document.getElementById('cssMan').classList.remove('blindfold');
      document.getElementById('cssMan').classList.add('success'); 
      let ripple = document.createElement('div'); ripple.className = 'login-ripple'; document.body.appendChild(ripple);
      
      setTimeout(() => {
          currentUser = data.loginid; currentRole = data.role; currentName = data.username; currentPic = data.profilepic || ""; currentEmail = data.email || ""; currentUserIdPhone = u;
          currentUserIdDb = data.userid; 
          
          let isAdmin = (currentRole.toLowerCase() === 'admin');
          
          let sData = {username: u, password: p, role: currentRole, name: currentName, dbId: currentUserIdDb};
          if(document.getElementById('rememberMe').checked) { localStorage.setItem('cmt_session', JSON.stringify(sData)); } else { sessionStorage.setItem('cmt_session', JSON.stringify(sData)); localStorage.removeItem('cmt_session'); }
          
          applyUserTheme(); 
          
          document.getElementById('loginScreen').style.display = 'none'; document.getElementById('appLayout').style.display = 'flex';
          initPhysics(); 
          fetchStickyNotes(); 
          fetchEmailTemplates();
          initRealtimePresence(); 
          
          document.getElementById('displayUserName').innerHTML = `${getGreeting()}, <b>${data.username}</b>`; document.getElementById('displayUserRole').innerText = currentRole; 
          if(currentPic) { document.getElementById('avatarImage').src = currentPic; document.getElementById('avatarImage').style.display = 'flex'; document.getElementById('avatarLetter').style.display = 'none'; } else { document.getElementById('avatarLetter').innerText = data.username.charAt(0).toUpperCase(); document.getElementById('avatarImage').style.display = 'none'; document.getElementById('avatarLetter').style.display = 'flex'; }
          
          document.getElementById('menuUserManage').style.display = isAdmin ? 'block' : 'none'; 
          let smub = document.getElementById('smartUserManageBtn'); if(smub) smub.style.display = isAdmin ? 'flex' : 'none'; 
          
          addNotification('Login Success', `Welcome back, ${data.username}!`, 'fa-sign-in-alt', '#10b981');
          
          getClientIP().then(() => {
              fetchStages();
              fetchUsersForDropdown();
              fetchData();
              if(isAdmin) fetchUsers();
          });
          
          if(isAdmin) { switchTab('admin-dashboard'); } else { switchTab('dashboard'); }
          
          showToast(`Welcome back, ${data.username}!`); startClock(); 
          ripple.style.opacity = '0'; setTimeout(()=> ripple.remove(), 1000);
      }, 800);

  } else { 
      let loginBtn = document.querySelector('.login-btn');
      document.getElementById('cssMan').classList.add('fail'); 
      if(loginBtn) loginBtn.classList.add('btn-error-shake');
      
      showToast('Invalid Credentials or User Not Found!', 'error'); 
      localStorage.removeItem('cmt_session'); sessionStorage.removeItem('cmt_session'); 
      
      setTimeout(() => { 
          document.getElementById('cssMan').classList.remove('fail'); 
          if(loginBtn) loginBtn.classList.remove('btn-error-shake');
      }, 600);
  }
}

function logout() {
    if (activeUsersChannel) activeUsersChannel.unsubscribe();
    localStorage.removeItem('cmt_session');
    sessionStorage.removeItem('cmt_session');
    window.location.replace(window.location.href.split('?')[0]); 
}

// --- SUPABASE JOIN QUERY INTEGRATION ---
async function fetchData() {
   const { data, error } = await _supabase.from('clientmanage')
        .select(`
            *,
            client:clientid ( clientname, mobilenumber, email, address ),
            clientstages:stageid ( stagename ),
            users:assigneduserid ( username )
        `)
        .neq('isactive', -1) 
        .order('createdate', { ascending: false }); 
   
   if (!error && data) { 
       let mappedData = data.map(r => {
           let relClient = r.client || null;
           let relStage = r.clientstages || null;
           let relUser = r.users || null;

           return {
               id: r.clientmanageid,
               client_id: r.clientid,
               client_name: relClient ? relClient.clientname : 'Unknown',
               mobile: relClient ? relClient.mobilenumber : '',
               email: relClient ? relClient.email : '',
               address: relClient ? relClient.address : '',
               stage_id: r.stageid,
               stage: relStage ? relStage.stagename : 'Uncategorized', 
               assigned_user_id: r.assigneduserid,
               assigned_person: relUser ? relUser.username : 'Unassigned',
               login_url: r.clientportalurl,
               user_id: r.portalloginid,
               password: r.portalpassword,
               document: r.document,
               remarks: r.remarks,
               status: r.isactive === 1 ? 'Active' : 'Inactive',
               created_date: r.createdate,
               update_date: r.actiondate,
               created_by: r.createdby 
           };
       });

        if (currentRole.toLowerCase() !== 'admin') {
            globalClientData = mappedData.filter(r => r.assigned_user_id === currentUserIdDb || r.created_by === currentUserIdDb);
        } else {
            globalClientData = mappedData;
        }

       currentClientPage = 1; 
       renderTable(); 
       renderKanban(); 
       renderTeamActivity(); 
       populateReportDropdowns(); 
       renderAdminDashboard(); 
       addNotification('Sync Complete', 'Latest client data fetched from Supabase.', 'fa-sync', '#3b82f6'); 
   } else {
       console.error("Fetch Data Error:", error); 
       showToast("Failed to fetch data.", "error");
   }
   hideLoader();
}

// --- AUTO-INSERT SAVING LOGIC (With DB Validation) ---
async function saveClient() { 
    let name = document.getElementById('m-name').value.trim(); 
    if(!name) return showToast("Client Name is required!", "error"); 
    if(name.length < 3) return showToast("Client Name must be at least 3 characters", "warning");

    let btn = document.getElementById('btnSaveClient'); 
    btn.innerHTML = `<i class='fa fa-paper-plane'></i>`; btn.classList.add('fly-away');
    
    let stageVal = document.getElementById('m-stage').value; 
    if(!stageVal) {
        btn.classList.remove('fly-away'); btn.innerHTML = `<i class='fa fa-save'></i> <span>SAVE CLIENT</span>`;
        return showToast("Please select a stage", "error");
    }

    let assignedVal = document.getElementById('m-assigned').value; 
    if(!assignedVal) {
        btn.classList.remove('fly-away'); btn.innerHTML = `<i class='fa fa-save'></i> <span>SAVE CLIENT</span>`;
        return showToast("Please assign a user", "error");
    }

    let createDate = document.getElementById('m-create-date').value || getTodayStr(); 
    let currentStatus = 1; 
    
    if (currentModalMode === 'edit') { 
        let existingRow = globalClientData.find(r => r.id == activeRowIndex); 
        if (existingRow) currentStatus = existingRow.status === 'Active' ? 1 : 0; 
    } 
    
    let docUrl = document.getElementById('m-doc').value || "";
    if(uploadedBase64 !== "") { docUrl = 'data:' + uploadedMimeType + ';base64,' + uploadedBase64; }
    
    showLoader("Checking & Saving Client..."); 

    let actualClientId = null;
    let ip = currentUserIP || await getClientIP();

    let { data: existingClientData, error: clientCheckErr } = await _supabase
        .from('client')
        .select('clientid')
        .ilike('clientname', name);

    if (existingClientData && existingClientData.length > 0) {
        actualClientId = existingClientData[0].clientid;
        await _supabase.from('client').update({
            mobilenumber: document.getElementById('m-mobile').value,
            email: document.getElementById('m-email').value,
            address: document.getElementById('m-address').value,
            updatedby: currentUserIdDb,
            actiondate: new Date().toISOString()
        }).eq('clientid', actualClientId);
    } else {
        const { data: newClient, error: clientInsertErr } = await _supabase
            .from('client')
            .insert([{
                clientname: name,
                mobilenumber: document.getElementById('m-mobile').value,
                email: document.getElementById('m-email').value,
                address: document.getElementById('m-address').value,
                createdby: currentUserIdDb,
                actiondate: new Date().toISOString(),
                ipaddress: ip,
                isactive: 1
            }])
            .select();
        
        if (clientInsertErr || !newClient) {
            hideLoader();
            btn.classList.remove('fly-away'); btn.innerHTML = `<i class='fa fa-save'></i> <span>SAVE CLIENT</span>`;
            return showToast("Failed to create new Client profile", "error");
        }
        actualClientId = newClient[0].clientid;
    }

    let cmData = { 
        clientid: parseInt(actualClientId), 
        stageid: parseInt(stageVal), 
        assigneduserid: parseInt(assignedVal),
        clientportalurl: document.getElementById('m-url').value, 
        portalloginid: document.getElementById('m-uid').value, 
        portalpassword: document.getElementById('m-pass').value, 
        document: docUrl, 
        remarks: document.getElementById('m-remarks').value || "",
        isactive: parseInt(currentStatus),
        updatedby: parseInt(currentUserIdDb),
        actiondate: new Date().toISOString()
    };

    let resErr;

    if (currentModalMode === 'edit') {
        const { error } = await _supabase.from('clientmanage').update(cmData).eq('clientmanageid', activeRowIndex);
        resErr = error;
    } else {
        cmData.createdby = currentUserIdDb;
        cmData.createdate = createDate;
        const { error } = await _supabase.from('clientmanage').insert([cmData]);
        resErr = error;
    }
    
    hideLoader();

    if (resErr) {
        console.error("Supabase Save Error:", resErr);
        showToast("Error: " + resErr.message, "error");
        btn.classList.remove('fly-away'); btn.innerHTML = `<i class='fa fa-save'></i> <span>SAVE CLIENT</span>`;
    } else {
        triggerConfetti(); 
        showToast("Client Saved Successfully", "success"); 
        addNotification('Client Saved', `${name} has been updated.`, 'fa-save', '#10b981'); 
        closeModal();
        fetchData(); 
    }
}

// --- HIGH SECURITY PIN AND PASSWORD RESET ---
let verifiedResetEmail = "";

async function initiatePasswordReset() {
    let email = document.getElementById('fp-email').value.trim();
    if(!email) return showToast("Enter your registered email address", "error");
    
    showLoader("Locating Account...");
    
    // 1. Check if email exists in Database
    const { data, error } = await _supabase.from('users').select('email').eq('email', email).eq('isactive', 1);
    
    hideLoader();

    if (error || !data || data.length === 0) {
        return Swal.fire({
            icon: 'error',
            title: 'Account Not Found',
            text: 'This email is not registered in the system or the account is inactive!',
            confirmButtonColor: '#3b82f6'
        });
    }

    // 2. Account Found! Move to Step 2 Silently (NO MOCK ALERTS)
    verifiedResetEmail = email;
    
    let maskedEmail = email.replace(/(.{2})(.*)(?=@)/, function(gp1, gp2, gp3) { 
        for(let i = 0; i < gp3.length; i++) { gp2+= "*"; } return gp2; 
    });
    
    document.getElementById('fp-display-email').innerText = maskedEmail;
    document.getElementById('fp-step-1').style.display = 'none';
    document.getElementById('fp-step-2').style.display = 'block';
}

async function verifyPinAndReset() {
    let pin = document.getElementById('fp-otp').value.trim();
    let newPass = document.getElementById('fp-new-pass').value;
    let confirmPass = document.getElementById('fp-confirm-pass').value;
    
    if(!pin) return showToast("Please enter your Secret Recovery PIN", "error");
    if(!newPass || !confirmPass) return showToast("Please enter and confirm your new password", "error");
    if(newPass.length < 6) return showToast("Password must be at least 6 characters.", "error");
    if(newPass !== confirmPass) return showToast("Passwords do not match!", "error");
    
    showLoader("Verifying PIN & Securing Account...");
    
    // 1. Verify Email + PIN combination directly in Database
    const { data: userRecord, error: fetchErr } = await _supabase.from('users').select('userid').eq('email', verifiedResetEmail).eq('otp', pin).single();

    if (fetchErr || !userRecord) {
        hideLoader();
        return Swal.fire({
            icon: 'error',
            title: 'Access Denied!',
            text: 'The Secret Recovery PIN you entered is incorrect. Please try again or contact Super Admin.',
            confirmButtonColor: '#ef4444'
        });
    }

    // 2. PIN Matched! Update Password in Database
    const { error: updateErr } = await _supabase.from('users').update({ password: newPass, actiondate: new Date().toISOString() }).eq('email', verifiedResetEmail);
    
    hideLoader(); 
    
    if (updateErr) {
        showToast("System error: Failed to reset password.", "error");
    } else {
        Swal.fire({
            icon: 'success',
            title: 'Account Secured!',
            text: 'Your password has been changed successfully. You can now login with your new credentials.',
            confirmButtonColor: '#3b82f6'
        }).then(() => {
            document.getElementById('forgotPassModal').style.display = 'none';
            // Optionally redirect to login screen or auto-fill login details
        });
    }
}

function openForgotPassModal() {
    document.getElementById('fp-email').value = '';
    document.getElementById('fp-otp').value = '';
    document.getElementById('fp-new-pass').value = '';
    document.getElementById('fp-confirm-pass').value = '';
    document.getElementById('fp-step-1').style.display = 'block';
    document.getElementById('fp-step-2').style.display = 'none';
    document.getElementById('forgotPassModal').style.display = 'flex';
}

// --- PROFILE MANAGEMENT ---
function openProfileModal() { 
    document.getElementById('p-user').value = currentUser; 
    document.getElementById('p-name').value = currentName; 
    document.getElementById('p-email').value = currentEmail;
    let p = ""; 
    try { p = JSON.parse(localStorage.getItem('cmt_session') || sessionStorage.getItem('cmt_session')).password; } catch(e){} 
    document.getElementById('p-pass').value = p; 
    document.getElementById('p-uploadText').innerText = "Click to Update Picture"; 
    pUploadedBase64 = ""; pUploadedFileName = ""; pUploadedMimeType = ""; 
    document.getElementById('profileModal').style.display = 'flex'; 
}

function handleProfilePic(e) { 
    let file = e.target.files[0]; 
    if(!file) return; 
    let reader = new FileReader(); 
    reader.onload = function(evt) { 
        let img = new Image(); 
        img.onload = function() { 
            let canvas = document.createElement('canvas'); 
            let ctx = canvas.getContext('2d'); 
            let maxW = 300, maxH = 300; 
            let w = img.width, h = img.height; 
            if(w > maxW) { h *= maxW/w; w = maxW; } 
            if(h > maxH) { w *= maxH/h; h = maxH; } 
            canvas.width = w; canvas.height = h; 
            ctx.drawImage(img, 0, 0, w, h); 
            let dataUrl = canvas.toDataURL('image/jpeg', 0.8); 
            pUploadedBase64 = dataUrl.split(',')[1]; 
            pUploadedFileName = file.name; 
            pUploadedMimeType = 'image/jpeg'; 
            document.getElementById('p-uploadText').innerHTML = `<b style='color:#10b981;'>${file.name} Ready!</b>`; 
        }; 
        img.src = evt.target.result; 
    }; 
    reader.readAsDataURL(file); 
}

async function saveProfile() { 
    let pName = document.getElementById('p-name').value; 
    let pPass = document.getElementById('p-pass').value; 
    let pEmail = document.getElementById('p-email').value;
    if(!pName || !pPass || !pEmail) return showToast("Fields cannot be empty", "error"); 
    
    if(pPass.length < 6) return showToast("Password must be at least 6 characters.", "error");

    showLoader("Updating Profile..."); 
    
    let updateData = { username: pName, password: pPass, email: pEmail, actiondate: new Date().toISOString() };
    if(pUploadedBase64 !== "") { updateData.profilepic = 'data:' + pUploadedMimeType + ';base64,' + pUploadedBase64; }
    
    const { error } = await _supabase.from('users').update(updateData).eq('loginid', currentUser);
    hideLoader(); 
    
    if(!error) { 
        showToast("Profile Updated Successfully!"); 
        addNotification('Profile', 'Profile updated successfully', 'fa-user-edit', '#10b981'); 
        currentName = pName; 
        currentEmail = pEmail;
        document.getElementById('displayUserName').innerHTML = `${getGreeting()}, <b>${currentName}</b>`; 
        if(updateData.profilepic) { 
            currentPic = updateData.profilepic; 
            document.getElementById('avatarImage').src = currentPic; 
            document.getElementById('avatarImage').style.display = 'flex'; 
            document.getElementById('avatarLetter').style.display = 'none'; 
        } 
        let sData = {username: currentUser, password: pPass, role: currentRole, name: currentName, dbId: currentUserIdDb}; 
        if(localStorage.getItem('cmt_session')) localStorage.setItem('cmt_session', JSON.stringify(sData)); 
        else sessionStorage.setItem('cmt_session', JSON.stringify(sData)); 
        document.getElementById('profileModal').style.display = 'none'; 
    } else { 
        showToast("Failed to update profile", "error"); 
    } 
}

const animateNum = (id, endVal) => { 
    let el = document.getElementById(id); 
    let startVal = 0; 
    let duration = 1000; 
    let startTime = null; 
    const step = (timestamp) => { 
        if (!startTime) startTime = timestamp; 
        let progress = Math.min((timestamp - startTime) / duration, 1); 
        el.innerText = Math.floor(progress * endVal); 
        if (progress < 1) { window.requestAnimationFrame(step); } 
    }; 
    window.requestAnimationFrame(step); 
};

function renderAdminDashboard() { 
    let dashboardData = globalClientData;

    let activeC = 0, inactiveC = 0; let totalUsers = globalUserData.length; 
    let stageCounts = {}, assignCounts = {}; 
    
    for(let i=0; i<dashboardData.length; i++) { 
        let r = dashboardData[i];
        let stage = r.stage || 'Uncategorized'; 
        let assign = r.assigned_person || 'Unassigned'; 
        let status = r.status || 'Active'; 
        if(status === 'Active') activeC++; else inactiveC++; 
        stageCounts[stage] = (stageCounts[stage] || 0) + 1; assignCounts[assign] = (assignCounts[assign] || 0) + 1; 
    } 
    
    animateNum('dashTotalClients', activeC + inactiveC); 
    animateNum('dashActiveClients', activeC); 
    animateNum('dashInactiveClients', inactiveC); 
    animateNum('dashTotalUsers', totalUsers); 
    
    // Fetch actual CSS variables dynamically to fix Chart.js black border issue
    let style = getComputedStyle(document.body);
    let textColor = style.getPropertyValue('--text-main').trim() || '#333'; 
    let cardBgColor = style.getPropertyValue('--bg-card').trim() || '#ffffff';
    let gridColor = style.getPropertyValue('--border-color').trim() || 'rgba(0,0,0,0.1)';
    
    let chartLabels = Object.keys(stageCounts).map(s => `${s} (${stageCounts[s]})`); 
    
    // Doughnut Chart (Client Stages) - Sleek & Modern Look
    if (stageChartInstance) stageChartInstance.destroy(); 
    let stageCtx = document.getElementById('stageChart').getContext('2d'); 
    stageChartInstance = new Chart(stageCtx, { 
        type: 'doughnut', 
        data: { 
            labels: chartLabels, 
            datasets: [{ 
                data: Object.values(stageCounts), 
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#64748b'], 
                borderWidth: 5, 
                borderColor: cardBgColor, // Seamlessly blends with Light/Dark Mode card background
                hoverOffset: 8
            }] 
        }, 
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            cutout: '72%', // Thinner, more elegant ring
            plugins: { 
                legend: { 
                    position: 'right', 
                    labels: { 
                        color: textColor, 
                        font: { family: 'Poppins', size: 12 }, 
                        padding: 20,
                        usePointStyle: true, // Changes legend boxes to premium circles
                        pointStyle: 'circle'
                    } 
                } 
            } 
        } 
    }); 
    
    // Bar Chart (Team Workload) - Perfected Grid Lines & Bar Width
    if (workloadChartInstance) workloadChartInstance.destroy(); 
    let workCtx = document.getElementById('workloadChart').getContext('2d'); 
    workloadChartInstance = new Chart(workCtx, { 
        type: 'bar', 
        data: { 
            labels: Object.keys(assignCounts), 
            datasets: [{ 
                label: 'Clients Assigned', 
                data: Object.values(assignCounts), 
                backgroundColor: '#3b82f6', 
                borderRadius: 6,
                maxBarThickness: 45 // Prevents single bars from becoming gigantically wide
            }] 
        }, 
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            scales: { 
                y: { 
                    beginAtZero: true, 
                    grid: { color: gridColor, drawBorder: false }, 
                    ticks: { color: textColor, font: { family: 'Poppins' }, precision: 0, padding: 10 } 
                }, 
                x: { 
                    grid: { display: false, drawBorder: false }, 
                    ticks: { color: textColor, font: { family: 'Poppins' }, padding: 10 } 
                } 
            }, 
            plugins: { legend: { display: false } } 
        } 
    }); 
}

function populateReportDropdowns() { 
    let names = new Set(), stages = new Set(), assigns = new Set(); 
    let data = globalClientData; 
    for(let i=0; i<data.length; i++) { 
        let r = data[i];
        if(r) { 
            let n = String(r.client_name || '').trim(); if(n) names.add(n); 
            let s = String(r.stage || '').trim(); if(s) stages.add(s); 
            let a = String(r.assigned_person || '').trim(); if(a) assigns.add(a); 
        } 
    } 
    let nameHtml = '<option value="">All Clients</option>'; Array.from(names).sort().forEach(v => nameHtml += `<option value="${v}">${v}</option>`); 
    let stageHtml = '<option value="">All Stages</option>'; Array.from(stages).sort().forEach(v => stageHtml += `<option value="${v}">${v}</option>`); 
    let assignHtml = '<option value="">All Persons</option>'; Array.from(assigns).sort().forEach(v => assignHtml += `<option value="${v}">${v}</option>`); 
    document.getElementById('repFilterName').innerHTML = nameHtml; 
    document.getElementById('repFilterStage').innerHTML = stageHtml; 
    document.getElementById('repFilterAssigned').innerHTML = assignHtml; 
}

function openLaunchpad(index) { 
    let r = globalClientData[index]; if(!r) return; 
    let url = r.login_url || ''; if(url && !url.startsWith('http')) url = 'https://' + url; 
    document.getElementById('l-uid').innerText = String(r.user_id || 'N/A').replace(/^'/, ''); 
    document.getElementById('l-pass').innerText = String(r.password || 'N/A').replace(/^'/, ''); 
    document.getElementById('l-btn').onclick = function() { if(url) window.open(url, '_blank'); else showToast('No valid URL.', 'warning'); }; 
    document.getElementById('launchModal').style.display = 'flex'; 
}

function sortTable(n) { }

function toggleSelectAll() { 
    let isChecked = document.getElementById('selectAllCb').checked; 
    let checkboxes = document.querySelectorAll('.row-checkbox'); 
    checkboxes.forEach(cb => cb.checked = isChecked); 
    toggleMultiDeleteBtn(); 
}

function checkSelected() { 
    let total = document.querySelectorAll('.row-checkbox').length; 
    let checked = document.querySelectorAll('.row-checkbox:checked').length; 
    document.getElementById('selectAllCb').checked = (total === checked && total > 0); 
    toggleMultiDeleteBtn(); 
}

function toggleMultiDeleteBtn() { 
    let checked = document.querySelectorAll('.row-checkbox:checked').length; 
    if(checked > 0) { 
        document.getElementById('multiDeleteBtn').style.display = 'flex'; 
        document.getElementById('multiDeleteBtn').innerHTML = `<i class="fa fa-trash"></i> Del (${checked})`; 
        document.getElementById('bulkActiveBtn').style.display = 'flex'; 
        document.getElementById('bulkInactiveBtn').style.display = 'flex'; 
    } else { 
        document.getElementById('multiDeleteBtn').style.display = 'none'; 
        document.getElementById('bulkActiveBtn').style.display = 'none'; 
        document.getElementById('bulkInactiveBtn').style.display = 'none'; 
    } 
}

async function deleteSelectedClients() {
    let checked = document.querySelectorAll('.row-checkbox:checked');
    let ids = Array.from(checked).map(cb => cb.value);
    if(ids.length === 0) return;

    let result = await Swal.fire({
        title: "Are you sure?",
        text: `You are about to permanently hide ${ids.length} selected clients!`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, delete them!"
    });

    if (result.isConfirmed) {
        showLoader("Deleting Clients...");
        
        let { data: cmData } = await _supabase.from('clientmanage').select('clientid').in('clientmanageid', ids);
        
        await _supabase.from('clientmanage').update({isactive: -1}).in('clientmanageid', ids);
        
        if (cmData && cmData.length > 0) {
            let clientIds = cmData.map(item => item.clientid).filter(id => id !== null); 
            if (clientIds.length > 0) {
                await _supabase.from('client').update({ isactive: -1 }).in('clientid', clientIds);
            }
        }
        
        document.getElementById('selectAllCb').checked = false; 
        toggleMultiDeleteBtn(); 
        fetchData(); 
        hideLoader();
        Swal.fire("Deleted!", `${ids.length} clients removed.`, "success");
    }
}

async function bulkStatus(newStatus) {
    let checked = document.querySelectorAll('.row-checkbox:checked');
    let ids = Array.from(checked).map(cb => cb.value);
    
    if(ids.length === 0) return;

    let isActive = newStatus === 'Active' ? 1 : 0;

    let result = await Swal.fire({
        title: `Mark ${ids.length} clients as ${newStatus}?`,
        text: `This will update the status for all selected clients.`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: isActive === 1 ? "#10b981" : "#f59e0b",
        cancelButtonColor: "#6b7280",
        confirmButtonText: `Yes, Mark ${newStatus}!`
    });

    if (result.isConfirmed) {
        showLoader(`Marking ${ids.length} clients as ${newStatus}...`);
        
        let { data: cmData } = await _supabase.from('clientmanage').select('clientid').in('clientmanageid', ids);
        
        await _supabase.from('clientmanage').update({ isactive: isActive, actiondate: new Date().toISOString() }).in('clientmanageid', ids);
        
        if (cmData && cmData.length > 0) {
            let clientIds = cmData.map(item => item.clientid).filter(id => id !== null); 
            if (clientIds.length > 0) {
                await _supabase.from('client').update({ isactive: isActive }).in('clientid', clientIds);
            }
        }

        document.getElementById('selectAllCb').checked = false;
        fetchData();
        toggleMultiDeleteBtn();
        hideLoader();
        
        addNotification('Status Change', `Marked ${ids.length} clients as ${newStatus}`, 'fa-check', isActive === 1 ? '#10b981' : '#f59e0b');
        Swal.fire("Updated!", `${ids.length} clients marked as ${newStatus}.`, "success");
    }
}

function highlightSearch(text, filter) { 
    if(!filter || filter === '') return text; 
    let regex = new RegExp(`(${filter})`, "gi"); 
    return String(text).replace(regex, "<mark style='background:#fde047; padding:0 2px; border-radius:4px; color:#000;'>$1</mark>"); 
}

function switchClientView(mode) { 
    currentViewMode = mode; 
    document.getElementById('btnTableView').classList.remove('active'); 
    document.getElementById('btnBoardView').classList.remove('active'); 
    document.getElementById('tableViewWrapper').style.display = 'none'; 
    document.getElementById('boardViewWrapper').classList.remove('active'); 
    if(mode === 'table') { 
        document.getElementById('btnTableView').classList.add('active'); 
        document.getElementById('tableViewWrapper').style.display = 'block'; 
    } else { 
        document.getElementById('btnBoardView').classList.add('active'); 
        document.getElementById('boardViewWrapper').classList.add('active'); 
        renderKanban(); 
    } 
}

function filterTable() { currentClientPage = 1; renderTable(); if(currentViewMode === 'board') renderKanban(); }
function changePage(delta) { currentClientPage += delta; renderTable(); }

function renderTable() {
  let data = globalClientData;
  let filterText = document.getElementById("searchInput").value.trim().toLowerCase();
  let filteredData = data.filter(r => { if(!filterText) return true; return Object.values(r).some(cell => String(cell).toLowerCase().includes(filterText)); });
  
  if(filteredData.length === 0) { document.getElementById('clientTableContainer').innerHTML = '<div style="padding:30px;text-align:center;">No clients found.</div>'; document.getElementById('clientPagination').innerHTML=''; return; }
  
  let totalRows = filteredData.length; let totalPages = Math.ceil(totalRows / rowsPerPage); let startIdx = (currentClientPage - 1) * rowsPerPage; let endIdx = startIdx + rowsPerPage;
  let html = '<table id="clientTable"><thead><tr><th style="width:40px;"><input type="checkbox" id="selectAllCb" onclick="toggleSelectAll()"></th><th onclick="sortTable(1)">Date Added <i class="fa fa-sort"></i></th><th onclick="sortTable(2)">Client Name <i class="fa fa-sort"></i></th><th>Stage</th><th>URL</th><th>User ID</th><th>Password</th><th>Document</th><th>Assigned</th><th>Remarks</th><th>Action</th></tr></thead><tbody>';
  
  for(let i = startIdx; i < endIdx && i < filteredData.length; i++) {
    let r = filteredData[i]; html += '<tr>'; 
    let sheetRowIdx = r.id; let status = r.status || 'Active';
    let actR = globalClientData.findIndex(x=>x.id == sheetRowIdx);
    
    html += `<td><input type="checkbox" class="row-checkbox" value="${sheetRowIdx}" onclick="checkSelected()"></td>`;
    let cDate = r.created_date ? formatDateBD(r.created_date) : 'N/A'; html += `<td><span style="font-size:13px; color:var(--text-muted); font-weight:500;">${highlightSearch(cDate, filterText)}</span></td>`;
    let lastUp = r.update_date ? formatDateBD(r.update_date) : cDate; 
    
    html += `<td title="Last Modified: ${lastUp}" oncontextmenu="showContextMenu(event, '${sheetRowIdx}')"><div class="story-ring" onclick="openStory(${actR})"><div class="story-avatar">${r.client_name.charAt(0).toUpperCase()}</div><b style="${status === 'Inactive' ? 'text-decoration:line-through; color:var(--text-muted);' : ''}">${highlightSearch(r.client_name, filterText)}</b></div></td>`; 
    
    html += `<td oncontextmenu="showContextMenu(event, '${sheetRowIdx}')">${getStageBadge(r.stage)}</td>`;
    
    let urlVal = String(r.login_url || ''); let uidVal = String(r.user_id || '').replace(/^'/, ''); let passVal = String(r.password || '').replace(/^'/, '');
    
    html += `<td oncontextmenu="showContextMenu(event, '${sheetRowIdx}')">${highlightSearch(urlVal, filterText)}</td>`;
    html += `<td oncontextmenu="showContextMenu(event, '${sheetRowIdx}')">${highlightSearch(uidVal, filterText)}</td>`;
    html += `<td oncontextmenu="showContextMenu(event, '${sheetRowIdx}')"><span class="pwd-mask" data-pwd="${passVal}">••••••••</span> <i class="fa fa-eye toggle-table-pwd" style="cursor:pointer; color:var(--text-muted); margin-left:5px; font-size:12px;" onclick="toggleTablePwd(this)"></i></td>`; 
    
    let doc = r.document; if(doc && doc.trim() !== '') html += `<td oncontextmenu="showContextMenu(event, '${sheetRowIdx}')"><i class="fa fa-eye" style="color:#3b82f6; cursor:pointer;" onclick="openPreview('${doc}')" title="Preview Document"></i></td>`; else html += `<td oncontextmenu="showContextMenu(event, '${sheetRowIdx}')"><span style="color:var(--text-muted); font-style:italic;">N/A</span></td>`;
    let owner = r.assigned_person || 'Unassigned'; html += `<td oncontextmenu="showContextMenu(event, '${sheetRowIdx}')"><span class="owner-badge"><i class="fa fa-user" style="margin-right:4px;"></i> ${highlightSearch(owner, filterText)}</span></td>`;
    let remarksText = r.remarks || ''; html += `<td oncontextmenu="showContextMenu(event, '${sheetRowIdx}')"><span style="font-size:12px; color:var(--text-muted);">${highlightSearch(remarksText, filterText)}</span></td>`;
    let toggleIcon = status === 'Active' ? 'fa-toggle-on' : 'fa-toggle-off'; let toggleColor = status === 'Active' ? '#10b981' : '#ef4444';
    
    html += `<td style="min-width: 220px;">
    <i class="fa fa-eye action-icon view-icon" title="View Full Details" onclick="openClientViewModal(${actR})"></i>
    <i class="fa fa-thumbtack action-icon" style="color:#8b5cf6;" title="Pin Client (PiP)" onclick="pinClient(${actR})"></i>
    <i class="fa ${toggleIcon} status-icon" style="color:${toggleColor}; font-size:18px; margin-right:12px; cursor:pointer;" title="Toggle Status" onclick="toggleStatus('${sheetRowIdx}', '${status}', this)"></i><i class="fa fa-rocket action-icon rocket-icon" title="Launch" onclick="openLaunchpad(${actR})"></i><i class="fa fa-edit action-icon edit-icon" title="Edit" onclick="openModal('edit', ${actR}, '${sheetRowIdx}')"></i><i class="fa fa-trash action-icon delete-icon" title="Delete" onclick="deleteClient('${sheetRowIdx}')"></i></td></tr>`;
  }
  html += '</tbody></table>'; document.getElementById('clientTableContainer').innerHTML = html; document.getElementById('multiDeleteBtn').style.display = 'none'; document.getElementById('bulkActiveBtn').style.display = 'none'; document.getElementById('bulkInactiveBtn').style.display = 'none';
  let pHTML = `<span>Page ${currentClientPage} of ${totalPages} (Total ${totalRows})</span> <div style="display:flex; gap:10px;"><button class="page-btn" ${currentClientPage === 1 ? 'disabled' : ''} onclick="changePage(-1)"><i class="fa fa-chevron-left"></i> Prev</button><button class="page-btn" ${currentClientPage === totalPages ? 'disabled' : ''} onclick="changePage(1)">Next <i class="fa fa-chevron-right"></i></button></div>`; document.getElementById('clientPagination').innerHTML = pHTML;
}

// --- CLIENT PROFILE VIEW (ERP STYLE) ---
function openClientViewModal(rIdx) {
    let r = globalClientData[rIdx];
    if (!r) return;
    
    // Set Profile Info
    document.getElementById('cv-avatar').innerText = r.client_name ? r.client_name.charAt(0).toUpperCase() : 'C';
    document.getElementById('cv-name').innerText = r.client_name || 'N/A';
    document.getElementById('cv-stage').innerHTML = getStageBadge(r.stage);
    
    // Set Status Badge
    let statusBadge = document.getElementById('cv-status');
    if(r.status === 'Active') {
        statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
        statusBadge.style.color = '#10b981';
        statusBadge.innerText = 'Active Client';
    } else {
        statusBadge.style.background = 'rgba(239, 68, 68, 0.15)';
        statusBadge.style.color = '#ef4444';
        statusBadge.innerText = 'Inactive Client';
    }
    
    // Set Contact Info
    document.getElementById('cv-mobile').innerText = r.mobile || 'N/A';
    document.getElementById('cv-email').innerText = r.email || 'N/A';
    document.getElementById('cv-address').innerText = r.address || 'N/A';
    
    // Set Credentials (URL with link)
    let urlVal = String(r.login_url || '');
    document.getElementById('cv-url').innerHTML = urlVal ? `<a href="${urlVal.startsWith('http') ? urlVal : 'https://'+urlVal}" target="_blank" style="color:#3b82f6; text-decoration:none; display:flex; align-items:center; gap:5px; width:100%;"><span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${urlVal}</span> <i class="fa fa-external-link-alt" style="font-size:10px;"></i></a>` : 'N/A';
    
    // Password with Mask & Eye toggle
    document.getElementById('cv-uid').innerText = String(r.user_id || '').replace(/^'/, '') || 'N/A';
    let passVal = String(r.password || '').replace(/^'/, '');
    document.getElementById('cv-pass').innerHTML = passVal ? `<span class="pwd-mask" data-pwd="${passVal}">••••••••</span> <i class="fa fa-eye toggle-table-pwd" style="cursor:pointer; color:#3b82f6; font-size:15px;" onclick="toggleTablePwd(this)"></i>` : 'N/A';
    
    // Set System Records
    document.getElementById('cv-create-date').innerText = r.created_date ? formatDateBD(r.created_date) : 'N/A';
    document.getElementById('cv-update-date').innerText = r.update_date ? formatDateBD(r.update_date) : (r.created_date ? formatDateBD(r.created_date) : 'N/A');
    document.getElementById('cv-assigned').innerHTML = `<i class="fa fa-user-tie" style="margin-right:8px; color:#3b82f6; font-size:16px;"></i> <span style="font-weight:600;">${r.assigned_person || 'Unassigned'}</span>`;
    document.getElementById('cv-remarks').innerText = r.remarks || 'No specific remarks/notes have been added for this client yet.';
    
    // Show Modal
    document.getElementById('clientViewModal').style.display = 'flex';
}

function renderKanban() {
    let board = document.getElementById('boardViewWrapper'); board.innerHTML = '';
    let filterText = document.getElementById("searchInput").value.trim().toLowerCase(); 
    let data = globalClientData;

    globalStages.forEach(stageObj => {
        let stage = stageObj.stagename;
        let col = document.createElement('div'); col.className = 'kanban-column';
        let stageClients = data.filter(r => { let matchesStage = (r.stage || 'Uncategorized') === stage; let matchesSearch = filterText === '' || Object.values(r).some(cell => String(cell).toLowerCase().includes(filterText)); return matchesStage && matchesSearch && (r.status !== 'Inactive'); });
        let colColor = getStageColor(stage); let headerHTML = `<div class="kanban-col-header" style="border-bottom-color:${colColor};"><span>${stage}</span> <span class="kanban-col-count">${stageClients.length}</span></div>`; col.innerHTML = headerHTML;
        let bodyDiv = document.createElement('div'); bodyDiv.className = 'kanban-col-body'; bodyDiv.setAttribute('ondrop', `drop(event, '${stage}')`); bodyDiv.setAttribute('ondragover', `allowDrop(event)`); bodyDiv.setAttribute('ondragleave', `dragLeave(event)`);
        stageClients.forEach(r => {
            let sheetRowIdx = r.id; let card = document.createElement('div'); card.className = 'kanban-card'; card.setAttribute('draggable', 'true'); card.setAttribute('ondragstart', `drag(event)`); card.setAttribute('data-rowidx', sheetRowIdx);
            card.innerHTML = `<div class="k-card-title">${highlightSearch(r.client_name, filterText)} <i class="fa fa-rocket" style="color:#8b5cf6; cursor:pointer;" onclick="openLaunchpad(${globalClientData.findIndex(x=>x.id==sheetRowIdx)})"></i></div><div class="k-card-date"><i class="fa fa-calendar-alt"></i> ${formatDateBD(r.created_date)}</div><div class="k-card-owner"><i class="fa fa-user"></i> ${highlightSearch(r.assigned_person || 'Unassigned', filterText)}</div><div class="k-card-actions"><i class="fa fa-edit" style="color:#f59e0b; cursor:pointer;" onclick="openModal('edit', ${globalClientData.findIndex(x=>x.id==sheetRowIdx)}, '${sheetRowIdx}')"></i></div>`;
            bodyDiv.appendChild(card);
        }); col.appendChild(bodyDiv); board.appendChild(col);
    });
}

function allowDrop(ev) { ev.preventDefault(); ev.currentTarget.classList.add('drag-over'); } 
function dragLeave(ev) { ev.currentTarget.classList.remove('drag-over'); } 
function drag(ev) { ev.dataTransfer.setData("rowIdx", ev.currentTarget.getAttribute("data-rowidx")); }

async function drop(ev, stageName) { 
    ev.preventDefault(); ev.currentTarget.classList.remove('drag-over'); 
    let rowIdx = ev.dataTransfer.getData("rowIdx"); if(!rowIdx) return; 
    let row = globalClientData.find(r => r.id == rowIdx); 
    if(row && row.stage !== stageName) { 
        let stageObj = globalStages.find(s => s.stagename === stageName);
        if(!stageObj) return;

        row.stage = stageName; row.update_date = getTodayStr(); 
        renderKanban(); renderTable(); 
        addNotification('Stage Moved', `${row.client_name} moved to ${stageName}`, 'fa-random', '#3b82f6'); 
        await _supabase.from('clientmanage').update({ stageid: stageObj.stageid, actiondate: new Date().toISOString(), updatedby: currentUserIdDb }).eq('clientmanageid', rowIdx);
        if (stageName.toLowerCase().includes('live') || stageName.toLowerCase().includes('training')) triggerConfetti();
    } 
}

async function toggleStatus(sheetRowIdx, currentStatus, el) {
    let actionText = currentStatus === 'Active' ? 'Inactive' : 'Active';
    let isActivating = currentStatus !== 'Active';

    let result = await Swal.fire({
        title: `Mark as ${actionText}?`,
        text: `You are about to mark this client as ${actionText}.`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: isActivating ? "#10b981" : "#f59e0b",
        cancelButtonColor: "#6b7280",
        confirmButtonText: `Yes, Mark ${actionText}!`
    });

    if (result.isConfirmed) {
        showLoader(`Updating status to ${actionText}...`);

        let newStatus = actionText;
        let newColor = isActivating ? '#10b981' : '#ef4444';
        let newIcon = isActivating ? 'fa-toggle-on' : 'fa-toggle-off';
        let numericStatus = isActivating ? 1 : 0;

        let { data: cmData } = await _supabase.from('clientmanage').select('clientid').eq('clientmanageid', sheetRowIdx);
        let actualClientId = (cmData && cmData.length > 0) ? cmData[0].clientid : null;

        await _supabase.from('clientmanage').update({ isactive: numericStatus, actiondate: new Date().toISOString() }).eq('clientmanageid', sheetRowIdx);
        if(actualClientId) {
            await _supabase.from('client').update({ isactive: numericStatus }).eq('clientid', actualClientId);
        }

        el.className = `fa ${newIcon} status-icon`;
        el.style.color = newColor;
        el.setAttribute('onclick', `toggleStatus('${sheetRowIdx}', '${newStatus}', this)`);
        let tr = el.closest('tr');
        if(tr) {
            let bText = tr.querySelector('td:nth-child(3) b');
            if(bText) {
                bText.style.textDecoration = numericStatus === 0 ? 'line-through' : 'none';
                bText.style.color = numericStatus === 0 ? 'var(--text-muted)' : '';
            }
        }

        let r = globalClientData.find(x => x.id == sheetRowIdx);
        if(r) {
            r.status = newStatus;
            addNotification('Status Updated', `${r.client_name} marked as ${newStatus}`, 'fa-sync', newColor);
        }
        
        if(currentViewMode === 'board') renderKanban();
        renderAdminDashboard(); 
        
        hideLoader();
        Swal.fire("Updated!", `Client marked as ${actionText}.`, "success");
    }
}

function switchTab(tabId) {
    try {
        let targetPanel = document.getElementById('tab-' + tabId);
        if (!targetPanel) return;

        let allPanels = document.querySelectorAll('.tab-panel');
        for(let i = 0; i < allPanels.length; i++) {
            allPanels[i].style.display = 'none';
            allPanels[i].classList.remove('active');
        }
        
        targetPanel.style.display = 'block';
        targetPanel.classList.add('active');

        let allLinks = document.querySelectorAll('.sidebar-menu a');
        for(let i = 0; i < allLinks.length; i++) allLinks[i].classList.remove('active');
        let navItem = document.getElementById('nav-' + tabId);
        if (navItem) navItem.classList.add('active');
        
        let bottomLinks = document.querySelectorAll('.bottom-nav-item');
        for(let i = 0; i < bottomLinks.length; i++) bottomLinks[i].classList.remove('active');
        let activeBottom = document.querySelector('.bottom-nav-item[onclick*="' + tabId + '"]');
        if (activeBottom) activeBottom.classList.add('active');

        let titles = {
            'admin-dashboard': "Performance Dashboard",
            'active-users': "Live Users Hub",
            'emails': "Email Engine",
            'reports': "Professional Report",
            'team': "Team Activity Overview",
            'users': "User Management",
            'dashboard': "Client Database",
            'notes': "Team Notes" // Eta notun notes tab er title
        };
        let pt = document.getElementById('pageTitle');
        if (pt && titles[tabId]) pt.innerText = titles[tabId];
        
        if (window.innerWidth <= 768) {
            let overlay = document.getElementById('sidebarOverlay');
            if (overlay) overlay.classList.remove('show');
        }
        
    } catch (uiError) {
        console.error("UI Switch Error: ", uiError);
    }

    setTimeout(function() {
        try {
            if (tabId !== 'reports') {
                if (typeof resetReports === 'function') resetReports();
                let rc = document.getElementById('reportResultContainer');
                if (rc) rc.innerHTML = "<div style='padding: 40px; text-align:center; color:var(--text-muted); font-size:14px;'>Apply filters and click Generate to see the report.</div>";
            }
            if (tabId === 'dashboard') {
                if (typeof currentViewMode !== 'undefined' && currentViewMode === 'board' && typeof renderKanban === 'function') {
                    renderKanban(); 
                }
            }
        } catch (dataError) {
            console.error("Data Load Error: ", dataError);
        }
    }, 50);
}

function openModal(mode, index = null, sheetRowIdx = null) {
    let modal = document.getElementById('clientModal');
    if (modal) {
        modal.style.display = 'flex';
    }

    try {
        currentModalMode = mode; 
        activeRowIndex = sheetRowIdx;

        let btn = document.getElementById('btnSaveClient');
        if (btn) {
            btn.classList.remove('fly-away'); 
            btn.innerHTML = "<i class='fa fa-save' id='btnSaveIcon'></i> <span>SAVE CLIENT</span>";
        }

        let mAssigned = document.getElementById('m-assigned');
        let userRole = (typeof currentRole !== 'undefined' && currentRole) ? currentRole.toLowerCase() : '';
        
        if (mAssigned) {
            mAssigned.disabled = (userRole !== 'admin');
        }

        if (typeof renderStageDropdown === 'function') {
            renderStageDropdown();
        }

        if (mode === 'add') {
            document.getElementById('m-name').value = '';
            document.getElementById('m-mobile').value = '';
            document.getElementById('m-email').value = '';
            document.getElementById('m-address').value = '';
            document.getElementById('m-url').value = '';
            document.getElementById('m-uid').value = '';
            document.getElementById('m-pass').value = '';
            document.getElementById('m-doc').value = '';
            document.getElementById('m-assigned').value = (typeof currentUserIdDb !== 'undefined') ? currentUserIdDb : '';
            document.getElementById('m-stage').value = '';
            document.getElementById('m-create-date').value = typeof getTodayStr === 'function' ? getTodayStr() : '';
            document.getElementById('m-remarks').value = '';
        } else {
            let r = (typeof globalClientData !== 'undefined' && globalClientData[index]) ? globalClientData[index] : {};
            document.getElementById('m-name').value = r.client_name || '';
            document.getElementById('m-mobile').value = r.mobile || '';
            document.getElementById('m-email').value = (r.email) ? r.email : '';
            document.getElementById('m-address').value = (r.address) ? r.address : '';
            document.getElementById('m-url').value = r.login_url || '';
            document.getElementById('m-uid').value = String(r.user_id || '').replace(/^'/, '');
            document.getElementById('m-pass').value = String(r.password || '').replace(/^'/, '');
            document.getElementById('m-doc').value = r.document || '';
            document.getElementById('m-assigned').value = r.assigned_user_id || '';
            document.getElementById('m-create-date').value = String(r.created_date || '').replace(/^'/, '') || (typeof getTodayStr === 'function' ? getTodayStr() : '');
            document.getElementById('m-remarks').value = r.remarks || '';
            document.getElementById('m-stage').value = r.stage_id || '';
        }
    } catch (e) {
        console.error("openModal Execution Error: ", e);
    }
}

function closeModal() { document.getElementById('clientModal').style.display = 'none'; } 
function openPreview(url) { document.getElementById('previewFrame').src = url; document.getElementById('previewModal').style.display = 'flex'; }
function processBase64(file) { let r = new FileReader(); r.onload = function(e) { uploadedBase64 = e.target.result.split(',')[1]; uploadedFileName = file.name; uploadedMimeType = file.type; document.getElementById('uploadText').innerHTML = `<b style='color:#3b82f6;'>${uploadedFileName} Ready!</b>`; }; r.readAsDataURL(file); } 
function handleFileUpload(e) { if(e.target.files[0]) processBase64(e.target.files[0]); } 
document.getElementById('dropZone').addEventListener('paste', function(e) { let items = (e.clipboardData || e.originalEvent.clipboardData).items; for (let i in items) { if (items[i].kind === 'file') { processBase64(items[i].getAsFile()); break; } } }); 
function resetModalForm() { document.querySelectorAll('.form-group input').forEach(inp => { if(inp.id !== 'm-assigned' && inp.id !== 'm-create-date') inp.value = ''; }); document.getElementById('m-stage').value = ''; document.getElementById('m-assigned').value = currentUserIdDb; document.getElementById('m-create-date').value = getTodayStr(); document.getElementById('m-remarks').value = ''; uploadedBase64 = ""; document.getElementById('m-file').value = ""; document.getElementById('uploadText').innerText = "Click or Ctrl+V to paste Image"; }

// --- BULK UPLOAD FUNCTIONS ---
let parsedBulkData = [];

function openBulkModal() {
    document.getElementById('bulkUploadZone').style.display = 'block';
    document.getElementById('bulkPreviewZone').style.display = 'none';
    document.getElementById('btnConfirmBulk').style.display = 'none';
    document.getElementById('csvFileInput').value = '';
    parsedBulkData = [];
    document.getElementById('bulkModal').style.display = 'flex';
}

function closeBulkModal() {
    document.getElementById('bulkModal').style.display = 'none';
}

function downloadCSVTemplate() {
    let csv = "Client Name,Mobile,Email,Address,Client Stage,Portal Login URL,Login User ID,Login Password,Assigned Person,Created Date (YYYY-MM-DD),Remarks\nExample Corp,+8801700000000,test@example.com,Dhaka,Live,https://portal.com,user123,pass123,Emtiaj Ahamed,"+getTodayStr()+",Good Client";
    let link = document.createElement("a"); link.download = "CMT_Bulk_Template.csv"; link.href = window.URL.createObjectURL(new Blob([csv], {type: "text/csv"})); document.body.appendChild(link); link.click(); link.remove();
}

function parseCSVData(text) {
    let p = '', row = [''], ret = [row], i = 0, r = 0, s = !0, l;
    for (l of text) {
        if ('"' === l) {
            if (s && l === p) row[i] += l;
            s = !s;
        } else if (',' === l && s) l = row[++i] = '';
        else if ('\n' === l && s) {
            if ('\r' === p) row[i] = row[i].slice(0, -1);
            row = ret[++r] = [l = '']; i = 0;
        } else row[i] += l;
        p = l;
    }
    return ret.filter(r => r.join('').trim() !== '');
}

async function handleCSVPreview(e) {
    let file = e.target.files[0];
    if(!file) return;
    
    showLoader("Checking Database...");
    let { data: allDbClients } = await _supabase.from('client').select('clientid, clientname, isactive');
    hideLoader();

    let reader = new FileReader();
    reader.onload = function(evt) {
        let rows = parseCSVData(evt.target.result);
        if(rows.length < 2) return showToast("CSV file is empty!", "error");
        
        parsedBulkData = [];
        let duplicateCount = 0, readyCount = 0, html = '';
        
        for(let i=1; i<rows.length; i++) {
            let cols = rows[i];
            let name = (cols[0] || '').trim();
            if(!name) continue; 
            
            let mobile = (cols[1] || '').trim(), email = (cols[2] || '').trim(), address = (cols[3] || '').trim();
            let stageStr = (cols[4] || 'Lead').trim(), url = (cols[5] || '').trim(), uid = (cols[6] || '').trim();
            let pass = (cols[7] || '').trim(), assignStr = (cols[8] || '').trim(), cDate = (cols[9] || getTodayStr()).trim();
            let remarks = (cols[10] || '').trim();
            
            let dbRecord = (allDbClients || []).find(c => (c.clientname||'').toLowerCase() === name.toLowerCase());
            
            let isDuplicate = false;
            let isReactivate = false;
            let nameBadge = '';

            if (dbRecord) {
                if (dbRecord.isactive === 1) {
                    isDuplicate = true;
                    nameBadge = `<span style="margin-left:8px; font-size:10px; font-weight:700; color:#ef4444; background:rgba(239,68,68,0.15); padding:3px 8px; border-radius:12px;">Duplicate</span>`;
                    duplicateCount++;
                } else {
                    isReactivate = true;
                    nameBadge = `<span style="margin-left:8px; font-size:10px; font-weight:700; color:#3b82f6; background:rgba(59,130,246,0.15); padding:3px 8px; border-radius:12px;">Re-Activate</span>`;
                    readyCount++;
                }
            } else {
                nameBadge = `<span style="margin-left:8px; font-size:10px; font-weight:700; color:#10b981; background:rgba(16,185,129,0.15); padding:3px 8px; border-radius:12px;">New</span>`;
                readyCount++;
            }

            parsedBulkData.push({ name, mobile, email, address, stageStr, url, uid, pass, assignStr, cDate, remarks, isDuplicate, isReactivate, dbClientId: dbRecord ? dbRecord.clientid : null });

            html += `<tr style='border-bottom:1px solid var(--border-input);'>
                <td style='padding:12px; font-weight:600;'>${name} ${nameBadge}</td>
                <td style='padding:12px;'>${mobile}</td>
                <td style='padding:12px;'>${email}</td>
                <td style='padding:12px;'>${address}</td>
                <td style='padding:12px;'>${stageStr}</td>
                <td style='padding:12px;'>${url}</td>
                <td style='padding:12px;'>${uid}</td>
                <td style='padding:12px;'>${pass}</td>
                <td style='padding:12px;'>${assignStr}</td>
                <td style='padding:12px;'>${cDate}</td>
                <td style='padding:12px;'>${remarks}</td>
            </tr>`;
        }
        
        document.getElementById('bulkPreviewBody').innerHTML = html;
        document.getElementById('bulkSummary').innerHTML = `<i class='fa fa-info-circle'></i> Ready to Save: ${readyCount} | Duplicates Detected: ${duplicateCount}`;
        document.getElementById('bulkUploadZone').style.display = 'none';
        document.getElementById('bulkPreviewZone').style.display = 'block';
        
        if(readyCount > 0) document.getElementById('btnConfirmBulk').style.display = 'inline-flex';
        else document.getElementById('btnConfirmBulk').style.display = 'none';
    };
    reader.readAsText(file);
}

function formatSmartDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') return getTodayStr();
    let str = dateStr.trim().replace(/[\/\.]/g, '-');
    let parts = str.split('-');
    if (parts.length === 3) {
        let p1 = parts[0], p2 = parts[1], p3 = parts[2];
        if (p1.length === 4) return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
        let year = p3.length === 2 ? `20${p3}` : p3;
        let month = p2.padStart(2, '0');
        let day = p1.padStart(2, '0');
        if (parseInt(month) > 12) { let t = month; month = day; day = t; } 
        if (parseInt(month) > 12 || parseInt(month) < 1) return getTodayStr();
        return `${year}-${month}-${day}`;
    }
    return getTodayStr(); 
}

async function confirmBulkUpload() {
    let readyData = parsedBulkData.filter(d => !d.isDuplicate);
    if(readyData.length === 0) return showToast("No valid data to save!", "error");
    
    showLoader(`Smart Saving ${readyData.length} records...`);
    let ip = currentUserIP || await getClientIP();

    let { data: dbStages } = await _supabase.from('clientstages').select('*');
    let { data: dbUsers } = await _supabase.from('users').select('*');

    let uniqueCsvStages = [...new Set(readyData.map(d => (d.stageStr || 'Uncategorized').trim()))];
    let missingStages = [];
    
    for (let st of uniqueCsvStages) {
        let exists = (dbStages || []).find(s => (s.stagename||'').trim().toLowerCase() === st.toLowerCase());
        if (!exists && st !== '') {
            missingStages.push({ stagename: st, isactive: 1 });
        }
    }
    
    if (missingStages.length > 0) {
        let { data: newStages, error: stageErr } = await _supabase.from('clientstages').insert(missingStages).select();
        if (newStages && !stageErr) {
            dbStages = [...(dbStages || []), ...newStages];
        } else {
            console.warn("Could not auto-insert new stages:", stageErr);
        }
    }

    let newClientsToInsert = [];
    let reactivateClients = [];

    for (let data of readyData) {
        if (data.isReactivate && data.dbClientId) {
            reactivateClients.push(data);
        } else {
            newClientsToInsert.push({
                clientname: data.name.trim(),
                mobilenumber: data.mobile,
                email: data.email,
                address: data.address,
                createdby: currentUserIdDb,
                actiondate: new Date().toISOString(),
                ipaddress: ip,
                isactive: 1
            });
        }
    }

    for(let data of reactivateClients) {
        await _supabase.from('client').update({
            mobilenumber: data.mobile, email: data.email, address: data.address,
            isactive: 1, actiondate: new Date().toISOString()
        }).eq('clientid', data.dbClientId);
    }

    let insertedNames = [];
    if (newClientsToInsert.length > 0) {
        let { error: insErr } = await _supabase.from('client').insert(newClientsToInsert);
        if (insErr) {
            hideLoader();
            console.error("Client Insert Error:", insErr);
            return showToast("Database error while saving basic client data!", "error");
        }
        insertedNames = newClientsToInsert.map(c => c.clientname);
    }

    let { data: activeClients, error: fetchErr } = await _supabase
        .from('client')
        .select('clientid, clientname')
        .eq('isactive', 1);

    if (fetchErr || !activeClients) {
        hideLoader();
        return showToast("Error mapping client IDs!", "error");
    }

    let cmPayload = [];
    for (let data of readyData) {
        let cNameTarget = data.name.trim().toLowerCase();
        let dbMatch = activeClients.find(c => (c.clientname || '').trim().toLowerCase() === cNameTarget);

        if (dbMatch && dbMatch.clientid) {
            
            let stageId = 1; 
            if(dbStages) {
                let targetStage = (data.stageStr || '').trim().replace(/\s+/g, ' ').toLowerCase();
                let foundStage = dbStages.find(s => {
                    let dbStageName = (s.stagename || '').trim().replace(/\s+/g, ' ').toLowerCase();
                    return dbStageName === targetStage;
                });
                
                if(!foundStage) {
                    foundStage = dbStages.find(s => (s.stagename || '').toLowerCase().includes(targetStage.split(' ')[0]));
                }
                
                if(foundStage) stageId = foundStage.stageid;
            }
            
            let assignId = currentUserIdDb; 
            if(dbUsers && data.assignStr) {
                let foundUser = dbUsers.find(u => (u.username||'').trim().toLowerCase() === (data.assignStr||'').trim().toLowerCase());
                if(foundUser) assignId = foundUser.userid;
            }

            cmPayload.push({
                clientid: dbMatch.clientid,
                stageid: stageId,
                assigneduserid: assignId,
                clientportalurl: data.url,
                portalloginid: data.uid,
                portalpassword: data.pass,
                remarks: data.remarks,
                isactive: 1,
                createdate: formatSmartDate(data.cDate), 
                actiondate: new Date().toISOString(),
                createdby: currentUserIdDb
            });
        }
    }

    if(cmPayload.length > 0) {
        let { error: cmErr } = await _supabase.from('clientmanage').insert(cmPayload);
        
        if (cmErr) {
            console.error("ClientManage Insert Error:", cmErr);
            
            if (insertedNames.length > 0) {
                await _supabase.from('client').delete().in('clientname', insertedNames);
            }
            for(let data of reactivateClients) {
                await _supabase.from('client').update({isactive: 0}).eq('clientid', data.dbClientId);
            }

            hideLoader();
            return showToast(`Save failed due to data error. Completely Rolled Back!`, "error");
        }
    }

    hideLoader();
    closeBulkModal();
    showToast(`Success! ${cmPayload.length} clients perfectly saved.`, "success");
    fetchData(); 
}

async function deleteClient(sheetRowIdx) {
    let result = await Swal.fire({
        title: "Are you sure?",
        text: "You want to completely hide/delete this client from the system?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, delete it!"
    });

    if (result.isConfirmed) {
        showLoader("Deleting Record...");
        
        let { data: cmData } = await _supabase.from('clientmanage').select('clientid').eq('clientmanageid', sheetRowIdx);
        let actualClientId = (cmData && cmData.length > 0) ? cmData[0].clientid : null;

        await _supabase.from('clientmanage').update({isactive: -1}).eq('clientmanageid', sheetRowIdx);
        if(actualClientId) {
            await _supabase.from('client').update({isactive: -1}).eq('clientid', actualClientId);
        }
        
        fetchData(); 
        hideLoader();
        Swal.fire("Deleted!", "Client has been removed from the view.", "success");
    }
}

// --- SYSTEM USERS CONFIG ---
let uModalMode = 'add', uActiveRow = null; 

async function fetchUsers() { 
    const { data, error } = await _supabase.from('users').select('*').order('createdate', { ascending: false });
    if(!error && data) { 
        globalUserData = data; 
        renderUsers(); 
        if(currentRole.toLowerCase() === 'admin') renderAdminDashboard();
    } 
}

function renderUsers() { 
    let data = globalUserData; 
    let html = '<table style="min-width: 1500px;"><thead><tr><th>Created Date</th><th>LoginID</th><th>Password</th><th>Name</th><th>Designation</th><th>Department</th><th>Organization</th><th>Mobile</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>'; 
    for(let i=0; i<data.length; i++) { 
        let r = data[i];
        let rIdx = r.userid; let cDate = r.createdate ? formatDateBD(r.createdate) : 'N/A'; 
        let statText = r.isactive === 1 ? 'Active' : 'Inactive';
        html += `<tr><td><span style="font-size:13px; color:var(--text-muted); font-weight:500;">${cDate}</span></td><td><b>${r.loginid}</b></td><td><span class="pwd-mask" data-pwd="${r.password}">••••••••</span> <i class="fa fa-eye toggle-table-pwd" style="cursor:pointer; color:var(--text-muted); margin-left:5px; font-size:12px;" onclick="toggleTablePwd(this)"></i></td><td>${r.username}</td><td>${r.designation||'-'}</td><td>${r.department||'-'}</td><td>${r.organization||'-'}</td><td>${r.mobilenumber||'-'}</td><td>${r.email||'-'}</td><td><span class="user-role">${r.role}</span></td><td>${statText}</td><td style="min-width: 130px;"><i class="fa fa-eye action-icon view-icon" title="View Profile" onclick="openUserViewModal(${i})"></i><i class="fa fa-edit action-icon edit-icon" title="Edit" onclick="openUserModal('edit', ${i}, '${rIdx}')"></i><i class="fa fa-trash action-icon delete-icon" title="Delete" onclick="deleteUser('${rIdx}')"></i></td></tr>`; 
    } html += '</tbody></table>'; 
    document.getElementById('userTableContainer').innerHTML = html; 
}

function handleUserPicUpload(e) {
    let file = e.target.files[0]; if(!file) return; 
    let reader = new FileReader(); 
    reader.onload = function(evt) { 
        let img = new Image(); 
        img.onload = function() { 
            let canvas = document.createElement('canvas'); 
            let ctx = canvas.getContext('2d'); 
            let maxW = 300, maxH = 300; let w = img.width, h = img.height; 
            if(w > maxW) { h *= maxW/w; w = maxW; } 
            if(h > maxH) { w *= maxH/h; h = maxH; } 
            canvas.width = w; canvas.height = h; 
            ctx.drawImage(img, 0, 0, w, h); 
            uUploadedBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]; 
            uUploadedMimeType = 'image/jpeg'; 
            document.getElementById("uUploadText").innerHTML = "Photo Ready!";
            showToast("Profile Picture Attached!", "success");
        }; 
        img.src = evt.target.result; 
    }; 
    reader.readAsDataURL(file); 
}

function openUserModal(mode, idx=null, rIdx=null) { 
    uModalMode = mode; uActiveRow = rIdx; 
    uUploadedBase64 = ""; uUploadedMimeType = "";
    document.getElementById("uUploadText").innerHTML = "Upload Photo";
    
    renderCustomFields(); 
    
    if(mode === 'add') {
        document.getElementById('u-user').value=''; 
        document.getElementById('u-pass').value=''; 
        document.getElementById('u-pass-confirm').value=''; 
        document.getElementById('u-name').value=''; 
        document.getElementById('u-email').value=''; 
        document.getElementById('u-mobile').value=''; 
        document.getElementById('u-designation').value=''; 
        document.getElementById('u-department').value=''; 
        document.getElementById('u-organization').value=''; 
        document.getElementById('u-address').value=''; 
        document.getElementById('u-create-date').value = getTodayStr(); 
        document.getElementById('u-pic').value = '';
        document.getElementById('u-status').value = 'Active';
        
        let pinEl = document.getElementById('u-pin');
        if(pinEl) pinEl.value = '';

   } else { 
        let r = globalUserData[idx]; 
        
        if(r.designation && !savedDesignations.includes(r.designation)) { savedDesignations.push(r.designation); localStorage.setItem('cmt_designations', JSON.stringify(savedDesignations)); }
        if(r.department && !savedDepartments.includes(r.department)) { savedDepartments.push(r.department); localStorage.setItem('cmt_departments', JSON.stringify(savedDepartments)); }
        if(r.organization && !savedOrganizations.includes(r.organization)) { savedOrganizations.push(r.organization); localStorage.setItem('cmt_organizations', JSON.stringify(savedOrganizations)); }
        
        renderCustomFields(); 
        
        document.getElementById('u-user').value = r.loginid || '';
        document.getElementById('u-pass').value = r.password || ''; 
        document.getElementById('u-pass-confirm').value = r.password || ''; 
        document.getElementById('u-name').value = r.username || ''; 
        document.getElementById('u-role').value = r.role || 'User'; 
        document.getElementById('u-status').value = r.isactive === 1 ? 'Active' : 'Inactive'; 
        
        // --- DATE FORMAT FIX ---
        // Splits the database ISO string at 'T' to extract strictly the YYYY-MM-DD part
        let cDateVal = r.createdate ? String(r.createdate).split('T')[0] : getTodayStr();
        document.getElementById('u-create-date').value = cDateVal; 
        
        document.getElementById('u-email').value = r.email || '';
        document.getElementById('u-mobile').value = r.mobilenumber || '';
        document.getElementById('u-designation').value = r.designation || '';
        document.getElementById('u-department').value = r.department || '';
        document.getElementById('u-organization').value = r.organization || '';
        document.getElementById('u-address').value = r.address || '';
        
        // --- BIND OTP TO EDIT MODE ---
        let pinEl = document.getElementById('u-pin');
        if(pinEl) pinEl.value = r.otp || '';
    } 
    document.getElementById('userModal').style.display='flex'; 
}

function closeUserModal() { document.getElementById('userModal').style.display='none'; }

function toggleUserPwd(id, icon) {
    let input = document.getElementById(id);
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa fa-eye-slash pwd-toggle';
    } else {
        input.type = 'password';
        icon.className = 'fa fa-eye pwd-toggle';
    }
}

let savedDesignations = JSON.parse(localStorage.getItem('cmt_designations')) || ['Manager', 'Executive', 'Analyst'];
let savedDepartments = JSON.parse(localStorage.getItem('cmt_departments')) || ['IT', 'Sales', 'HR'];
let savedOrganizations = JSON.parse(localStorage.getItem('cmt_organizations')) || ['CMT', 'Default Org'];

function renderCustomFields() {
    let desHtml = '<option value="">Select Designation...</option>'; savedDesignations.forEach(d => desHtml += `<option value="${d}">${d}</option>`);
    let depHtml = '<option value="">Select Department...</option>'; savedDepartments.forEach(d => depHtml += `<option value="${d}">${d}</option>`);
    let orgHtml = '<option value="">Select Organization...</option>'; savedOrganizations.forEach(d => orgHtml += `<option value="${d}">${d}</option>`);
    
    let elDes = document.getElementById('u-designation'); if(elDes) elDes.innerHTML = desHtml;
    let elDep = document.getElementById('u-department'); if(elDep) elDep.innerHTML = depHtml;
    let elOrg = document.getElementById('u-organization'); if(elOrg) elOrg.innerHTML = orgHtml;
}

function addCustomField(type) {
    let val = prompt(`Enter new ${type} name:`);
    if(!val || val.trim() === '') return;
    val = val.trim();
    
    if(type === 'designation') { if(!savedDesignations.includes(val)) savedDesignations.push(val); localStorage.setItem('cmt_designations', JSON.stringify(savedDesignations)); }
    else if(type === 'department') { if(!savedDepartments.includes(val)) savedDepartments.push(val); localStorage.setItem('cmt_departments', JSON.stringify(savedDepartments)); }
    else if(type === 'organization') { if(!savedOrganizations.includes(val)) savedOrganizations.push(val); localStorage.setItem('cmt_organizations', JSON.stringify(savedOrganizations)); }
    
    renderCustomFields();
    document.getElementById(`u-${type}`).value = val;
    showToast("Added Successfully!", "success");
}

async function saveSystemUser() { 
    let loginId = document.getElementById('u-user').value.trim();
    let userName = document.getElementById('u-name').value.trim();
    let pass = document.getElementById('u-pass').value;
    let passConfirm = document.getElementById('u-pass-confirm').value;
    let role = document.getElementById('u-role').value;
    let createDate = document.getElementById('u-create-date').value;
    
    if(!loginId || !userName || !pass || !role || !createDate) {
        return showToast("Please fill all mandatory (*) fields!", "error");
    }
    
    if(pass !== passConfirm) return showToast("Passwords do not match!", "error");

    showLoader("Updating Users...");
    closeUserModal(); 
    
    let ip = currentUserIP || await getClientIP();
    
    let d = {
        loginid: loginId, 
        password: pass, 
        username: userName, 
        role: role, 
        isactive: document.getElementById('u-status').value === 'Active' ? 1 : 0, 
        createdate: createDate, 
        email: document.getElementById('u-email').value, 
        mobilenumber: document.getElementById('u-mobile').value,
        designation: document.getElementById('u-designation').value,
        department: document.getElementById('u-department').value,
        organization: document.getElementById('u-organization').value,
        address: document.getElementById('u-address').value,
        otp: document.getElementById('u-pin').value.trim(), // Ekhane notun field ta add kora hoyeche
        actiondate: new Date().toISOString(), 
        ipaddress: ip, 
        updatedby: currentUserIdDb
    };
    
    if(uUploadedBase64 !== "") {
        d.profilepic = 'data:' + uUploadedMimeType + ';base64,' + uUploadedBase64;
    }

    let resErr;
    if(uModalMode === 'edit') {
        const { error } = await _supabase.from('users').update(d).eq('userid', uActiveRow);
        resErr = error;
    } else {
        d.createdby = currentUserIdDb;
        const { error } = await _supabase.from('users').insert([d]);
        resErr = error;
    }

    hideLoader(); 
    if(resErr) { 
        showToast(resErr.message, "error"); 
    } else { 
        showToast("User Updated", "success"); 
        fetchUsersForDropdown();
        fetchUsers(); 
    }
}

async function deleteUser(id) {
    let result = await Swal.fire({
        title: "Are you sure?",
        text: "You want to deactivate and remove this user from the system?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444", 
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, delete user!"
    });

    if (result.isConfirmed) {
        showLoader("Processing...");
        const { error } = await _supabase.from('users').update({isactive: 0}).eq('userid', id);
        hideLoader();
        
        if (error) {
            Swal.fire("Error!", error.message, "error");
        } else {
            fetchUsers(); 
            Swal.fire("Deleted!", "User has been removed successfully.", "success");
        }
    }
}

// --- REPORTS ---
function resetReports() { 
    document.getElementById('repFilterAssigned').value = ''; 
    document.getElementById('repFilterName').value = ''; 
    document.getElementById('repFilterStage').value = ''; 
    document.getElementById('repFilterStatus').value = ''; 
    document.getElementById('repStartDate').value = getFirstDayStr(); 
    document.getElementById('repEndDate').value = getTodayStr(); 
}

function generateReport() { 
    let fAssign = document.getElementById('repFilterAssigned').value; 
    let fName = document.getElementById('repFilterName').value; 
    let fStage = document.getElementById('repFilterStage').value; 
    let fStart = document.getElementById('repStartDate').value; 
    let fEnd = document.getElementById('repEndDate').value; 
    let fStatus = document.getElementById('repFilterStatus').value; 
    let data = globalClientData;

    let count = 0; let sl = 1; let printData = []; 
    let html = '<table><thead><tr><th>Date Added</th><th>Client Name</th><th>Mobile</th><th>Email</th><th>Address</th><th>Stage</th><th>URL</th><th>User ID</th><th>Password</th><th>Assigned Person</th><th>Remarks</th></tr></thead><tbody>'; 
    
    for(let i=0; i<data.length; i++) { 
        let r = data[i];
        let rName = r.client_name || ''; 
        let rMobile = r.mobile || ''; 
        let rEmail = r.client ? (r.client.email || '') : ''; 
        let rAddress = r.client ? (r.client.address || '') : ''; 
        let rStage = r.stage || ''; let rURL = r.login_url || ''; let rID = String(r.user_id || '').replace(/^'/, ''); let rPass = String(r.password || '').replace(/^'/, ''); let rAssign = r.assigned_person || ''; 
        
        let rawDate = String(r.created_date || '').replace(/^'/, ''); 
        let pureDate = rawDate.split('T')[0];
        let rDateForm = formatDateBD(rawDate); 
        let rStatus = r.status || 'Active'; 
        let rRemarks = r.remarks || ''; 
        
        let dateOk = true; 
        if(fStart && pureDate) { if(pureDate < fStart) dateOk = false; } 
        if(fEnd && pureDate) { if(pureDate > fEnd) dateOk = false; } 
        
        if( (fAssign === '' || rAssign === fAssign) && (fName === '' || rName === fName) && (fStage === '' || rStage === fStage) && (fStatus === '' || rStatus === fStatus) && dateOk ) { 
            html += `<tr><td><span style="color:var(--text-muted); font-size:13px;">${rDateForm}</span></td><td><b>${rName}</b></td><td>${rMobile}</td><td>${rEmail}</td><td>${rAddress}</td><td>${getStageBadge(rStage)}</td><td>${rURL}</td><td>${rID}</td><td><span class="pwd-mask" data-pwd="${rPass}">••••••••</span> <i class="fa fa-eye toggle-table-pwd" style="cursor:pointer; color:var(--text-muted); margin-left:5px; font-size:12px;" onclick="toggleTablePwd(this)"></i></td><td>${rAssign}</td><td>${rRemarks}</td></tr>`; count++; 
            printData.push([sl++, rDateForm, rName, rStage, rRemarks, rStatus]); 
        } 
    } 
    html += '</tbody></table>'; 
    if(count === 0) { 
        document.getElementById('reportResultContainer').innerHTML = "<div style='padding:40px; text-align:center;'>No records found for selected filters.</div>"; 
        document.getElementById('printRealTableBody').innerHTML = ""; 
    } else { 
        let header = `<div style="padding:15px; background:rgba(59,130,246,0.1); color:var(--text-title); font-weight:600; border-bottom:2px solid #3b82f6;">Total Matches Found: ${count}</div>`; 
        document.getElementById('reportResultContainer').innerHTML = header + html; 
        document.getElementById('printRealTableBody').setAttribute('data-print', JSON.stringify(printData)); 
        addNotification('Report Ready', `Generated report with ${count} clients.`, 'fa-file-contract', '#3b82f6'); 
    } 
}

function getPrintHTML(isEmail = false) { 
    let printDataStr = document.getElementById('printRealTableBody').getAttribute('data-print'); 
    if(!printDataStr) return ""; 
    let data = JSON.parse(printDataStr); 
    let sDate = document.getElementById('repStartDate').value; 
    let eDate = document.getElementById('repEndDate').value; 
    let rangeText = "All Time"; 
    if(sDate && eDate) rangeText = `${formatDateBD(sDate)} to ${formatDateBD(eDate)}`; 
    else if(sDate) rangeText = `From ${formatDateBD(sDate)}`; 
    else if(eDate) rangeText = `Until ${formatDateBD(eDate)}`; 
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { font-family: sans-serif; color: #000; padding:20px; } table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; } th, td { border: 1px solid #000; padding: 10px; text-align: left; } th { background-color: #f1f1f1; -webkit-print-color-adjust: exact; color-adjust: exact; font-size:14px;}</style></head><body><div style="text-align:center; padding-bottom:10px; border-bottom:2px solid #000; margin-bottom:20px;"><h1 style="margin:0; font-size:28px;">E-Mahajon CMT</h1><h2 style="margin:5px 0;">CMT Client Report</h2><p style="margin:0; font-size:14px;">Date Range: ${rangeText} | Location: Dhaka, Bangladesh<br>Web: cmt.com.bd | Email: cmt@gmail.com</p></div><table><thead><tr><th>SL No</th><th>Created Date</th><th>Client Name</th><th>Stage</th><th>Remarks</th><th>Client Status</th></tr></thead><tbody>`; 
    data.forEach(r => { html += `<tr><td style="text-align:center;">${r[0]}</td><td>${r[1]}</td><td><b>${r[2]}</b></td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td></tr>`; }); 
    html += `</tbody></table><div style="display:table; width:100%; margin-top:80px; font-weight:bold; font-size:15px; page-break-inside: avoid;"><div style="display:table-cell; text-align:left; vertical-align:bottom;"><div style="margin-bottom:5px;">${currentName}</div><div style="border-top:1px solid #000; padding-top:5px; width:200px;">Authorized Signature</div></div><div style="display:table-cell; text-align:right; vertical-align:bottom;"><div style="margin-bottom:5px;">&nbsp;</div><div style="border-top:1px solid #000; padding-top:5px; width:200px; display:inline-block; text-align:left;">Receiver's Signature</div></div></div></body></html>`; 
    return html; 
}

function printReport() { 
    let html = getPrintHTML(); 
    if(html === '') return showToast("Generate report first to print.", "warning"); 
    let printWindow = window.open('', '_blank'); 
    printWindow.document.write(html); 
    printWindow.document.close(); 
    printWindow.focus(); 
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500); 
}

function exportExcel() { 
    let data = globalClientData; 
    if(data.length <= 0) return showToast("No data to export", "warning"); 
    let wb = XLSX.utils.book_new(); 
    let ws_data = [["Date Added", "Client Name", "Stage", "URL", "User ID", "Password", "Document", "Assigned", "Status", "Remarks"]]; 
    for(let i=0; i<data.length; i++) { 
        let r = data[i]; 
        ws_data.push([r.created_date, r.client_name, r.stage, r.login_url, r.user_id, r.password, r.document, r.assigned_person, r.status||'Active', r.remarks||'']); 
    } 
    let ws = XLSX.utils.aoa_to_sheet(ws_data); 
    XLSX.utils.book_append_sheet(wb, ws, "Clients"); 
    XLSX.writeFile(wb, "CMT_Client_Backup.xlsx"); 
    addNotification('Backup Downloaded', 'Excel database backup created.', 'fa-file-excel', '#10b981'); 
}

function exportCSV() { 
    let table = document.querySelector("#reportResultContainer table"); 
    if(!table) return showToast("Please generate a report first.", "warning"); 
    let csv = []; 
    for(let i=0; i<table.rows.length; i++) { 
        let row = [], cols = table.rows[i].querySelectorAll("td, th"); 
        for(let j=0; j<cols.length; j++) { 
            let val = cols[j].querySelector('.pwd-mask') ? cols[j].querySelector('.pwd-mask').getAttribute('data-pwd') : cols[j].innerText; 
            row.push('"' + val.replace(/"/g, '""') + '"'); 
        } 
        csv.push(row.join(",")); 
    } 
    let downloadLink = document.createElement("a"); 
    downloadLink.download = "CMT_Report_" + Date.now() + ".csv"; 
    downloadLink.href = window.URL.createObjectURL(new Blob([csv.join("\n")], {type: "text/csv"})); 
    downloadLink.style.display = "none"; 
    document.body.appendChild(downloadLink); 
    downloadLink.click(); 
}

function renderTeamActivity() { 
    let data = globalClientData; let counts = {}; let total = data.length; 
    for(let i=0; i<data.length; i++) { 
        let owner = data[i].assigned_person || 'Unassigned'; 
        counts[owner] = (counts[owner] || 0) + 1; 
    } 
    let html = ''; 
    for(let user in counts) { 
        let pct = total > 0 ? Math.round((counts[user] / total) * 100) : 0; 
        html += `<div class="dash-card" style="display: flex; align-items: center; gap: 20px; border-top: 3px solid #3b82f6;"><div style="width: 55px; height: 55px; background: rgba(59,130,246,0.1); color: #3b82f6; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 24px; font-weight: bold; border: 2px solid rgba(59,130,246,0.2);"><i class="fa fa-user-tie"></i></div><div style="flex: 1; z-index:2;"><h4 style="margin: 0 0 8px 0; color: var(--text-title); font-size: 15px; display: flex; justify-content: space-between;">${user} <span style="font-size:13px; color:#10b981; font-weight:700;">${counts[user]} Clients</span></h4><div style="width: 100%; background: var(--border-input); height: 8px; border-radius: 4px; overflow: hidden;"><div style="background: linear-gradient(90deg, #3b82f6, #10b981); height: 100%; border-radius: 4px; width: ${pct}%"></div></div></div></div>`; 
    } 
    document.getElementById('teamActivityContainer').innerHTML = html || "<p>No activity found.</p>"; 
}

function copyText(id) { navigator.clipboard.writeText(document.getElementById(id).innerText); showToast("Copied to Clipboard!"); }

// --- LOGIN SCREEN LAMP & MASCOT (HELPER) LOGIC ---
let helperBusy = false;

function toggleLamp() { 
    initAudio();
    const cord = document.getElementById('lampCord'); 
    const loginScreen = document.getElementById('loginScreen'); 
    
    playSound('click'); 
    cord.classList.add('pulled'); 
    setTimeout(() => { cord.classList.remove('pulled'); }, 200); 
    
    loginScreen.classList.toggle('lamp-on'); 
    if (loginScreen.classList.contains('lamp-on')) { 
        setTimeout(() => { playSound('flicker'); }, 100); 
        if (window.innerWidth > 768) {
            setTimeout(() => { document.getElementById('user').focus(); }, 800); 
        }
    } 
}

// ============================================================
// CMT PROFESSIONAL AI HELPER SYSTEM
// Touch → AI Response → Mascot → Remote → Lamp → Status
// ============================================================

function askHelper() {

    initAudio();

    // Prevent double click / multiple activation
    if (helperBusy) return;

    helperBusy = true;

    // --------------------------------------------------------
    // DOM ELEMENTS
    // --------------------------------------------------------

    const helper = document.getElementById('helperPerson');
    const cssMan = document.getElementById('cssMan');
    const speech = document.getElementById('helperSpeech');
    const loginScreen = document.getElementById('loginScreen');

    if (!helper || !cssMan || !speech || !loginScreen) {
        console.warn('CMT: Required element not found.');
        helperBusy = false;
        return;
    }

    // Current lamp/system state BEFORE toggle
    const isCurrentlyOn =
        loginScreen.classList.contains('lamp-on');


    // --------------------------------------------------------
    // RESET PREVIOUS STATES
    // --------------------------------------------------------

    cssMan.classList.remove(
        'waving',
        'looking-up',
        'salam-pose'
    );

    helper.classList.remove(
        'walking',
        'pointing',
        'cmt-touch-active'
    );

    loginScreen.classList.remove(
        'cmt-energy-pulse',
        'cmt-system-online',
        'cmt-system-standby'
    );


    // --------------------------------------------------------
    // SYSTEM STATUS
    // --------------------------------------------------------

    setCMTStatus(
        isCurrentlyOn
            ? 'SYSTEM ACTIVE'
            : 'SYSTEM STANDBY',
        isCurrentlyOn
            ? 'active'
            : 'standby'
    );


    // --------------------------------------------------------
    // TOUCH RESPONSE
    // --------------------------------------------------------

    helper.classList.add('cmt-touch-active');

    setTimeout(() => {
        helper.classList.remove('cmt-touch-active');
    }, 900);


    // --------------------------------------------------------
    // SPEECH BUBBLE
    // --------------------------------------------------------

    speech.style.opacity = '1';

    speech.innerText = isCurrentlyOn
        ? 'CMT going offline...'
        : 'আসসালামু আলাইকুম, স্যার...';

    cssMan.classList.add('salam-pose');


    // ========================================================
    // VOICE ENGINE
    // ========================================================

    function wait(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        });
    }


    function getVoices() {

        if (!('speechSynthesis' in window)) {
            return [];
        }

        return window.speechSynthesis.getVoices() || [];
    }


    function findVoice(language) {

        const voices = getVoices();

        if (!voices.length) {
            return null;
        }

        const target = language.toLowerCase();
        const prefix = target.split('-')[0];

        // Female / soft voice names commonly available
        const femaleKeywords = [
            'female',
            'zira',
            'samantha',
            'susan',
            'karen',
            'victoria',
            'moira',
            'jenny',
            'aria',
            'sara',
            'hazel',
            'google uk english female',
            'google us english female'
        ];


        // Exact language + female voice
        let voice = voices.find(v => {

            const voiceLang =
                (v.lang || '').toLowerCase();

            const voiceName =
                (v.name || '').toLowerCase();

            return (
                voiceLang === target &&
                femaleKeywords.some(keyword =>
                    voiceName.includes(keyword)
                )
            );
        });

        if (voice) return voice;


        // Same language + female voice
        voice = voices.find(v => {

            const voiceLang =
                (v.lang || '').toLowerCase();

            const voiceName =
                (v.name || '').toLowerCase();

            return (
                voiceLang.startsWith(prefix) &&
                femaleKeywords.some(keyword =>
                    voiceName.includes(keyword)
                )
            );
        });

        if (voice) return voice;


        // Bengali fallback
        if (prefix === 'bn') {

            voice = voices.find(v => {

                const voiceLang =
                    (v.lang || '').toLowerCase();

                return voiceLang.startsWith('bn');
            });

            if (voice) return voice;
        }


        // Exact language fallback
        voice = voices.find(v => {

            const voiceLang =
                (v.lang || '').toLowerCase();

            return voiceLang === target;
        });

        if (voice) return voice;


        // Language prefix fallback
        voice = voices.find(v => {

            const voiceLang =
                (v.lang || '').toLowerCase();

            return voiceLang.startsWith(prefix);
        });

        if (voice) return voice;


        return voices[0] || null;
    }


    function speak(text, language, options = {}) {

        return new Promise(resolve => {

            if (!('speechSynthesis' in window)) {
                resolve();
                return;
            }


            const msg =
                new SpeechSynthesisUtterance(text);


            msg.lang =
                language || 'bn-BD';

            msg.rate =
                options.rate ?? 0.84;

            msg.pitch =
                options.pitch ?? 1.04;

            msg.volume =
                options.volume ?? 1;


            const voice =
                findVoice(language);


            if (voice) {
                msg.voice = voice;
            }


            let completed = false;


            const finish = () => {

                if (completed) return;

                completed = true;

                resolve();
            };


            msg.onend = finish;
            msg.onerror = finish;


            window.speechSynthesis.speak(msg);
        });
    }


    // ========================================================
    // PROFESSIONAL VOICE SEQUENCE
    // ========================================================

    async function playGreeting() {

        if (!('speechSynthesis' in window)) {
            return;
        }


        window.speechSynthesis.cancel();

        await wait(120);


        // ====================================================
        // 🟢 SYSTEM ON
        // ====================================================

        if (!isCurrentlyOn) {

            // -----------------------------------------------
            // SALAM
            // -----------------------------------------------

            speech.innerText =
                'আসসালামু আলাইকুম, স্যার...';

            await speak(
                'আসসালামু আলাইকুম, স্যার।',
                'bn-BD',
                {
                    rate: 0.80,
                    pitch: 1.05
                }
            );


            await wait(350);


            // -----------------------------------------------
            // CMT ONLINE
            // -----------------------------------------------

            speech.innerText =
                'CMT is online.';

            setCMTStatus(
                'INITIALIZING...',
                'processing'
            );

            await speak(
                'CMT is online.',
                'en-US',
                {
                    rate: 0.84,
                    pitch: 1.03
                }
            );


            await wait(280);


            // -----------------------------------------------
            // READY
            // -----------------------------------------------

            speech.innerText =
                'আপনার জন্য সিস্টেম প্রস্তুত।';

            setCMTStatus(
                'SYSTEM READY',
                'active'
            );

            await speak(
                'আপনার জন্য সিস্টেম প্রস্তুত।',
                'bn-BD',
                {
                    rate: 0.82,
                    pitch: 1.05
                }
            );
        }


        // ====================================================
        // 🔴 SYSTEM OFF
        // ====================================================

        else {

            speech.innerText =
                'CMT going offline...';

            setCMTStatus(
                'SHUTTING DOWN...',
                'processing'
            );

            await speak(
                'CMT going offline.',
                'en-US',
                {
                    rate: 0.82,
                    pitch: 1.03
                }
            );


            await wait(300);


            speech.innerText =
                'আবার দেখা হবে, স্যার।';

            await speak(
                'আবার দেখা হবে, স্যার।',
                'bn-BD',
                {
                    rate: 0.82,
                    pitch: 1.05
                }
            );
        }
    }


    // ========================================================
    // START VOICE
    // ========================================================

    async function startVoice() {

        try {

            // Wait for browser voice list
            if (
                'speechSynthesis' in window &&
                getVoices().length === 0
            ) {

                await new Promise(resolve => {

                    let done = false;

                    const finish = () => {

                        if (done) return;

                        done = true;

                        window.speechSynthesis
                            .removeEventListener(
                                'voiceschanged',
                                finish
                            );

                        resolve();
                    };


                    window.speechSynthesis
                        .addEventListener(
                            'voiceschanged',
                            finish
                        );


                    // Safety fallback
                    setTimeout(
                        finish,
                        1000
                    );
                });
            }


            await playGreeting();

        } catch (error) {

            console.warn(
                'CMT Voice Error:',
                error
            );

        } finally {

            // Voice MUST finish before walking
            startHelperMovement();
        }
    }


    // ========================================================
    // START VOICE
    // ========================================================

    startVoice();


    // ========================================================
    // MASCOT MOVEMENT
    // ========================================================

    function startHelperMovement() {

        if (
            helper.dataset.movementStarted === 'true'
        ) {
            return;
        }


        helper.dataset.movementStarted =
            'true';


        // Hide speech bubble
        speech.style.opacity = '0';

        cssMan.classList.remove(
            'salam-pose'
        );


        // Turn toward remote
        cssMan.style.transform =
            'scaleX(-1) scale(1.3)';


        helper.classList.add(
            'walking'
        );


        let stepInterval =
            setInterval(
                () => playSound('step'),
                250
            );


        // Walk to remote
        helper.style.left = '28%';


        // ----------------------------------------------------
        // REACH REMOTE
        // ----------------------------------------------------

        setTimeout(() => {

            clearInterval(stepInterval);

            helper.classList.remove(
                'walking'
            );


            cssMan.classList.add(
                'looking-up'
            );

            helper.classList.add(
                'pointing'
            );


            // Small thinking pause
            setTimeout(() => {

                const led =
                    document.querySelector(
                        '.remote .led'
                    );


                // Remote LED
                if (led) {

                    led.classList.add(
                        'flash'
                    );
                }


                // Remote click
                playSound('click');


                // ------------------------------------------------
                // LAMP ACTION
                // ------------------------------------------------

                setTimeout(() => {

                    if (led) {

                        led.classList.remove(
                            'flash'
                        );
                    }


                    // Main existing lamp function
                    toggleLamp();


                    // ------------------------------------------------
                    // PREMIUM LIGHT ENERGY EFFECT
                    // ------------------------------------------------

                    loginScreen.classList.add(
                        'cmt-energy-pulse'
                    );


                    setTimeout(() => {

                        loginScreen.classList.remove(
                            'cmt-energy-pulse'
                        );

                    }, 850);


                    // ------------------------------------------------
                    // SYSTEM STATUS AFTER TOGGLE
                    // ------------------------------------------------

                    if (!isCurrentlyOn) {

                        // OFF → ON
                        setCMTStatus(
                            '● SYSTEM ONLINE',
                            'active'
                        );

                        loginScreen.classList.add(
                            'cmt-system-online'
                        );

                        playSound('online');

                    } else {

                        // ON → OFF
                        setCMTStatus(
                            '● SYSTEM STANDBY',
                            'standby'
                        );

                        loginScreen.classList.add(
                            'cmt-system-standby'
                        );

                        playSound('offline');
                    }


                    // ------------------------------------------------
                    // RETURN
                    // ------------------------------------------------

                    setTimeout(() => {

                        helper.classList.remove(
                            'pointing'
                        );

                        cssMan.classList.remove(
                            'looking-up'
                        );


                        cssMan.style.transform =
                            'scaleX(1) scale(1.3)';


                        helper.classList.add(
                            'walking'
                        );


                        stepInterval =
                            setInterval(
                                () => playSound('step'),
                                250
                            );


                        helper.style.left =
                            '80%';


                        // ------------------------------------------------
                        // COMPLETE
                        // ------------------------------------------------

                        setTimeout(() => {

                            clearInterval(
                                stepInterval
                            );


                            helper.classList.remove(
                                'walking'
                            );


                            helper.dataset
                                .movementStarted =
                                'false';


                            helperBusy = false;


                        }, 1500);


                    }, 600);


                }, 180);


            }, 550);


        }, 1500);
    }


    // ========================================================
    // SYSTEM STATUS HELPER
    // ========================================================

    function setCMTStatus(text, state) {

        let status =
            document.getElementById(
                'cmtSystemStatus'
            );


        // Create automatically if missing
        if (!status) {

            status =
                document.createElement('div');

            status.id =
                'cmtSystemStatus';

            status.className =
                'cmt-system-status';


            // Put status near login screen
            loginScreen.appendChild(
                status
            );
        }


        status.innerText = text;


        status.classList.remove(
            'active',
            'standby',
            'processing'
        );


        status.classList.add(
            state
        );
    }
}



// ============================================================
// CMT SOUND EFFECT SYSTEM
// ============================================================

function playSound(type) {

    if (!audioCtx) return;


    try {

        const osc =
            audioCtx.createOscillator();

        const gain =
            audioCtx.createGain();


        osc.connect(gain);
        gain.connect(
            audioCtx.destination
        );


        const now =
            audioCtx.currentTime;


        // ====================================================
        // REMOTE CLICK
        // ====================================================

        if (type === 'click') {

            osc.type = 'square';


            osc.frequency.setValueAtTime(
                400,
                now
            );


            osc.frequency.exponentialRampToValueAtTime(
                100,
                now + 0.1
            );


            gain.gain.setValueAtTime(
                0.05,
                now
            );


            gain.gain.exponentialRampToValueAtTime(
                0.01,
                now + 0.1
            );


            osc.start(now);

            osc.stop(
                now + 0.1
            );
        }


        // ====================================================
        // FLICKER
        // ====================================================

        else if (type === 'flicker') {

            osc.type = 'sawtooth';


            osc.frequency.setValueAtTime(
                60,
                now
            );


            gain.gain.setValueAtTime(
                0.02,
                now
            );


            gain.gain.linearRampToValueAtTime(
                0,
                now + 0.3
            );


            osc.start(now);

            osc.stop(
                now + 0.3
            );
        }


        // ====================================================
        // FOOTSTEP
        // ====================================================

        else if (type === 'step') {

            osc.type = 'sine';


            osc.frequency.setValueAtTime(
                150,
                now
            );


            gain.gain.setValueAtTime(
                0.01,
                now
            );


            gain.gain.exponentialRampToValueAtTime(
                0.001,
                now + 0.05
            );


            osc.start(now);

            osc.stop(
                now + 0.05
            );
        }


        // ====================================================
        // SYSTEM ONLINE
        // ====================================================

        else if (type === 'online') {

            osc.type = 'sine';


            osc.frequency.setValueAtTime(
                620,
                now
            );

            osc.frequency.linearRampToValueAtTime(
                880,
                now + 0.18
            );


            gain.gain.setValueAtTime(
                0.001,
                now
            );

            gain.gain.linearRampToValueAtTime(
                0.035,
                now + 0.04
            );

            gain.gain.exponentialRampToValueAtTime(
                0.001,
                now + 0.35
            );


            osc.start(now);

            osc.stop(
                now + 0.35
            );
        }


        // ====================================================
        // SYSTEM OFFLINE
        // ====================================================

        else if (type === 'offline') {

            osc.type = 'sine';


            osc.frequency.setValueAtTime(
                520,
                now
            );

            osc.frequency.linearRampToValueAtTime(
                320,
                now + 0.22
            );


            gain.gain.setValueAtTime(
                0.001,
                now
            );

            gain.gain.linearRampToValueAtTime(
                0.03,
                now + 0.04
            );

            gain.gain.exponentialRampToValueAtTime(
                0.001,
                now + 0.38
            );


            osc.start(now);

            osc.stop(
                now + 0.38
            );
        }

    } catch (error) {

        console.warn(
            'CMT Sound Error:',
            error
        );
    }
}



// --- NATIVE OS NOTIFICATION SYSTEM ---
function askNotificationPermission() {
    if ("Notification" in window) {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if(permission === "granted") {
                    console.log("CMT Native Notification Enabled!");
                }
            });
        }
    }
}

function sendNativeNotification(title, body) {
    // Check if permission is granted
    if ("Notification" in window && Notification.permission === "granted") {
        // Checking if the document is hidden/minimized. 
        // We only want native notifications if the user is not actively looking at the tab
        if (document.visibilityState === 'hidden') {
            const options = {
                body: body,
                icon: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhNdg1kTmu2ThNkVb9gBwX_RjSc-eXehSMCn5o-m5CEzvIqFBMtzbjIwIE8eyqGl8pSEILd4dfTT-XJkHX64jBLBSP93PVcAVjdN5kMjv4za4ZvNsTjXhawgtr5o-9VBW3i0Qk13m1GWBULyT8tY94k4hAM0JMgIP1bLUH_zsjdyD8oqPglH2cZQTSljYE/s320/emahajon-icon.png',
                vibrate: [200, 100, 200]
            };
            let nativeNotif = new Notification(title, options);
            
            // Clicking the notification brings the tab to focus
            nativeNotif.onclick = function() {
                window.focus();
                this.close();
            };
        }
    }
}