// content.js — Extensão Forbiz (filtro de colaboradores + mapa) para a tela de cercas virtuais do Senior HCM

(function () {
  if (window.__forbizFenceExtLoaded) return;

  const REQUIRED_TENANT_DOMAIN = 'atriohoteis.com.br';

  function getTenantDomainFromSeniorUserInfo() {
    const raw = localStorage.getItem('SENIOR_USER_INFO');
    if (!raw) return '';

    const obj = JSON.parse(raw);

    // caminho que você informou: SENIOR_USER_INFO.data.tenantDomain
    const tenant = (obj?.data?.tenantDomain || '').toString().trim().toLowerCase();
    return tenant;
  }

  let tenantDomain = '';
  try {
    tenantDomain = getTenantDomainFromSeniorUserInfo();
  } catch (e) {
    console.log('[Extensão Forbiz Cerca] Falha ao ler tenantDomain:', e);
    return;
  }

  if (tenantDomain !== REQUIRED_TENANT_DOMAIN) {
    console.log(
      '[Extensão Forbiz Cerca] Ignorando execução: tenantDomain inválido.',
      'tenantDomain =', tenantDomain || '(vazio)',
      '| requerido =', REQUIRED_TENANT_DOMAIN
    );
    return;
  }

  window.__forbizFenceExtLoaded = true;

  const href = window.location.href;

  const IS_PONTOMOBILE = href.includes('hcm-pontomobile');
  const IS_FENCE = IS_PONTOMOBILE && href.includes('/fence');

  // Só roda na tela de criação de cerca virtual
  if (!IS_FENCE) {
    console.log(
      '[Extensão Forbiz Cerca] Ignorando frame (não é tela de cerca virtual):',
      href
    );
    return;
  }

  console.log('[Extensão Forbiz Cerca] Ativo na tela de cerca virtual:', href);

  // ======== ESTADO COMPARTILHADO ========
  let AUTH_TOKEN = null;             // "bearer xxx"
  let CURRENT_COMPANY_ID = null;     // UUID da filial selecionada (searchCompany)
  const LAST_COMPANY_KEY = 'forbizExtUltimaFilialId_v2';
  const ONBOARDING_KEY = 'forbizExtOnboardingFence_v1';
  let CURRENT_REGISTRATION = null;   // matrícula para searchRegistrationNumber
  let EMPRESAS_CACHE = [];           // cache das filiais carregadas


  // tenta carregar última filial salva
  try {
    const stored = localStorage.getItem(LAST_COMPANY_KEY);
    if (stored) CURRENT_COMPANY_ID = stored;
  } catch (e) {
    console.warn(
      '[Extensão Forbiz Cerca] Não foi possível ler o último ID de filial salvo:',
      e
    );
  }

  function setAuthToken(token) {
    if (!token || typeof token !== 'string') return;
    AUTH_TOKEN = token;
    try {
      console.log(
        '[Extensão Forbiz Cerca] Token capturado:',
        token.substring(0, 25) + '...'
      );
    } catch {
      console.log('[Extensão Forbiz Cerca] Token capturado.');
    }
  }

  // ======== PATCH XHR ========
  (function patchXHR() {
    const origOpen = XMLHttpRequest.prototype.open;
    const origSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
      this.__forbizUrl = url;
      return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
      try {
        if (
          name &&
          typeof name === 'string' &&
          name.toLowerCase() === 'authorization' &&
          value &&
          typeof value === 'string' &&
          value.toLowerCase().includes('bearer ')
        ) {
          setAuthToken(value);
        }
      } catch (e) {
        console.warn(
          '[Extensão Forbiz Cerca] Erro ao inspecionar Authorization no XHR:',
          e
        );
      }

      return origSetRequestHeader.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
      try {
        if (
          this.__forbizUrl &&
          typeof this.__forbizUrl === 'string' &&
          this.__forbizUrl.includes('employeesByFilterQuery') &&
          body
        ) {
          let obj = null;
          try {
            obj = JSON.parse(body);
          } catch (e) {
            console.warn(
              '[Extensão Forbiz Cerca] Body employeesByFilterQuery não era JSON (XHR).',
              e
            );
          }

          if (obj && typeof obj === 'object') {
            obj.filter = obj.filter || {};
            if (obj.filter.activePlatformUser == null)
              obj.filter.activePlatformUser = true;
            if (!obj.filter.status) obj.filter.status = 'ACTIVE';

            //  Só força a filial se o usuário tiver escolhido uma
            if (CURRENT_COMPANY_ID) {
              obj.filter.searchCompany = CURRENT_COMPANY_ID;
            }

            // 🔹 Matrícula funciona COM ou SEM filial
            if (CURRENT_REGISTRATION && CURRENT_REGISTRATION.trim()) {
              obj.filter.searchRegistrationNumber =
                CURRENT_REGISTRATION.trim();
            } else {
              // se quiser garantir que não fique lixo anterior:
              delete obj.filter.searchRegistrationNumber;
            }

            body = JSON.stringify(obj);

            console.log(
              '[Extensão Forbiz Cerca] (XHR) searchCompany =',
              CURRENT_COMPANY_ID || '(não definida)',
              'searchRegistrationNumber =',
              CURRENT_REGISTRATION || '(não definido)'
            );
          }
        }

      } catch (e) {
        console.warn('[Extensão Forbiz Cerca] Erro ao ajustar body do XHR:', e);
      }

      return origSend.call(this, body);
    };
  })();

  // ======== PATCH FETCH ========
  (function patchFetch() {
    if (!window.fetch) return;

    const origFetch = window.fetch;

    window.fetch = function (input, init) {
      try {
        const url =
          typeof input === 'string'
            ? input
            : (input && input.url) || '';

        // Captura Authorization
        if (init && init.headers) {
          let auth = null;
          const headers = init.headers;

          if (headers instanceof Headers) {
            auth = headers.get('Authorization') || headers.get('authorization');
          } else if (typeof headers === 'object') {
            auth = headers['Authorization'] || headers['authorization'];
          }

          if (auth && typeof auth === 'string' && auth.toLowerCase().includes('bearer ')) {
            setAuthToken(auth);
          }
        }

        // injeta searchCompany nos POST de employeesByFilterQuery
        if (
          url &&
          typeof url === 'string' &&
          url.includes('employeesByFilterQuery') &&
          init &&
          init.body
        ) {
          let obj = null;
          try {
            obj = JSON.parse(init.body);
          } catch (e) {
            console.warn(
              '[Extensão Forbiz Cerca] Body employeesByFilterQuery não era JSON (fetch).',
              e
            );
          }

          if (obj && typeof obj === 'object') {
            obj.filter = obj.filter || {};
            if (obj.filter.activePlatformUser == null)
              obj.filter.activePlatformUser = true;
            if (!obj.filter.status) obj.filter.status = 'ACTIVE';

            // Só força a filial se tiver sido escolhida
            if (CURRENT_COMPANY_ID) {
              obj.filter.searchCompany = CURRENT_COMPANY_ID;
            }

            //Matrícula sempre aplicada, independente da filial
            if (CURRENT_REGISTRATION && CURRENT_REGISTRATION.trim()) {
              obj.filter.searchRegistrationNumber =
                CURRENT_REGISTRATION.trim();
            } else {
              delete obj.filter.searchRegistrationNumber;
            }

            init = Object.assign({}, init, {
              body: JSON.stringify(obj),
            });

            console.log(
              '[Extensão Forbiz Cerca] (fetch) searchCompany =',
              CURRENT_COMPANY_ID || '(não definida)',
              'searchRegistrationNumber =',
              CURRENT_REGISTRATION || '(não definido)'
            );
          }
        }
      } catch (e) {
        console.warn('[Extensão Forbiz Cerca] Erro no patch de fetch:', e);
      }

      return origFetch(input, init);
    };
  })();

  // ======== AGUARDAR TOKEN ========
  function waitForToken(callback) {
    if (AUTH_TOKEN) {
      callback(AUTH_TOKEN);
      return;
    }

    let tentativas = 0;
    const maxTentativas = 40; // ~20s

    const interval = setInterval(() => {
      if (AUTH_TOKEN) {
        clearInterval(interval);
        callback(AUTH_TOKEN);
      } else if (tentativas++ >= maxTentativas) {
        clearInterval(interval);
        console.warn(
          '[Extensão Forbiz Cerca] Não foi possível capturar o token automaticamente.'
        );
      }
    }, 500);
  }
  function preencherSelectEmpresas(selectElement, empresas, selectedId, filtroTexto) {
    try {
      while (selectElement.firstChild) {
        selectElement.removeChild(selectElement.firstChild);
      }

      const optPadrao = document.createElement('option');
      optPadrao.value = '';
      optPadrao.textContent = 'Todas as filiais (padrão do sistema)';
      selectElement.appendChild(optPadrao);

      const termo = (filtroTexto || '').toLowerCase();

      const filtradas = empresas.filter((c) => {
        if (!termo) return true;
        const nome = (c.name || '').toLowerCase();
        const cnpj = (c.cnpj || '').toLowerCase();
        return nome.includes(termo) || cnpj.includes(termo);
      });

      filtradas.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id || '';

        const nome = c.name || 'Sem nome';
        const cnpj = c.cnpj || '';
        opt.textContent = cnpj ? `${cnpj} - ${nome}` : nome;

        selectElement.appendChild(opt);
      });

      if (selectedId) {
        const existe = Array.from(selectElement.options).some(
          (o) => o.value === selectedId
        );
        if (existe) {
          selectElement.value = selectedId;
        }
      }
    } catch (e) {
      console.error(
        '[Extensão Forbiz Cerca] Erro ao montar select de empresas:',
        e
      );
    }
  }


  // ======== BUSCA DE EMPRESAS (FILIAIS) ========
  async function carregarEmpresas(selectElement) {
    waitForToken(async (token) => {
      const baseUrl =
        'https://platform.senior.com.br/t/senior.com.br/bridge/1.0/rest/hcm/pontomobile/entities/company';

      const pageSize = 100;
      let page = 0;
      let totalPages = 1;
      const todas = [];

      console.log('[Extensão Forbiz Cerca] Buscando lista de empresas / filiais...');

      try {
        while (page < totalPages) {
          const url = `${baseUrl}?page=${page}&size=${pageSize}`;
          const resp = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: token,
              Accept: 'application/json',
            },
          });

          if (!resp.ok) {
            console.error(
              '[Extensão Forbiz Cerca] Erro ao buscar empresas:',
              resp.status
            );
            const text = await resp.text();
            console.error('Resposta:', text);
            break;
          }

          const data = await resp.json();

          if (Array.isArray(data.contents)) {
            todas.push(...data.contents);
          } else if (data.contents) {
            todas.push(data.contents);
          }

          if (typeof data.totalPages === 'number') {
            totalPages = data.totalPages || 1;
          }

          page += 1;

          if (
            !data.contents ||
            (Array.isArray(data.contents) && data.contents.length === 0)
          ) {
            break;
          }
        }
      } catch (e) {
        console.error(
          '[Extensão Forbiz Cerca] Erro inesperado ao carregar empresas:',
          e
        );
      }

      console.log(
        `[Extensão Forbiz Cerca] Total de empresas carregadas: ${todas.length}`
      );

      // guarda no cache e monta o select (sem filtro inicial)
      EMPRESAS_CACHE = todas.slice();
      preencherSelectEmpresas(selectElement, EMPRESAS_CACHE, CURRENT_COMPANY_ID, '');
    });
  }


  // ======== UI: SELETOR DE FILIAL ========
