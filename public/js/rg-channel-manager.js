
// RentikPro Channel Manager Module (Vanilla JS)
// Funciona en modo "Standalone" leyendo directamente el archivo SQLite.

let db = null;
let SQL = null;
let currentApartmentId = null;

// UI References
const btnLoadDb = document.getElementById('btn-load-db');
const fileInput = document.getElementById('file-input');
const mainView = document.getElementById('main-view');
const emptyState = document.getElementById('empty-state');
const propertyList = document.getElementById('property-list');
const connectionsList = document.getElementById('connections-list');
const viewTitle = document.getElementById('view-title');
const viewSubtitle = document.getElementById('view-subtitle');

// Inicialización de SQL.js
async function init() {
    try {
        SQL = await window.initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
        });
        console.log("SQL.js Ready");
        lucide.createIcons();
    } catch (e) {
        console.error("Error init SQL.js", e);
        alert("Error cargando librería SQL. Verifica conexión a internet (CDN).");
    }
}

// Manejo de Archivo
if(btnLoadDb) btnLoadDb.addEventListener('click', () => fileInput.click());

if(fileInput) fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const buffer = await file.arrayBuffer();
        db = new SQL.Database(new Uint8Array(buffer));
        
        renderSidebar();
        refreshStats();
        
        emptyState.classList.add('hidden');
        mainView.classList.remove('hidden');
        
        setTimeout(() => lucide.createIcons(), 100);
        
    } catch (err) {
        alert("Error leyendo base de datos: " + err.message);
    }
});

function execute(sql, params = []) {
    if(!db) return [];
    try {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const res = [];
        while(stmt.step()) res.push(stmt.getAsObject());
        stmt.free();
        return res;
    } catch (e) {
        console.error("SQL Error:", e);
        return [];
    }
}

// Renderizado Sidebar
function renderSidebar() {
    try {
        const props = execute("SELECT * FROM properties");
        const apts = execute("SELECT * FROM apartments");
        
        propertyList.innerHTML = '';
        
        if (props.length === 0) {
            propertyList.innerHTML = '<div class="p-4 text-center text-slate-400 text-xs italic">Base de datos vacía.</div>';
            return;
        }

        props.forEach(p => {
            const div = document.createElement('div');
            div.className = "mb-4 animate-fade-in";
            div.innerHTML = `
                <div class="px-3 mb-2 flex items-center gap-2 text-slate-400">
                    <i data-lucide="building-2" class="w-3 h-3"></i>
                    <span class="text-[10px] font-black uppercase tracking-widest truncate">${p.name}</span>
                </div>
            `;
            
            const pApts = apts.filter(a => a.property_id === p.id);
            const listDiv = document.createElement('div');
            listDiv.className = "space-y-1";

            pApts.forEach(a => {
                const btn = document.createElement('button');
                btn.className = "w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 flex items-center gap-2 transition-all group";
                btn.innerHTML = `
                    <div class="w-1.5 h-6 rounded-full" style="background-color: ${a.color || '#ccc'}"></div>
                    <span class="flex-1 truncate">${a.name}</span>
                `;
                btn.onclick = () => {
                    document.querySelectorAll('#property-list button').forEach(b => b.classList.remove('bg-indigo-50', 'text-indigo-700'));
                    btn.classList.add('bg-indigo-50', 'text-indigo-700');
                    loadApartment(a);
                };
                listDiv.appendChild(btn);
            });
            
            div.appendChild(listDiv);
            propertyList.appendChild(div);
        });
        lucide.createIcons();
    } catch (err) {
        propertyList.innerHTML = '<div class="p-4 text-rose-500 text-xs">Error de esquema DB.</div>';
    }
}

function loadApartment(apt) {
    currentApartmentId = apt.id;
    viewTitle.innerText = apt.name;
    viewSubtitle.innerHTML = `Visualizando conexiones para ${apt.name}`;
    renderConnections(apt.id);
}

function renderConnections(aptId) {
    try {
        execute("SELECT 1 FROM channel_connections LIMIT 1");
    } catch {
        connectionsList.innerHTML = `<div class="p-8 text-center text-slate-400 text-xs">Módulo Channel Manager no inicializado en esta DB.</div>`;
        return;
    }

    const conns = execute("SELECT * FROM channel_connections WHERE apartment_id = ?", [aptId]);
    connectionsList.innerHTML = '';
    
    if (conns.length === 0) {
        connectionsList.innerHTML = `
            <div class="p-8 text-center opacity-60">
                <i data-lucide="link-2-off" class="w-8 h-8 text-slate-300 mx-auto mb-2"></i>
                <p class="text-xs text-slate-400">Sin conexiones activas.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    conns.forEach(c => {
        const row = document.createElement('div');
        row.className = "p-6 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-slate-50 transition-colors gap-4";
        
        let icon = 'link';
        if(c.channel_name === 'AIRBNB') icon = 'globe';
        if(c.channel_name === 'BOOKING') icon = 'calendar';

        row.innerHTML = `
            <div class="flex items-center gap-4 w-full md:w-1/2">
                <div class="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <i data-lucide="${icon}" class="w-5 h-5 text-slate-400"></i>
                </div>
                <div class="overflow-hidden">
                    <div class="flex items-center gap-2 mb-1">
                        <h4 class="font-bold text-slate-800 text-sm truncate">${c.alias || c.channel_name}</h4>
                        <span class="text-[9px] font-black uppercase px-2 py-0.5 bg-slate-100 rounded text-slate-500">${c.channel_name}</span>
                        ${c.force_direct ? '<span class="text-[8px] bg-amber-100 text-amber-600 px-1 rounded border border-amber-200">DIRECT</span>' : ''}
                    </div>
                    <p class="text-[10px] text-slate-400 font-mono truncate w-full opacity-70" title="${c.ical_url}">${c.ical_url}</p>
                </div>
            </div>
            
            <div class="flex items-center gap-6">
                <div class="text-right">
                    <p class="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Prioridad</p>
                    <span class="font-bold text-slate-700 text-xs">${c.priority}</span>
                </div>
                <div class="text-right">
                    <p class="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Estado</p>
                    <span class="font-bold ${c.last_status === 'OK' ? 'text-emerald-600' : 'text-rose-500'} text-xs">${c.last_status}</span>
                </div>
            </div>
        `;
        connectionsList.appendChild(row);
    });
    lucide.createIcons();
}

function refreshStats() {
    try {
        const conns = execute("SELECT COUNT(*) as c FROM channel_connections");
        const bookings = execute("SELECT COUNT(*) as c FROM bookings");
        const conflicts = execute("SELECT COUNT(*) as c FROM bookings WHERE conflict_detected = 1");
        
        if (conns.length) document.getElementById('stat-connections').innerText = conns[0].c;
        if (bookings.length) document.getElementById('stat-bookings').innerText = bookings[0].c;
        if (conflicts.length) document.getElementById('stat-conflicts').innerText = conflicts[0].c;
    } catch (e) {
        console.warn("Stats tables missing or empty");
    }
}

init();
