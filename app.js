/* Renato Carriço Barbearia — cliente estático para Supabase */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const DAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const SHORT_DAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const money = cents => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((Number(cents) || 0) / 100);
  const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const onlyDigits = value => String(value || '').replace(/\D/g, '');
  const pad = value => String(value).padStart(2, '0');
  const time = value => String(value || '').slice(0, 5);
  const isoDate = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const localDate = value => { const [year, month, day] = String(value).slice(0, 10).split('-').map(Number); return new Date(year, month - 1, day, 12); };
  const addDays = (date, amount) => { const copy = new Date(date); copy.setDate(copy.getDate() + amount); return copy; };
  const toDateTime = value => new Date(String(value).replace(' ', 'T'));
  const formatDate = value => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(localDate(value));
  const formatDateTime = value => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(toDateTime(value));
  const maskPhone = value => {
    const digits = onlyDigits(value).slice(0, 11);
    if (digits.length <= 10) return digits.replace(/(\d{0,2})(\d{0,4})(\d{0,4})/, (_, a, b, c) => `${a ? `(${a}` : ''}${a.length === 2 ? ') ' : ''}${b}${c ? `-${c}` : ''}`);
    return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };
  const friendlyError = error => {
    const message = error?.message || 'Não foi possível concluir agora. Tente novamente.';
    if (/JWT|permission|acesso/i.test(message)) return 'Sua sessão não tem permissão para esta ação.';
    if (/fetch|network|Failed to fetch/i.test(message)) return 'Sem conexão com o banco. Confira sua internet e tente novamente.';
    return message.replace(/^.*?:\s*/, '');
  };

  const DEMO = {
    profile: { shop_name: 'Barbearia Carriço', headline: 'Cada detalhe faz o estilo.', description: 'Corte, barba e uma pausa bem-feita. Escolha seu horário em poucos passos.', address: 'Av. Atilio Rauta, 783 — Anchieta / ES', maps_url: 'https://www.google.com/maps/search/?api=1&query=Av.+Atilio+Rauta+783+Anchieta+ES', instagram_url: 'https://instagram.com/', whatsapp_number: '5528999137277' },
    services: [
      { id: 'demo-corte', name: 'Corte Degradê', description: 'Máquina, tesoura e finalização.', duration_minutes: 30, price_cents: 5000, active: true, sort_order: 10 },
      { id: 'demo-combo', name: 'Corte + Barba', description: 'Combo completo com toalha quente.', duration_minutes: 60, price_cents: 8000, active: true, sort_order: 20 },
      { id: 'demo-barba', name: 'Barba Navalha', description: 'Contorno, navalha e hidratação.', duration_minutes: 30, price_cents: 3500, active: true, sort_order: 30 }
    ],
    hours: [
      { day_of_week: 0, is_open: false, opens_at: '08:30', closes_at: '18:00' },
      { day_of_week: 1, is_open: true, opens_at: '08:30', closes_at: '20:30', break_starts_at: '12:00', break_ends_at: '13:20' },
      { day_of_week: 2, is_open: true, opens_at: '08:30', closes_at: '20:30', break_starts_at: '12:00', break_ends_at: '13:20' },
      { day_of_week: 3, is_open: true, opens_at: '08:30', closes_at: '20:30', break_starts_at: '12:00', break_ends_at: '13:20' },
      { day_of_week: 4, is_open: true, opens_at: '08:30', closes_at: '20:30', break_starts_at: '12:00', break_ends_at: '13:20' },
      { day_of_week: 5, is_open: true, opens_at: '08:30', closes_at: '20:30', break_starts_at: '12:00', break_ends_at: '13:20' },
      { day_of_week: 6, is_open: true, opens_at: '08:30', closes_at: '18:00', break_starts_at: '12:00', break_ends_at: '13:20' }
    ]
  };

  const configured = Boolean(window.SUPABASE_URL && window.SUPABASE_ANON_KEY && window.supabase);
  const db = configured ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
  const state = {
    profile: { ...DEMO.profile }, services: [...DEMO.services], hours: [...DEMO.hours],
    booking: { step: 0, name: '', phone: '', serviceId: '', date: '', slot: '' },
    slots: [], slotsLoading: false, slotsError: '',
    session: null, staffProfile: null, adminTab: 'agenda', appointments: [], blocks: [], adminDate: isoDate(new Date()), channel: null, publicChannel: null
  };

  let toastTimer;
  const showToast = message => {
    const element = $('#toast'); element.textContent = message; element.classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => element.classList.remove('visible'), 3600);
  };
  const setConnection = (label, type = '') => {
    const status = $('#connectionStatus'); status.className = `connection-status ${type}`; status.innerHTML = '<i></i>'; status.append(` ${label}`);
  };
  const loadingMarkup = () => $('#loadingTemplate').innerHTML;

  function applyProfile() {
    const profile = state.profile;
    const shopName = profile.shop_name || 'Barbearia Carriço';
    document.title = `${shopName} — Agendamento`;
    $('#brandName').textContent = shopName.toUpperCase();
    $('#footerBrand').textContent = shopName;
    $('#brandMark').textContent = shopName.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'BC';
    $('#heroText').textContent = profile.description || DEMO.profile.description;
    $('#addressText').textContent = profile.address || DEMO.profile.address;
    $('#mapsLink').href = safeUrl(profile.maps_url, DEMO.profile.maps_url);
    $('#instagramLink').href = safeUrl(profile.instagram_url, DEMO.profile.instagram_url);
    $('#whatsappLink').href = `https://wa.me/${onlyDigits(profile.whatsapp_number)}?text=${encodeURIComponent('Olá! Gostaria de tirar uma dúvida sobre os horários.')}`;
    $('#year').textContent = new Date().getFullYear();
    $('#hoursList').innerHTML = [...state.hours].sort((a, b) => a.day_of_week - b.day_of_week).map(hour => {
      const label = hour.is_open ? `${time(hour.opens_at)} — ${time(hour.closes_at)}` : 'Fechado';
      return `<div class="hour-row"><span>${escapeHTML(DAYS[hour.day_of_week])}</span><span>${label}</span></div>`;
    }).join('');
  }
  function safeUrl(value, fallback) { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : fallback; } catch { return fallback; } }
  function serviceById(id) { return state.services.find(service => service.id === id); }
  function hourForDate(date) { return state.hours.find(hour => hour.day_of_week === localDate(date).getDay()); }

  async function loadPublicData({ silent = false } = {}) {
    if (!configured) { applyProfile(); setConnection('Modo de demonstração — configure o Supabase', 'offline'); renderBooking(); return; }
    if (!silent) setConnection('Atualizando agenda…');
    const [profileResult, servicesResult, hoursResult] = await Promise.all([
      db.from('business_profile').select('*').eq('id', true).single(),
      db.from('services').select('*').order('sort_order').order('name'),
      db.from('business_hours').select('*').order('day_of_week')
    ]);
    const errors = [profileResult.error, servicesResult.error, hoursResult.error].filter(Boolean);
    if (errors.length) { setConnection('Falha ao conectar ao banco', 'offline'); showToast(friendlyError(errors[0])); return; }
    state.profile = profileResult.data || { ...DEMO.profile };
    state.services = servicesResult.data || [];
    state.hours = hoursResult.data || [];
    applyProfile(); setConnection('Agenda conectada em tempo real', 'online'); renderBooking();
  }

  function subscribePublic() {
    if (!configured || state.publicChannel) return;
    state.publicChannel = db.channel('barbearia-public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'availability_state' }, () => {
        state.lastSlotQuery = '';
        if (state.booking.step === 3) renderBooking();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, async () => { state.lastSlotQuery = ''; await loadPublicData({ silent: true }); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_hours' }, async () => { state.lastSlotQuery = ''; await loadPublicData({ silent: true }); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_profile' }, () => loadPublicData({ silent: true }))
      .subscribe();
  }

  function updateProgress() {
    const { step } = state.booking;
    $('#stepLabel').textContent = `PASSO ${step + 1} DE 4`;
    $('#progressBar').style.width = `${(step + 1) * 25}%`;
    $('#restartButton').hidden = step === 0;
  }
  function renderBooking() {
    updateProgress();
    const panel = $('#bookingPanel'); const { booking } = state;
    if (booking.step === 0) {
      panel.innerHTML = `<h2 class="panel-title">Vamos nos conhecer.</h2><p class="panel-description">Precisamos só do seu nome e WhatsApp para confirmar a reserva.</p>
        <form id="customerForm" novalidate><label class="field-label" for="customerName">Seu nome</label><input class="field" id="customerName" maxlength="100" autocomplete="name" placeholder="Ex.: João da Silva" value="${escapeHTML(booking.name)}">
        <label class="field-label" for="customerPhone">Seu WhatsApp</label><input class="field" id="customerPhone" inputmode="tel" autocomplete="tel" placeholder="(27) 99999-9999" value="${escapeHTML(maskPhone(booking.phone))}"><p class="form-error" id="customerError"></p>
        <button class="primary-button" type="submit">Escolher serviço <span>→</span></button></form>`;
      const phone = $('#customerPhone'); phone.addEventListener('input', () => { phone.value = maskPhone(phone.value); });
      $('#customerForm').addEventListener('submit', event => {
        event.preventDefault(); const name = $('#customerName').value.trim(); const digits = onlyDigits(phone.value); const error = $('#customerError');
        if (name.length < 3) { error.textContent = 'Digite seu nome completo (ao menos 3 letras).'; return; }
        if (digits.length < 10 || digits.length > 15) { error.textContent = 'Informe um WhatsApp válido com DDD.'; return; }
        Object.assign(booking, { name, phone: digits, step: 1 }); renderBooking();
      });
    } else if (booking.step === 1) {
      const services = state.services.filter(service => service.active);
      panel.innerHTML = `<h2 class="panel-title">Qual será o cuidado?</h2><p class="panel-description">Todos os valores e tempos são definidos pela barbearia.</p><div class="service-grid">${services.map(service => `<button class="service-choice ${booking.serviceId === service.id ? 'selected' : ''}" type="button" data-service="${service.id}"><span><strong>${escapeHTML(service.name)}</strong><span>${escapeHTML(service.description || `${service.duration_minutes} minutos`)}</span></span><b>${money(service.price_cents)} · ${service.duration_minutes}min</b></button>`).join('') || '<p class="panel-description">Não há serviços disponíveis neste momento.</p>'}</div><div class="choice-footer"><button class="back-button" type="button" data-back>Voltar</button><button class="primary-button" type="button" id="serviceNext" ${booking.serviceId ? '' : 'disabled'}>Escolher dia <span>→</span></button></div>`;
      $$('[data-service]', panel).forEach(button => button.addEventListener('click', () => { booking.serviceId = button.dataset.service; booking.date = ''; booking.slot = ''; renderBooking(); }));
      $('[data-back]', panel).addEventListener('click', () => { booking.step = 0; renderBooking(); });
      $('#serviceNext').addEventListener('click', () => { booking.step = 2; renderBooking(); });
    } else if (booking.step === 2) {
      const today = new Date(); const buttons = Array.from({ length: 21 }, (_, index) => {
        const date = addDays(today, index); const iso = isoDate(date); const hour = hourForDate(iso); const closed = !hour?.is_open;
        return `<button type="button" class="date-choice ${booking.date === iso ? 'selected' : ''}" data-date="${iso}" ${closed ? 'disabled' : ''}><b>${pad(date.getDate())}/${pad(date.getMonth() + 1)}</b><span>${SHORT_DAYS[date.getDay()]}${closed ? ' · FECHADO' : ''}</span></button>`;
      }).join('');
      panel.innerHTML = `<h2 class="panel-title">Quando fica melhor?</h2><p class="panel-description">A agenda abre para os próximos 21 dias.</p><div class="date-grid">${buttons}</div><div class="choice-footer"><button class="back-button" type="button" data-back>Voltar</button><button class="primary-button" type="button" id="dateNext" ${booking.date ? '' : 'disabled'}>Ver horários <span>→</span></button></div>`;
      $$('[data-date]', panel).forEach(button => button.addEventListener('click', () => { booking.date = button.dataset.date; booking.slot = ''; renderBooking(); }));
      $('[data-back]', panel).addEventListener('click', () => { booking.step = 1; renderBooking(); });
      $('#dateNext').addEventListener('click', () => { booking.step = 3; renderBooking(); });
    } else {
      renderTimeStep();
    }
  }

  async function loadSlots() {
    const { serviceId, date } = state.booking;
    state.slotsLoading = true; state.slotsError = ''; renderTimeStep();
    if (!configured) {
      state.slots = ['08:30', '09:00', '09:30', '10:00', '10:30', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00']; state.slotsLoading = false; renderTimeStep(); return;
    }
    const { data, error } = await db.rpc('get_available_slots', { p_service_id: serviceId, p_date: date });
    state.slotsLoading = false;
    if (error) { state.slots = []; state.slotsError = friendlyError(error); } else { state.slots = (data || []).map(row => time(row.slot)); }
    renderTimeStep();
  }
  function renderTimeStep() {
    const panel = $('#bookingPanel'); const { booking } = state; const service = serviceById(booking.serviceId);
    if (!service) { booking.step = 1; renderBooking(); return; }
    const expected = booking.serviceId + booking.date;
    if (!state.slotsLoading && state.lastSlotQuery !== expected) { state.lastSlotQuery = expected; loadSlots(); return; }
    if (state.slotsLoading) { panel.innerHTML = loadingMarkup(); return; }
    const slots = state.slots.map(slot => `<button type="button" class="time-choice ${booking.slot === slot ? 'selected' : ''}" data-slot="${slot}">${slot}</button>`).join('');
    panel.innerHTML = `<h2 class="panel-title">Escolha o horário.</h2><p class="panel-description">${escapeHTML(formatDate(booking.date))} · ${escapeHTML(service.name)} (${service.duration_minutes} min)</p>${state.slotsError ? `<p class="form-error">${escapeHTML(state.slotsError)}</p>` : ''}<div class="time-grid">${slots || '<p class="panel-description">Não há horários livres nesta data. Escolha outro dia.</p>'}</div>${booking.slot ? `<div class="summary"><div class="summary-row"><span>Serviço</span><strong>${escapeHTML(service.name)}</strong></div><div class="summary-row"><span>Quando</span><strong>${escapeHTML(formatDate(booking.date))}, ${booking.slot}</strong></div><div class="summary-row"><span>Valor</span><strong>${money(service.price_cents)}</strong></div></div>` : ''}<p class="form-error" id="bookingError"></p><div class="choice-footer"><button class="back-button" type="button" data-back>Voltar</button><button class="primary-button" type="button" id="confirmBooking" ${booking.slot ? '' : 'disabled'}>Confirmar reserva <span>→</span></button></div>`;
    $$('[data-slot]', panel).forEach(button => button.addEventListener('click', () => { booking.slot = button.dataset.slot; renderTimeStep(); }));
    $('[data-back]', panel).addEventListener('click', () => { booking.step = 2; renderBooking(); });
    $('#confirmBooking')?.addEventListener('click', createBooking);
  }
  async function createBooking() {
    const errorElement = $('#bookingError');
    if (!configured) { errorElement.textContent = 'Este é um modo de demonstração. Configure o Supabase para salvar reservas reais.'; return; }
    const button = $('#confirmBooking'); button.disabled = true; button.textContent = 'Confirmando…';
    const { booking } = state;
    const { error } = await db.rpc('create_public_booking', { p_client_name: booking.name, p_phone: booking.phone, p_service_id: booking.serviceId, p_date: booking.date, p_time: booking.slot });
    if (error) { state.lastSlotQuery = ''; errorElement.textContent = friendlyError(error); button.disabled = false; button.innerHTML = 'Confirmar reserva <span>→</span>'; return; }
    const service = serviceById(booking.serviceId);
    $('#bookingPanel').innerHTML = `<div class="success"><div class="success-mark">✓</div><h2 class="panel-title">Horário reservado.</h2><p>Pronto, ${escapeHTML(booking.name.split(' ')[0])}. Sua reserva de <strong>${escapeHTML(service.name)}</strong> foi confirmada para ${escapeHTML(formatDate(booking.date))}, às <strong>${booking.slot}</strong>.</p><p>Se precisar alterar algo, fale com a barbearia pelo WhatsApp.</p><button class="primary-button" type="button" id="newBooking">Fazer nova reserva <span>→</span></button></div>`;
    $('#newBooking').addEventListener('click', resetBooking);
    showToast('Reserva confirmada com sucesso.');
  }
  function resetBooking() { state.booking = { step: 0, name: '', phone: '', serviceId: '', date: '', slot: '' }; state.slots = []; state.lastSlotQuery = ''; renderBooking(); }

  async function verifyStaff() {
    if (!configured) return false;
    const { data: { session } } = await db.auth.getSession(); state.session = session;
    if (!session) return false;
    const { data, error } = await db.from('profiles').select('id, display_name, role').eq('id', session.user.id).maybeSingle();
    if (error || !data) { await db.auth.signOut(); state.session = null; return false; }
    state.staffProfile = data; return true;
  }
  function openLogin() {
    if (!configured) { showToast('Preencha SUPABASE_URL e SUPABASE_ANON_KEY para ativar o acesso seguro.'); return; }
    $('#loginError').textContent = ''; $('#authDialog').showModal(); $('#emailInput').focus();
  }
  async function login(event) {
    event.preventDefault(); const submit = $('#loginForm [type="submit"]'); const errorElement = $('#loginError');
    submit.disabled = true; errorElement.textContent = '';
    const { error } = await db.auth.signInWithPassword({ email: $('#emailInput').value.trim(), password: $('#passwordInput').value });
    if (error) { errorElement.textContent = friendlyError(error); submit.disabled = false; return; }
    if (!await verifyStaff()) { errorElement.textContent = 'Esta conta não tem perfil de administrador. Peça acesso ao proprietário.'; submit.disabled = false; return; }
    $('#authDialog').close(); openAdmin();
  }
  async function openAdmin() {
    if (!state.staffProfile && !await verifyStaff()) { openLogin(); return; }
    $('#adminUser').textContent = state.staffProfile.display_name || state.session.user.email;
    $('#adminDialog').showModal(); await loadAdminData(); subscribeAdmin(); renderAdmin();
  }
  async function loadAdminData() {
    if (!configured || !state.session) return;
    const start = `${state.adminDate}T00:00:00`; const end = `${state.adminDate}T23:59:59`;
    const [appointmentsResult, blocksResult] = await Promise.all([
      db.from('appointments').select('id, client_name, phone, starts_at, ends_at, status, notes, service:services(name, price_cents, duration_minutes)').gte('starts_at', start).lte('starts_at', end).order('starts_at'),
      db.from('calendar_blocks').select('*').gte('starts_at', start).lte('starts_at', end).order('starts_at')
    ]);
    if (appointmentsResult.error || blocksResult.error) { showToast(friendlyError(appointmentsResult.error || blocksResult.error)); return; }
    state.appointments = appointmentsResult.data || []; state.blocks = blocksResult.data || [];
  }
  function subscribeAdmin() {
    if (!configured || state.channel) return;
    state.channel = db.channel('barbearia-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, async () => { await loadAdminData(); if ($('#adminDialog').open && state.adminTab === 'agenda') renderAdmin(); state.lastSlotQuery = ''; })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, async () => { await loadPublicData({ silent: true }); if ($('#adminDialog').open && state.adminTab === 'services') renderAdmin(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_hours' }, async () => { await loadPublicData({ silent: true }); if ($('#adminDialog').open && state.adminTab === 'hours') renderAdmin(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_profile' }, () => loadPublicData({ silent: true }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_blocks' }, async () => { await loadAdminData(); if ($('#adminDialog').open && state.adminTab === 'agenda') renderAdmin(); })
      .subscribe();
  }
  async function closeAdmin() { $('#adminDialog').close(); }
  async function logout() { await db.auth.signOut(); state.session = null; state.staffProfile = null; if (state.channel) { await db.removeChannel(state.channel); state.channel = null; } $('#adminDialog').close(); showToast('Sessão encerrada.'); }

  function renderAdmin() {
    $$('.admin-tabs button').forEach(button => button.classList.toggle('active', button.dataset.tab === state.adminTab));
    const panel = $('#adminPanel');
    if (state.adminTab === 'agenda') renderAgenda(panel);
    if (state.adminTab === 'services') renderServicesAdmin(panel);
    if (state.adminTab === 'hours') renderHoursAdmin(panel);
    if (state.adminTab === 'profile') renderProfileAdmin(panel);
  }
  function renderAgenda(panel) {
    const appointmentRows = state.appointments.map(appointment => `<article class="appointment"><div class="appointment-time">${time(appointment.starts_at.slice(11))}<small>até ${time(appointment.ends_at.slice(11))}</small></div><div class="appointment-detail"><strong>${escapeHTML(appointment.client_name)}</strong><small>${escapeHTML(maskPhone(appointment.phone))}</small></div><div class="appointment-detail"><strong>${escapeHTML(appointment.service?.name || 'Serviço removido')}</strong><small><span class="status-pill ${escapeHTML(appointment.status)}">${statusLabel(appointment.status)}</span></small></div><div class="appointment-actions">${appointment.status !== 'completed' ? `<button class="small-button" data-status="completed" data-appointment="${appointment.id}">Concluir</button>` : ''}${appointment.status !== 'cancelled' ? `<button class="small-button" data-status="cancelled" data-appointment="${appointment.id}">Cancelar</button>` : ''}${appointment.status === 'cancelled' ? `<button class="small-button" data-status="confirmed" data-appointment="${appointment.id}">Reativar</button>` : ''}</div></article>`).join('');
    const blockRows = state.blocks.map(block => `<article class="appointment"><div class="appointment-time">${time(block.starts_at.slice(11))}<small>até ${time(block.ends_at.slice(11))}</small></div><div class="appointment-detail"><strong>Horário bloqueado</strong><small>${escapeHTML(block.reason || 'Sem motivo informado')}</small></div><div><span class="status-pill cancelled">bloqueio</span></div></article>`).join('');
    panel.innerHTML = `<div class="agenda-head"><div><h3>Atendimentos</h3><p>As reservas recebidas aparecem aqui automaticamente.</p></div><input class="date-filter" id="agendaDate" type="date" value="${state.adminDate}"></div><section class="appointment-list">${appointmentRows || '<p class="empty-state">Nenhum atendimento nesta data.</p>'}${blockRows}</section><section class="admin-form" style="margin-top:28px"><h3>Bloquear um intervalo</h3><p>Use para almoço, folga ou compromissos. Não bloqueia horários que já possuem reservas.</p><form id="blockForm" class="settings-grid"><div><label>Data</label><input id="blockDate" type="date" required value="${state.adminDate}"></div><div><label>Motivo</label><input id="blockReason" maxlength="160" placeholder="Ex.: compromisso"></div><div><label>Início</label><input id="blockStart" type="time" required value="12:00"></div><div><label>Fim</label><input id="blockEnd" type="time" required value="13:00"></div><div class="full form-footer"><button class="primary-button" type="submit">Bloquear horário <span>→</span></button><span class="form-hint" id="blockMessage"></span></div></form></section>`;
    $('#agendaDate').addEventListener('change', async event => { state.adminDate = event.target.value; await loadAdminData(); renderAdmin(); });
    $$('[data-status]', panel).forEach(button => button.addEventListener('click', () => setAppointmentStatus(button.dataset.appointment, button.dataset.status)));
    $('#blockForm').addEventListener('submit', createBlock);
  }
  const statusLabel = status => ({ confirmed: 'confirmado', completed: 'concluído', cancelled: 'cancelado' }[status] || status);
  async function setAppointmentStatus(id, status) {
    const { error } = await db.rpc('set_appointment_status', { p_appointment_id: id, p_status: status });
    if (error) { showToast(friendlyError(error)); return; } await loadAdminData(); renderAdmin(); showToast('Agenda atualizada.');
  }
  async function createBlock(event) {
    event.preventDefault(); const message = $('#blockMessage'); const button = $('#blockForm button'); button.disabled = true; message.textContent = '';
    const date = $('#blockDate').value; const start = $('#blockStart').value; const end = $('#blockEnd').value;
    const { error } = await db.rpc('create_calendar_block', { p_starts_at: `${date}T${start}:00`, p_ends_at: `${date}T${end}:00`, p_reason: $('#blockReason').value.trim() });
    button.disabled = false; if (error) { message.textContent = friendlyError(error); return; }
    state.adminDate = date; await loadAdminData(); renderAdmin(); showToast('Intervalo bloqueado.');
  }
  function renderServicesAdmin(panel) {
    panel.innerHTML = `<h3>Serviços</h3><p>Alterações são publicadas na tela de agendamento imediatamente.</p><section class="admin-form"><form id="newServiceForm" class="settings-grid"><div><label>Nome</label><input id="newServiceName" maxlength="80" required placeholder="Ex.: Sobrancelha"></div><div><label>Descrição</label><input id="newServiceDescription" maxlength="200" placeholder="Resumo do serviço"></div><div><label>Duração</label><select id="newServiceDuration"><option value="15">15 minutos</option><option value="30" selected>30 minutos</option><option value="45">45 minutos</option><option value="60">60 minutos</option><option value="75">75 minutos</option><option value="90">90 minutos</option><option value="120">120 minutos</option></select></div><div><label>Preço (R$)</label><input id="newServicePrice" type="number" min="0" max="10000" step="0.01" required placeholder="0,00"></div><div class="full form-footer"><button class="primary-button" type="submit">Adicionar serviço <span>→</span></button><span class="form-hint" id="serviceMessage"></span></div></form></section><section style="margin-top:30px">${state.services.map(service => `<form class="service-admin-row" data-service-form="${service.id}"><input data-field="name" maxlength="80" value="${escapeHTML(service.name)}" aria-label="Nome"><input data-field="duration" type="number" min="15" max="120" step="15" value="${service.duration_minutes}" aria-label="Duração em minutos"><input data-field="price" type="number" min="0" step="0.01" value="${(service.price_cents / 100).toFixed(2)}" aria-label="Preço em reais"><button class="small-button" type="submit">Salvar</button><label style="font:11px 'DM Mono',monospace;white-space:nowrap"><input data-field="active" type="checkbox" ${service.active ? 'checked' : ''}> ativo</label></form>`).join('') || '<p class="empty-state">Sem serviços cadastrados.</p>'}</section>`;
    $('#newServiceForm').addEventListener('submit', addService);
    $$('[data-service-form]', panel).forEach(form => form.addEventListener('submit', event => saveService(event, form.dataset.serviceForm)));
  }
  async function addService(event) {
    event.preventDefault(); const message = $('#serviceMessage'); const name = $('#newServiceName').value.trim(); const price = Math.round(Number($('#newServicePrice').value) * 100);
    const maxOrder = Math.max(0, ...state.services.map(item => item.sort_order || 0));
    const { error } = await db.from('services').insert({ name, description: $('#newServiceDescription').value.trim(), duration_minutes: Number($('#newServiceDuration').value), price_cents: price, sort_order: maxOrder + 10 });
    if (error) { message.textContent = friendlyError(error); return; }
    await loadPublicData({ silent: true }); renderAdmin(); showToast('Serviço adicionado.');
  }
  async function saveService(event, id) {
    event.preventDefault(); const form = event.currentTarget;
    const duration = Number($('[data-field="duration"]', form).value); const price = Math.round(Number($('[data-field="price"]', form).value) * 100);
    if (![15, 30, 45, 60, 75, 90, 120].includes(duration) || price < 0) { showToast('Confira duração e preço.'); return; }
    const payload = { name: $('[data-field="name"]', form).value.trim(), duration_minutes: duration, price_cents: price, active: $('[data-field="active"]', form).checked };
    const { error } = await db.from('services').update(payload).eq('id', id);
    if (error) { showToast(friendlyError(error)); return; } await loadPublicData({ silent: true }); showToast('Serviço salvo.');
  }
  function renderHoursAdmin(panel) {
    panel.innerHTML = `<h3>Horários de atendimento</h3><p>O intervalo de pausa não aparece como opção para os clientes.</p><form class="admin-form" id="hoursForm"><div class="hours-editor">${[0,1,2,3,4,5,6].map(day => { const hour = state.hours.find(item => item.day_of_week === day) || { day_of_week: day, is_open: false, opens_at: '08:30', closes_at: '18:00', break_starts_at: '', break_ends_at: '' }; return `<div class="hour-editor-row" data-day="${day}"><strong>${DAYS[day]}</strong><label><input data-open type="checkbox" ${hour.is_open ? 'checked' : ''}> aberto</label><input data-start type="time" value="${time(hour.opens_at)}" aria-label="Abertura"><input data-end type="time" value="${time(hour.closes_at)}" aria-label="Fechamento"><input data-break-start type="time" value="${time(hour.break_starts_at)}" aria-label="Pausa início"><input data-break-end type="time" value="${time(hour.break_ends_at)}" aria-label="Pausa fim"></div>`; }).join('')}</div><div class="form-footer"><button class="primary-button" type="submit">Salvar horários <span>→</span></button><span class="form-hint" id="hoursMessage"></span></div></form>`;
    $('#hoursForm').addEventListener('submit', saveHours);
  }
  async function saveHours(event) {
    event.preventDefault(); const message = $('#hoursMessage'); const rows = $$('[data-day]', event.currentTarget);
    const values = rows.map(row => ({ day_of_week: Number(row.dataset.day), is_open: $('[data-open]', row).checked, opens_at: $('[data-start]', row).value, closes_at: $('[data-end]', row).value, break_starts_at: $('[data-break-start]', row).value || null, break_ends_at: $('[data-break-end]', row).value || null }));
    if (values.some(row => !row.opens_at || !row.closes_at || row.closes_at <= row.opens_at || Boolean(row.break_starts_at) !== Boolean(row.break_ends_at))) { message.textContent = 'Confira abertura, fechamento e os dois campos de pausa.'; return; }
    const { error } = await db.from('business_hours').upsert(values, { onConflict: 'day_of_week' });
    if (error) { message.textContent = friendlyError(error); return; } await loadPublicData({ silent: true }); message.textContent = 'Horários salvos e sincronizados.'; showToast('Horários salvos.');
  }
  function renderProfileAdmin(panel) {
    const profile = state.profile;
    panel.innerHTML = `<h3>Perfil público</h3><p>Essas informações são exibidas para todos os visitantes.</p><p class="profile-status">● Publicação protegida por login e sincronizada em tempo real.</p><form class="admin-form" id="profileForm"><div class="settings-grid"><div><label>Nome da barbearia</label><input id="profileName" maxlength="100" required value="${escapeHTML(profile.shop_name)}"></div><div><label>WhatsApp (somente números)</label><input id="profileWhatsapp" inputmode="numeric" required value="${escapeHTML(profile.whatsapp_number)}"></div><div class="full"><label>Descrição</label><textarea id="profileDescription" maxlength="300">${escapeHTML(profile.description)}</textarea></div><div class="full"><label>Endereço</label><input id="profileAddress" maxlength="200" required value="${escapeHTML(profile.address)}"></div><div><label>Link do Maps</label><input id="profileMaps" type="url" required value="${escapeHTML(profile.maps_url)}"></div><div><label>Link do Instagram</label><input id="profileInstagram" type="url" required value="${escapeHTML(profile.instagram_url)}"></div></div><div class="form-footer"><button class="primary-button" type="submit">Salvar perfil <span>→</span></button><span class="form-hint" id="profileMessage"></span></div></form>`;
    $('#profileForm').addEventListener('submit', saveProfile);
  }
  async function saveProfile(event) {
    event.preventDefault(); const message = $('#profileMessage'); const whatsapp = onlyDigits($('#profileWhatsapp').value);
    if (whatsapp.length < 10 || whatsapp.length > 15) { message.textContent = 'Informe o WhatsApp com DDD e código do país, se necessário.'; return; }
    const payload = { shop_name: $('#profileName').value.trim(), description: $('#profileDescription').value.trim(), address: $('#profileAddress').value.trim(), maps_url: $('#profileMaps').value.trim(), instagram_url: $('#profileInstagram').value.trim(), whatsapp_number: whatsapp };
    const { error } = await db.from('business_profile').update(payload).eq('id', true);
    if (error) { message.textContent = friendlyError(error); return; } await loadPublicData({ silent: true }); message.textContent = 'Perfil salvo e publicado.'; showToast('Perfil atualizado.');
  }

  function bindEvents() {
    $('#restartButton').addEventListener('click', resetBooking);
    $('#adminButton').addEventListener('click', () => state.session ? openAdmin() : openLogin());
    $('#loginForm').addEventListener('submit', login);
    $('#closeAdminButton').addEventListener('click', closeAdmin);
    $('#logoutButton').addEventListener('click', logout);
    $$('.admin-tabs button').forEach(button => button.addEventListener('click', async () => { state.adminTab = button.dataset.tab; if (state.adminTab === 'agenda') await loadAdminData(); renderAdmin(); }));
    window.addEventListener('focus', () => { if (configured) loadPublicData({ silent: true }); });
  }
  async function start() {
    bindEvents(); applyProfile(); renderBooking();
    if (!configured) { setConnection('Modo de demonstração — configure o Supabase', 'offline'); return; }
    try { await loadPublicData(); subscribePublic(); if (await verifyStaff()) { $('#adminButton').textContent = 'Abrir agenda'; subscribeAdmin(); } }
    catch (error) { setConnection('Falha ao conectar ao banco', 'offline'); showToast(friendlyError(error)); }
  }
  start();
})();