function injetarUIFiltroFilial() {
  if (document.getElementById('forbizFiltroFilialContainer')) return;

  console.log(
    '[Extensão Forbiz Cerca] Injetando UI do filtro de colaboradores / filial.'
  );

  const container = document.createElement('div');
  container.id = 'forbizFiltroFilialContainer';
  container.style.position = 'fixed';
  container.style.top = '16px';
  container.style.left = '16px';
  container.style.zIndex = '9999';
  container.style.background = '#f0fdf4'; // verde bem claro
  container.style.borderRadius = '10px';
  container.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.15)';
  container.style.padding = '8px 10px';
  container.style.fontFamily =
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  container.style.fontSize = '11px';
  container.style.color = '#022c22';
  container.style.border = '1px solid #bbf7d0';
  container.style.maxWidth = '320px';

  // ===== HEADER com botão de minimizar =====
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.gap = '6px';
  header.style.marginBottom = '4px';

  const titulo = document.createElement('div');
  titulo.textContent = 'Filtro de colaboradores – extensão';
  titulo.style.fontWeight = '600';
  titulo.style.fontSize = '12px';
  titulo.style.color = '#065f46';

  const headerRight = document.createElement('div');
  headerRight.style.display = 'flex';
  headerRight.style.alignItems = 'center';
  headerRight.style.gap = '4px';

  const badge = document.createElement('span');
  badge.textContent = 'Forbiz';
  badge.style.fontSize = '9px';
  badge.style.fontWeight = '600';
  badge.style.padding = '2px 6px';
  badge.style.borderRadius = '999px';
  badge.style.background = '#dcfce7';
  badge.style.color = '#065f46';

  const btnMin = document.createElement('button');
  btnMin.type = 'button';
  btnMin.textContent = '–';
  btnMin.title = 'Minimizar painel';
  btnMin.style.width = '18px';
  btnMin.style.height = '18px';
  btnMin.style.borderRadius = '999px';
  btnMin.style.border = '1px solid #6ee7b7';
  btnMin.style.background = '#ecfdf5';
  btnMin.style.cursor = 'pointer';
  btnMin.style.fontSize = '11px';
  btnMin.style.lineHeight = '1';
  btnMin.style.display = 'flex';
  btnMin.style.alignItems = 'center';
  btnMin.style.justifyContent = 'center';
  btnMin.style.color = '#047857';
  btnMin.style.padding = '0';

  headerRight.appendChild(badge);
  headerRight.appendChild(btnMin);

  header.appendChild(titulo);
  header.appendChild(headerRight);

  // ===== será minimizado/expandido =====
  const miolo = document.createElement('div');
  miolo.id = 'forbizFiltroFilialBody';

  const subtitulo = document.createElement('div');
  subtitulo.textContent =
    'Selecione a filial e, se quiser, informe uma matrícula. Esses filtros serão usados na tela de criação da cerca, quando você abrir o filtro de colaboradores.';
  subtitulo.style.fontSize = '10px';
  subtitulo.style.marginBottom = '6px';
  subtitulo.style.color = '#047857';

  // campo de busca de filiais pelo nome/CNPJ
  const buscaFilial = document.createElement('input');
  buscaFilial.type = 'text';
  buscaFilial.id = 'forbizFiltroFilialBusca';
  buscaFilial.placeholder = 'Buscar filial por nome ou CNPJ...';
  buscaFilial.style.width = '100%';
  buscaFilial.style.fontSize = '11px';
  buscaFilial.style.padding = '4px 6px';
  buscaFilial.style.borderRadius = '6px';
  buscaFilial.style.border = '1px solid #6ee7b7';
  buscaFilial.style.outline = 'none';
  buscaFilial.style.background = '#ecfdf5';
  buscaFilial.style.marginBottom = '4px';

  const select = document.createElement('select');
  select.id = 'forbizFiltroFilialSelect';
  select.style.width = '100%';
  select.style.fontSize = '11px';
  select.style.padding = '4px 6px';
  select.style.borderRadius = '6px';
  select.style.border = '1px solid #6ee7b7';
  select.style.outline = 'none';
  select.style.background = '#ecfdf5';

  select.addEventListener('change', (e) => {
    const val = e.target.value || '';
    CURRENT_COMPANY_ID = val || null;

    try {
      if (val) {
        localStorage.setItem(LAST_COMPANY_KEY, val);
      } else {
        localStorage.removeItem(LAST_COMPANY_KEY);
      }
    } catch (err) {
      console.warn(
        '[Extensão Forbiz Cerca] Não foi possível salvar última filial:',
        err
      );
    }

    if (val) {
      console.log(
        '[Extensão Forbiz Cerca] Filial selecionada para searchCompany =',
        val
      );
    } else {
      console.log(
        '[Extensão Forbiz Cerca] Filial limpa – sistema volta a usar o comportamento padrão.'
      );
    }
  });

  // filtro opcional por matrícula
  const matriculaLabel = document.createElement('div');
  matriculaLabel.textContent = 'Filtro opcional por matrícula';
  matriculaLabel.style.fontSize = '10px';
  matriculaLabel.style.marginTop = '6px';
  matriculaLabel.style.marginBottom = '2px';
  matriculaLabel.style.color = '#047857';

  const inputMatricula = document.createElement('input');
  inputMatricula.type = 'text';
  inputMatricula.id = 'forbizFiltroMatricula';
  inputMatricula.placeholder = 'Digite a matrícula (ex.: 12345)';
  inputMatricula.style.width = '100%';
  inputMatricula.style.fontSize = '11px';
  inputMatricula.style.padding = '4px 6px';
  inputMatricula.style.borderRadius = '6px';
  inputMatricula.style.border = '1px solid #6ee7b7';
  inputMatricula.style.outline = 'none';
  inputMatricula.style.background = '#ecfdf5';

  inputMatricula.addEventListener('input', (e) => {
    const val = (e.target.value || '').trim();
    CURRENT_REGISTRATION = val || null;

    if (val) {
      console.log(
        '[Extensão Forbiz Cerca] Filtro de matrícula aplicado =',
        val
      );
    } else {
      console.log(
        '[Extensão Forbiz Cerca] Filtro de matrícula limpo – não será enviado searchRegistrationNumber.'
      );
    }
  });

  const ajuda = document.createElement('div');
  ajuda.textContent =
    'Na tela da cerca, clique em "Adicionar colaborador" e depois no botão de filtro (ícone de lupa). Se uma filial/matrícula estiver definida aqui, o sistema já aplica esses filtros. Se quiser trocar, ajuste aqui e clique no filtro novamente.';
  ajuda.style.fontSize = '10px';
  ajuda.style.marginTop = '4px';
  ajuda.style.color = '#047857';

  miolo.appendChild(subtitulo);
  miolo.appendChild(buscaFilial);
  miolo.appendChild(select);
  miolo.appendChild(matriculaLabel);
  miolo.appendChild(inputMatricula);
  miolo.appendChild(ajuda);

  container.appendChild(header);
  container.appendChild(miolo);

  document.body.appendChild(container);

  // carrega as empresas (sem filtro inicial)
  carregarEmpresas(select);

  // liga o campo de busca de filiais no cache (EMPRESAS_CACHE + preencherSelectEmpresas)
  buscaFilial.addEventListener('input', () => {
    const termo = buscaFilial.value || '';
    preencherSelectEmpresas(
      select,
      EMPRESAS_CACHE || [],
      CURRENT_COMPANY_ID,
      termo
    );
  });

  // lógica do minimizar
  let minimizado = true;

  // já começa minimizado
  miolo.style.display = 'none';
  btnMin.textContent = '+';
  btnMin.title = 'Expandir painel';

  btnMin.addEventListener('click', () => {
    minimizado = !minimizado;
    if (minimizado) {
      miolo.style.display = 'none';
      btnMin.textContent = '+';
      btnMin.title = 'Expandir painel';
    } else {
      miolo.style.display = '';
      btnMin.textContent = '–';
      btnMin.title = 'Minimizar painel';
    }
  });

}
  // ======== LEAFLET: CAPTURAR MAPA ========
  function instalarHookLeaflet() {
    let hookInstalado = false;
    let tentativas = 0;

    const hookInterval = setInterval(() => {
      tentativas++;

      if (hookInstalado) {
        clearInterval(hookInterval);
        return;
      }

      if (!window.L) {
        if (tentativas === 1 || tentativas % 10 === 0) {
          console.log(
            '[Extensão Forbiz Cerca] aguardando Leaflet L... tentativa',
            tentativas
          );
        }
        if (tentativas > 80) {
          console.log('[Extensão Forbiz Cerca] desisti: L não apareceu.');
          clearInterval(hookInterval);
        }
        return;
      }

      console.log('[Extensão Forbiz Cerca] Leaflet L encontrado:', window.L);

      if (typeof window.L.map === 'function') {
        const originalLmap = window.L.map;
        window.L.map = function (...args) {
          const mapa = originalLmap.apply(this, args);
          window.__forbizLeafletMap = mapa;
          console.log(
            '[Extensão Forbiz Cerca] mapa capturado via L.map:',
            mapa
          );
          return mapa;
        };
      }

      if (
        window.L.Map &&
        window.L.Map.prototype &&
        typeof window.L.Map.prototype.initialize === 'function'
      ) {
        const originalInit = window.L.Map.prototype.initialize;

        window.L.Map.prototype.initialize = function (...args) {
          const result = originalInit.apply(this, args);
          window.__forbizLeafletMap = this;
          console.log(
            '[Extensão Forbiz Cerca] mapa capturado via L.Map.prototype.initialize:',
            this
          );
          return result;
        };

        console.log(
          '[Extensão Forbiz Cerca] hook em L.Map.prototype.initialize instalado.'
        );
      } else {
        console.log(
          '[Extensão Forbiz Cerca] NÃO consegui hookar L.Map.prototype.initialize.'
        );
      }

      hookInstalado = true;
      clearInterval(hookInterval);
    }, 200);
  }

  function centralizarMapa(lat, lon) {
    try {
      const mapa = window.__forbizLeafletMap;

      if (mapa && typeof mapa.setView === 'function') {
        let zoomFinal = 18; // zoom padrão alto

        try {
          if (typeof mapa.getMaxZoom === 'function') {
            const max = mapa.getMaxZoom();
            if (typeof max === 'number' && !Number.isNaN(max)) {
              zoomFinal = max;
            }
          }
        } catch {
          // se der erro, usa o padrão 18
        }

        console.log(
          '[Extensão Forbiz Cerca] centralizando mapa em',
          lat,
          lon,
          'zoom =',
          zoomFinal
        );

        // sempre vai pro zoom máximo / alto
        mapa.setView([lat, lon], zoomFinal);
      } else {
        console.log(
          '[Extensão Forbiz Cerca] mapa ainda não capturado. L =',
          window.L
        );
      }
    } catch (e) {
      console.error('[Extensão Forbiz Cerca] erro ao centralizar mapa:', e);
    }
  }
  // ======== BUSCA NO NOMINATIM + CENTRALIZAR MAPA ========
   // ======== LEAFLET: CAPTURAR MAPA ========
  function instalarHookLeaflet() {
    let hookInstalado = false;
    let tentativas = 0;

    const hookInterval = setInterval(() => {
      tentativas++;

      if (hookInstalado) {
        clearInterval(hookInterval);
        return;
      }

      if (!window.L) {
        if (tentativas === 1 || tentativas % 10 === 0) {
          console.log(
            '[Extensão Forbiz Cerca] aguardando Leaflet L... tentativa',
            tentativas
          );
        }
        if (tentativas > 80) {
          console.log('[Extensão Forbiz Cerca] desisti: L não apareceu.');
          clearInterval(hookInterval);
        }
        return;
      }

      console.log('[Extensão Forbiz Cerca] Leaflet L encontrado:', window.L);

      if (typeof window.L.map === 'function') {
        const originalLmap = window.L.map;
        window.L.map = function (...args) {
          const mapa = originalLmap.apply(this, args);
          window.__forbizLeafletMap = mapa;
          console.log(
            '[Extensão Forbiz Cerca] mapa capturado via L.map:',
            mapa
          );
          return mapa;
        };
      }

      if (
        window.L.Map &&
        window.L.Map.prototype &&
        typeof window.L.Map.prototype.initialize === 'function'
      ) {
        const originalInit = window.L.Map.prototype.initialize;

        window.L.Map.prototype.initialize = function (...args) {
          const result = originalInit.apply(this, args);
          window.__forbizLeafletMap = this;
          console.log(
            '[Extensão Forbiz Cerca] mapa capturado via L.Map.prototype.initialize:',
            this
          );
          return result;
        };

        console.log(
          '[Extensão Forbiz Cerca] hook em L.Map.prototype.initialize instalado.'
        );
      } else {
        console.log(
          '[Extensão Forbiz Cerca] NÃO consegui hookar L.Map.prototype.initialize.'
        );
      }

      hookInstalado = true;
      clearInterval(hookInterval);
    }, 200);
  }

  function centralizarMapa(lat, lon) {
    try {
      const mapa = window.__forbizLeafletMap;

      if (mapa && typeof mapa.setView === 'function') {
        let zoomFinal = 18; // zoom padrão alto

        try {
          if (typeof mapa.getMaxZoom === 'function') {
            const max = mapa.getMaxZoom();
            if (typeof max === 'number' && !Number.isNaN(max)) {
              zoomFinal = max;
            }
          }
        } catch {
          // se der erro, usa o padrão 18
        }

        console.log(
          '[Extensão Forbiz Cerca] centralizando mapa em',
          lat,
          lon,
          'zoom =',
          zoomFinal
        );

        // sempre vai pro zoom máximo / alto
        mapa.setView([lat, lon], zoomFinal);
      } else {
        console.log(
          '[Extensão Forbiz Cerca] mapa ainda não capturado. L =',
          window.L
        );
      }
    } catch (e) {
      console.error('[Extensão Forbiz Cerca] erro ao centralizar mapa:', e);
    }
  }

  // ======== MENSAGEM SUTIL NO POP-UP DO MAPA ========
  let GEO_MSG_ELEMENT = null;
  let GEO_MSG_TIMEOUT = null;

  function mostrarMensagemGeo(texto) {
    if (!GEO_MSG_ELEMENT) return;

    GEO_MSG_ELEMENT.textContent = texto || '';
    GEO_MSG_ELEMENT.style.display = texto ? 'block' : 'none';
    GEO_MSG_ELEMENT.style.opacity = '1';

    if (GEO_MSG_TIMEOUT) {
      clearTimeout(GEO_MSG_TIMEOUT);
      GEO_MSG_TIMEOUT = null;
    }

    if (texto) {
      GEO_MSG_TIMEOUT = setTimeout(() => {
        GEO_MSG_ELEMENT.style.opacity = '0';
        setTimeout(() => {
          GEO_MSG_ELEMENT.style.display = 'none';
        }, 400);
      }, 4500); // tempo suficiente pra pessoa perceber
    }
  }

  async function buscarCoordenadasNominatim(query) {
    if (!query) return null;

    const url =
      'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=' +
      encodeURIComponent(query);

    console.log(
      '[Extensão Forbiz Cerca] Buscando coordenadas no Nominatim para:',
      query
    );

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    const data = await resp.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.warn(
        '[Extensão Forbiz Cerca] Nenhum resultado encontrado no Nominatim para:',
        query
      );
      return null;
    }

    const primeiro = data[0];
    const lat = parseFloat(primeiro.lat);
    const lon = parseFloat(primeiro.lon);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      console.warn(
        '[Extensão Forbiz Cerca] Resposta do Nominatim sem coordenadas válidas:',
        primeiro
      );
      return null;
    }

    return { lat, lon };
  }

  // ======== BUSCA NO NOMINATIM + CENTRALIZAR MAPA ========
  // ======== BUSCA NO NOMINATIM + CENTRALIZAR MAPA ========
  async function handleSearch(inputRua, inputBairro, inputCidade, selectUF, inputCep, inputLivre) {
    try {
      const rua = (inputRua?.value || '').trim();
      const bairro = (inputBairro?.value || '').trim();
      const cidade = (inputCidade?.value || '').trim();
      const uf = (selectUF?.value || '').trim();
      const cep = (inputCep?.value || '').replace(/\D/g, '').trim();
      const livre = (inputLivre?.value || '').trim();

      // 1) Se tiver CEP, usa SOMENTE o CEP
      if (cep) {
        const queryCep = cep;
        console.log(
          '[Extensão Forbiz Cerca] Buscando endereço usando somente o CEP:',
          queryCep
        );

        const coordCep = await buscarCoordenadasNominatim(queryCep);

        if (coordCep) {
          centralizarMapa(coordCep.lat, coordCep.lon);
          return;
        }

        mostrarMensagemGeo(
          'Endereço não encontrado para o CEP informado. Confira o CEP e tente novamente.'
        );
        return;
      }

      // 2) Pesquisa livre (ex.: "ibis araçatuba")
      if (livre) {
        const queryLivre = `${livre}, Brasil`;
        console.log(
          '[Extensão Forbiz Cerca] Buscando endereço usando pesquisa livre:',
          queryLivre
        );

        const coordLivre = await buscarCoordenadasNominatim(queryLivre);

        if (coordLivre) {
          centralizarMapa(coordLivre.lat, coordLivre.lon);
          return;
        }

        // Se só tinha a pesquisa livre (sem rua/cidade/etc.), para aqui
        if (!rua && !bairro && !cidade && !uf) {
          mostrarMensagemGeo(
            'Não foi possível localizar este local. Tente ajustar o nome ou usar o endereço completo.'
          );
          return;
        }

        // Se também tem endereço estruturado, tenta na sequência
        mostrarMensagemGeo(
          'Não foi possível localizar este local. Tentando buscar pelo endereço informado...'
        );
      }

      // 3) Sem CEP e sem nada útil de endereço
      if (!rua && !cidade) {
        console.warn(
          '[Extensão Forbiz Cerca] Informe pelo menos a rua ou a cidade para buscar o endereço.'
        );
        mostrarMensagemGeo(
          'Informe pelo menos a rua ou a cidade para buscar o endereço.'
        );
        return;
      }

      // Busca completa: rua + bairro + cidade + UF
      let queryCompleta = '';
      if (rua) queryCompleta += rua;
      if (bairro) queryCompleta += (queryCompleta ? ', ' : '') + bairro;
      if (cidade) queryCompleta += (queryCompleta ? ', ' : '') + cidade;
      if (uf) queryCompleta += (queryCompleta ? ', ' : '') + uf + ', Brasil';

      console.log(
        '[Extensão Forbiz Cerca] Buscando coordenadas para endereço:',
        queryCompleta
      );

      let coordenadas = await buscarCoordenadasNominatim(queryCompleta);

      // 4) Se não encontrar e tiver RUA + BAIRRO → tenta de novo sem o bairro
      if (!coordenadas && rua && bairro) {
        let querySemBairro = '';
        if (rua) querySemBairro += rua;
        if (cidade) querySemBairro += (querySemBairro ? ', ' : '') + cidade;
        if (uf) querySemBairro += (querySemBairro ? ', ' : '') + uf + ', Brasil';

        console.log(
          '[Extensão Forbiz Cerca] Tentando novamente sem o bairro:',
          querySemBairro
        );

        coordenadas = await buscarCoordenadasNominatim(querySemBairro);

        if (coordenadas) {
          mostrarMensagemGeo(
            'Bairro não encontrado. Centralizado somente na rua informada.'
          );
        }
      }

      // 5) Se ainda assim não achou, avisa na tela
      if (!coordenadas) {
        mostrarMensagemGeo(
          'Endereço não encontrado. Confira os dados informados e tente novamente.'
        );
        return;
      }

      centralizarMapa(coordenadas.lat, coordenadas.lon);
    } catch (e) {
      console.error(
        '[Extensão Forbiz Cerca] Erro inesperado em handleSearch:',
        e
      );
      mostrarMensagemGeo(
        'Não foi possível buscar o endereço agora. Tente novamente em instantes.'
      );
    }
  }


  // ======== UI: BUSCA DE ENDEREÇO (MAPA) ========
   // ======== UI: BUSCA DE ENDEREÇO (MAPA) ========
  function injetarUIMapa() {
    if (document.getElementById('forbizGeoSearchContainer')) return;

    console.log(
      '[Extensão Forbiz Cerca] Injetando UI de busca de endereço no mapa.'
    );

    const container = document.createElement('div');
    container.id = 'forbizGeoSearchContainer';
    container.style.position = 'fixed';
    container.style.top = '80px';
    container.style.right = '30px';
    container.style.zIndex = '9999';
    container.style.background = '#f8fafc';
    container.style.padding = '10px 12px';
    container.style.borderRadius = '12px';
    container.style.boxShadow = '0 4px 18px rgba(15, 23, 42, 0.16)';
    container.style.fontFamily =
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    container.style.fontSize = '11px';
    container.style.maxWidth = '280px';
    container.style.border = '1px solid #dbeafe';

    // ===== HEADER com minimizar =====
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.marginBottom = '6px';
    header.style.gap = '6px';

    const titulo = document.createElement('div');
    titulo.textContent = 'Mapa da cerca – localizar endereço';
    titulo.style.fontWeight = '600';
    titulo.style.fontSize = '12px';
    titulo.style.color = '#0f766e';

    const headerRight = document.createElement('div');
    headerRight.style.display = 'flex';
    headerRight.style.alignItems = 'center';
    headerRight.style.gap = '4px';

    const badge = document.createElement('span');
    badge.textContent = 'Forbiz';
    badge.style.fontSize = '9px';
    badge.style.fontWeight = '600';
    badge.style.padding = '2px 6px';
    badge.style.borderRadius = '999px';
    badge.style.background = '#dbeafe';
    badge.style.color = '#1d4ed8';

    const btnMin = document.createElement('button');
    btnMin.type = 'button';
    btnMin.textContent = '–';
    btnMin.title = 'Minimizar painel';
    btnMin.style.width = '18px';
    btnMin.style.height = '18px';
    btnMin.style.borderRadius = '999px';
    btnMin.style.border = '1px solid #bfdbfe';
    btnMin.style.background = '#eff6ff';
    btnMin.style.cursor = 'pointer';
    btnMin.style.fontSize = '11px';
    btnMin.style.lineHeight = '1';
    btnMin.style.display = 'flex';
    btnMin.style.alignItems = 'center';
    btnMin.style.justifyContent = 'center';
    btnMin.style.color = '#1d4ed8';
    btnMin.style.padding = '0';

    headerRight.appendChild(badge);
    headerRight.appendChild(btnMin);

    header.appendChild(titulo);
    header.appendChild(headerRight);

    // ===== CORPO que será minimizado/expandido =====
    const body = document.createElement('div');
    body.id = 'forbizGeoSearchBody';

    // Pesquisa livre (nome do local, hotel, empresa, etc.)
    const inputLivre = document.createElement('input');
    inputLivre.type = 'text';
    inputLivre.id = 'geoLivreSenior';
    inputLivre.placeholder = 'Pesquisa livre (ex.: Ibis Araçatuba)';
    inputLivre.style.width = '100%';
    inputLivre.style.padding = '4px 6px';
    inputLivre.style.fontSize = '11px';
    inputLivre.style.marginBottom = '6px';
    inputLivre.style.borderRadius = '8px';
    inputLivre.style.border = '1px solid #bfdbfe';
    inputLivre.style.outline = 'none';
    inputLivre.style.background = '#ffffff';

    const inputRua = document.createElement('input');
    inputRua.type = 'text';
    inputRua.id = 'geoRuaSenior';
    inputRua.placeholder = 'Rua / Av (ex.: R. Brg. Franco, 153)';
    inputRua.style.width = '100%';
    inputRua.style.padding = '4px 6px';
    inputRua.style.fontSize = '11px';
    inputRua.style.marginBottom = '4px';
    inputRua.style.borderRadius = '8px';
    inputRua.style.border = '1px solid #bfdbfe';
    inputRua.style.outline = 'none';
    inputRua.style.background = '#ffffff';

    const inputBairro = document.createElement('input');
    inputBairro.type = 'text';
    inputBairro.id = 'geoBairroSenior';
    inputBairro.placeholder = 'Bairro (opcional)';
    inputBairro.style.width = '100%';
    inputBairro.style.padding = '4px 6px';
    inputBairro.style.fontSize = '11px';
    inputBairro.style.marginBottom = '4px';
    inputBairro.style.borderRadius = '8px';
    inputBairro.style.border = '1px solid #bfdbfe';
    inputBairro.style.outline = 'none';
    inputBairro.style.background = '#ffffff';

    // Campo de CEP (opcional, tem prioridade máxima quando preenchido)
    const inputCep = document.createElement('input');
    inputCep.type = 'text';
    inputCep.id = 'geoCepSenior';
    inputCep.placeholder = 'CEP (apenas números, opcional)';
    inputCep.style.width = '100%';
    inputCep.style.padding = '4px 6px';
    inputCep.style.fontSize = '11px';
    inputCep.style.marginBottom = '4px';
    inputCep.style.borderRadius = '8px';
    inputCep.style.border = '1px solid #bfdbfe';
    inputCep.style.outline = 'none';
    inputCep.style.background = '#ffffff';

    const linhaCidadeUF = document.createElement('div');
    linhaCidadeUF.style.display = 'flex';
    linhaCidadeUF.style.gap = '4px';
    linhaCidadeUF.style.marginBottom = '4px';

    const inputCidade = document.createElement('input');
    inputCidade.type = 'text';
    inputCidade.id = 'geoCidadeSenior';
    inputCidade.placeholder = 'Cidade';
    inputCidade.style.flex = '2';
    inputCidade.style.padding = '4px 6px';
    inputCidade.style.fontSize = '11px';
    inputCidade.style.borderRadius = '8px';
    inputCidade.style.border = '1px solid #bfdbfe';
    inputCidade.style.outline = 'none';
    inputCidade.style.background = '#ffffff';

    const selectUF = document.createElement('select');
    selectUF.id = 'geoUFSenior';
    selectUF.style.flex = '1';
    selectUF.style.padding = '4px 6px';
    selectUF.style.fontSize = '11px';
    selectUF.style.borderRadius = '8px';
    selectUF.style.border = '1px solid #bfdbfe';
    selectUF.style.outline = 'none';
    selectUF.style.background = '#ffffff';
    selectUF.style.textTransform = 'uppercase';

    // opção placeholder
    const optPlaceholder = document.createElement('option');
    optPlaceholder.value = '';
    optPlaceholder.textContent = 'UF';
    optPlaceholder.disabled = true;
    optPlaceholder.selected = true;
    selectUF.appendChild(optPlaceholder);

    // lista de UFs
    [
      'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
      'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
      'RS','RO','RR','SC','SP','SE','TO'
    ].forEach((uf) => {
      const opt = document.createElement('option');
      opt.value = uf;
      opt.textContent = uf;
      selectUF.appendChild(opt);
    });

    linhaCidadeUF.appendChild(inputCidade);
    linhaCidadeUF.appendChild(selectUF);

    const btn = document.createElement('button');
    btn.textContent = 'Centralizar mapa nesse endereço';
    btn.style.width = '100%';
    btn.style.padding = '5px 8px';
    btn.style.fontSize = '11px';
    btn.style.fontWeight = '600';
    btn.style.borderRadius = '8px';
    btn.style.border = 'none';
    btn.style.cursor = 'pointer';
    btn.style.background =
      'linear-gradient(135deg, #0ea5e9, #2563eb)';
    btn.style.color = '#ffffff';

    const exemplo = document.createElement('div');
    exemplo.textContent =
      'Você pode usar a pesquisa livre (ex.: "Ibis Araçatuba"), ou preencher CEP/endereço. Ex.: R. Brg. Franco, 153 - Rebouças, Curitiba - PR.';
    exemplo.style.marginTop = '6px';
    exemplo.style.color = '#64748b';
    exemplo.style.fontSize = '10px';

    // área sutil para mensagens (erros/avisos)
    const msg = document.createElement('div');
    msg.id = 'forbizGeoMessage';
    msg.style.marginTop = '4px';
    msg.style.fontSize = '10px';
    msg.style.lineHeight = '1.4';
    msg.style.display = 'none';
    msg.style.padding = '4px 6px';
    msg.style.borderRadius = '6px';
    msg.style.background = '#eff6ff';
    msg.style.color = '#1e40af';
    msg.style.border = '1px solid #bfdbfe';
    msg.style.transition = 'opacity 0.4s ease';

    GEO_MSG_ELEMENT = msg;

    // Monta o corpo
    body.appendChild(inputLivre);
    body.appendChild(inputRua);
    body.appendChild(inputBairro);
    body.appendChild(inputCep);
    body.appendChild(linhaCidadeUF);
    body.appendChild(btn);
    body.appendChild(exemplo);
    body.appendChild(msg);

    container.appendChild(header);
    container.appendChild(body);

    document.body.appendChild(container);

    const callHandle = () => {
      handleSearch(
        inputRua,
        inputBairro,
        inputCidade,
        selectUF,
        inputCep,
        inputLivre
      );
    };

    btn.addEventListener('click', callHandle);
    inputLivre.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') callHandle();
    });
    inputRua.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') callHandle();
    });
    inputCidade.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') callHandle();
    });
    inputCep.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') callHandle();
    });
    selectUF.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') callHandle();
    });

    // lógica do minimizar
    let minimizado = true;

    // já começa minimizado
    body.style.display = 'none';
    btnMin.textContent = '+';
    btnMin.title = 'Expandir painel';

    btnMin.addEventListener('click', () => {
      minimizado = !minimizado;
      if (minimizado) {
        body.style.display = 'none';
        btnMin.textContent = '+';
        btnMin.title = 'Expandir painel';
      } else {
        body.style.display = '';
        btnMin.textContent = '–';
        btnMin.title = 'Minimizar painel';
      }
    });
  }


  // ======== POP-UP DE ONBOARDING / APRENDIZADO ========
function mostrarOnboarding() {
  try {
    const flag = localStorage.getItem(ONBOARDING_KEY);
    // só não mostra se o usuário tiver escolhido explicitamente "não mostrar novamente"
    if (flag === 'never') {
      return;
    }
  } catch {
    // se der erro, ainda mostramos o popup
  }


    if (document.getElementById('forbizOnboardingOverlay')) return;

    console.log('[Extensão Forbiz Cerca] Exibindo pop-up de orientação.');

    const overlay = document.createElement('div');
    overlay.id = 'forbizOnboardingOverlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(15, 23, 42, 0.45)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    const modal = document.createElement('div');
    modal.style.background = '#ffffff';
    modal.style.borderRadius = '16px';
    modal.style.boxShadow = '0 25px 60px rgba(15, 23, 42, 0.45)';
    modal.style.maxWidth = '520px';
    modal.style.width = '90%';
    modal.style.padding = '20px 22px';
    modal.style.fontFamily =
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    modal.style.color = '#0f172a';
    modal.style.position = 'relative';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.marginBottom = '10px';

    const marca = document.createElement('div');
    marca.textContent = 'Extensão Forbiz • Cercas virtuais';
    marca.style.fontWeight = '700';
    marca.style.fontSize = '15px';
    marca.style.background = 'linear-gradient(135deg, #0f766e, #2563eb)';
    marca.style.color = '#ffffff';
    marca.style.padding = '6px 10px';
    marca.style.borderRadius = '999px';

    header.appendChild(marca);

       const titulo = document.createElement('div');
    titulo.textContent = 'Como usar esta tela com a extensão';
    titulo.style.fontWeight = '600';
    titulo.style.fontSize = '14px';
    titulo.style.margin = '8px 0 4px 0';

    const texto = document.createElement('div');
    texto.style.fontSize = '12px';
    texto.style.lineHeight = '1.5';
    texto.style.color = '#334155';
    texto.innerHTML =
      '<strong>1.</strong> No painel verde à esquerda, selecione a <strong>filial/empresa</strong> e, se quiser, preencha a <strong>matrícula</strong>. ' +
      'Esses filtros serão usados na tela de criação da cerca quando você abrir o filtro de colaboradores.<br><br>' +
      '<strong>2.</strong> Na tela da cerca, clique em <strong>"Adicionar colaborador"</strong>. Na janelinha que abrir, use o <strong>botão de filtro (ícone de lupa)</strong>. ' +
      'Se uma filial/matrícula estiver definida no painel da extensão, o sistema já aplica automaticamente esses filtros. ' +
      'Se você trocar a filial aqui no painel, basta clicar de novo no botão de filtro para refazer a busca.<br><br>' +
      '<strong>3.</strong> Use o painel azul no canto direito para <strong>buscar um endereço</strong> e centralizar o mapa da cerca nesse ponto, já com o maior nível de zoom.<br><br>' +
      '<strong>4.</strong> Depois disso, crie, ajuste e salve a cerca normalmente pelo sistema. ' +
      'A extensão não altera regras de ponto, só ajuda na localização e filtragem.';

    const rodape = document.createElement('div');
    rodape.style.display = 'flex';
    rodape.style.justifyContent = 'space-between';
    rodape.style.alignItems = 'center';
    rodape.style.marginTop = '14px';
    rodape.style.gap = '8px';

    const info = document.createElement('div');
    info.textContent =
      'Dica: você pode ver esta explicação sempre que abrir a tela, ou escolher não mostrar mais.';
    info.style.fontSize = '10px';
    info.style.color = '#64748b';
    info.style.maxWidth = '60%';

    const botoes = document.createElement('div');
    botoes.style.display = 'flex';
    botoes.style.gap = '8px';

    const btnOk = document.createElement('button');
    btnOk.textContent = 'Ok, entendi';
    btnOk.style.padding = '6px 10px';
    btnOk.style.fontSize = '12px';
    btnOk.style.fontWeight = '600';
    btnOk.style.borderRadius = '999px';
    btnOk.style.border = '1px solid #e2e8f0';
    btnOk.style.cursor = 'pointer';
    btnOk.style.background = '#ffffff';
    btnOk.style.color = '#0f172a';

    const btnNaoMostrar = document.createElement('button');
    btnNaoMostrar.textContent = 'Não mostrar novamente';
    btnNaoMostrar.style.padding = '6px 12px';
    btnNaoMostrar.style.fontSize = '12px';
    btnNaoMostrar.style.fontWeight = '600';
    btnNaoMostrar.style.borderRadius = '999px';
    btnNaoMostrar.style.border = 'none';
    btnNaoMostrar.style.cursor = 'pointer';
    btnNaoMostrar.style.background =
      'linear-gradient(135deg, #22c55e, #0ea5e9)';
    btnNaoMostrar.style.color = '#ffffff';

    btnOk.addEventListener('click', () => {
      overlay.remove(); // não grava nada, continua mostrando nas próximas vezes
    });

    btnNaoMostrar.addEventListener('click', () => {
      try {
        localStorage.setItem(ONBOARDING_KEY, 'never');
      } catch {}
      overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        // click fora = só fecha, mas continua mostrando em próximos acessos
        overlay.remove();
      }
    });

    botoes.appendChild(btnOk);
    botoes.appendChild(btnNaoMostrar);

    rodape.appendChild(info);
    rodape.appendChild(botoes);

    modal.appendChild(header);
    modal.appendChild(titulo);
    modal.appendChild(texto);
    modal.appendChild(rodape);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // ======== INICIALIZAÇÃO ========
  instalarHookLeaflet();

  window.addEventListener('load', () => {
    // deixa o sistema montar tudo primeiro
    setTimeout(() => {
      injetarUIFiltroFilial();
      injetarUIMapa();
      mostrarOnboarding();
    }, 1500);
  });
})();
