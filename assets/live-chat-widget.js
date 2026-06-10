/**
 * KIWL floating live chat – multilingual, page-aware WhatsApp handoff.
 */
(function () {
  'use strict';

  var WA_PHONE = '8617751189576';
  var WA_BASE = 'https://wa.me/' + WA_PHONE;

  var I18N = {
    en: {
      agentName: 'KIWL Sales Team',
      agentRole: 'Online · Typically replies within 1 hour',
      toggleLabel: 'Chat with us',
      greeting: 'Hello! 👋 Welcome to KIWL Liquid Filling Solutions.',
      companyIntro:
        'We are a leading manufacturer of liquid filling machines, capping machines, and turnkey bottling lines — serving food, sauce, cosmetics, and daily chemical industries worldwide.',
      pageIntro: 'You are currently viewing:',
      pageAbout: 'Page summary:',
      cta: 'Chat with Sales Manager on WhatsApp',
      ctaHint: 'For a quote or custom solution, click below and our sales manager will assist you.',
      waPrefill:
        "Hello, I'm interested in your products.\n\n📄 Page: {title}\n🔗 URL: {url}\n\nCould you please provide more information and a quotation? Thank you!",
    },
    zh: {
      agentName: 'KIWL 销售团队',
      agentRole: '在线 · 通常 1 小时内回复',
      toggleLabel: '在线咨询',
      greeting: '您好！👋 欢迎访问江苏鑫紫鲸（KIWL）液体灌装解决方案。',
      companyIntro:
        '我们是中国领先的液体灌装机、旋盖机及交钥匙装瓶生产线制造商，服务食品、酱料、化妆品和日化等行业，产品远销全球。',
      pageIntro: '您当前正在浏览：',
      pageAbout: '页面简介：',
      cta: '通过 WhatsApp 联系销售经理',
      ctaHint: '如需报价或定制方案，请点击下方按钮，我们的销售经理将为您服务。',
      waPrefill:
        '您好，我对贵司产品感兴趣。\n\n📄 页面：{title}\n🔗 链接：{url}\n\n请提供更多信息和报价，谢谢！',
    },
    fr: {
      agentName: 'Équipe commerciale KIWL',
      agentRole: 'En ligne · Réponse sous 1 h en général',
      toggleLabel: 'Discuter avec nous',
      greeting: 'Bonjour ! 👋 Bienvenue chez KIWL, solutions de remplissage de liquides.',
      companyIntro:
        'Nous sommes un fabricant leader de machines de remplissage, capsuleuses et lignes d\'embouteillage clés en main pour l\'agroalimentaire, les sauces, les cosmétiques et la chimie quotidienne.',
      pageIntro: 'Vous consultez actuellement :',
      pageAbout: 'Résumé de la page :',
      cta: 'Contacter le responsable commercial sur WhatsApp',
      ctaHint: 'Pour un devis, cliquez ci-dessous — notre responsable commercial vous répondra.',
      waPrefill:
        "Bonjour, je suis intéressé(e) par vos produits.\n\n📄 Page : {title}\n🔗 URL : {url}\n\nPourriez-vous m'envoyer plus d'informations et un devis ? Merci !",
    },
    de: {
      agentName: 'KIWL Vertriebsteam',
      agentRole: 'Online · Antwort meist innerhalb 1 Stunde',
      toggleLabel: 'Mit uns chatten',
      greeting: 'Hallo! 👋 Willkommen bei KIWL Flüssigkeitsabfülllösungen.',
      companyIntro:
        'Wir sind führender Hersteller von Abfüllmaschinen, Verschließmaschinen und schlüsselfertigen Abfülllinien für Lebensmittel, Saucen, Kosmetik und Chemie.',
      pageIntro: 'Sie sehen gerade:',
      pageAbout: 'Seitenübersicht:',
      cta: 'Vertriebsmanager per WhatsApp kontaktieren',
      ctaHint: 'Für ein Angebot klicken Sie unten — unser Vertriebsmanager hilft Ihnen gerne.',
      waPrefill:
        'Hallo, ich interessiere mich für Ihre Produkte.\n\n📄 Seite: {title}\n🔗 URL: {url}\n\nKönnten Sie mir bitte weitere Informationen und ein Angebot senden? Danke!',
    },
    it: {
      agentName: 'Team vendite KIWL',
      agentRole: 'Online · Risposta entro 1 ora di solito',
      toggleLabel: 'Chatta con noi',
      greeting: 'Ciao! 👋 Benvenuto in KIWL Soluzioni di riempimento liquidi.',
      companyIntro:
        'Siamo un produttore leader di riempitrici, tappatrici e linee di imbottigliamento chiavi in mano per alimentari, salse, cosmetici e chimica quotidiana.',
      pageIntro: 'Stai visualizzando:',
      pageAbout: 'Riepilogo pagina:',
      cta: 'Contatta il responsabile vendite su WhatsApp',
      ctaHint: 'Per un preventivo, clicca sotto — il nostro responsabile vendite ti aiuterà.',
      waPrefill:
        'Ciao, sono interessato ai vostri prodotti.\n\n📄 Pagina: {title}\n🔗 URL: {url}\n\nPotreste inviarmi maggiori informazioni e un preventivo? Grazie!',
    },
    es: {
      agentName: 'Equipo comercial KIWL',
      agentRole: 'En línea · Suele responder en 1 hora',
      toggleLabel: 'Chatea con nosotros',
      greeting: '¡Hola! 👋 Bienvenido a KIWL Soluciones de llenado de líquidos.',
      companyIntro:
        'Somos fabricante líder de llenadoras, taponadoras y líneas de embotellado llave en mano para alimentos, salsas, cosméticos y química diaria.',
      pageIntro: 'Está viendo:',
      pageAbout: 'Resumen de la página:',
      cta: 'Contactar al gerente de ventas por WhatsApp',
      ctaHint: 'Para una cotización, haga clic abajo — nuestro gerente de ventas le atenderá.',
      waPrefill:
        'Hola, estoy interesado en sus productos.\n\n📄 Página: {title}\n🔗 URL: {url}\n\n¿Podrían enviarme más información y una cotización? ¡Gracias!',
    },
    ru: {
      agentName: 'Отдел продаж KIWL',
      agentRole: 'Онлайн · Обычно отвечаем в течение 1 часа',
      toggleLabel: 'Напишите нам',
      greeting: 'Здравствуйте! 👋 Добро пожаловать в KIWL — решения для розлива жидкостей.',
      companyIntro:
        'Мы — ведущий производитель машин для розлива, укупорки и линий розлива под ключ для пищевой, соусовой, косметической и химической промышленности.',
      pageIntro: 'Вы сейчас на странице:',
      pageAbout: 'Описание страницы:',
      cta: 'Написать менеджеру по продажам в WhatsApp',
      ctaHint: 'Для запроса цены нажмите кнопку ниже — менеджер по продажам вам поможет.',
      waPrefill:
        'Здравствуйте, меня интересуют ваши продукты.\n\n📄 Страница: {title}\n🔗 URL: {url}\n\nНе могли бы вы прислать информацию и коммерческое предложение? Спасибо!',
    },
    pl: {
      agentName: 'Zespół sprzedaży KIWL',
      agentRole: 'Online · Odpowiedź zwykle w ciągu 1 godziny',
      toggleLabel: 'Czat z nami',
      greeting: 'Cześć! 👋 Witamy w KIWL — rozwiązania do napełniania cieczy.',
      companyIntro:
        'Jesteśmy wiodącym producentem maszyn do napełniania, zakręcania i linii rozlewniczych dla branży spożywczej, sosów, kosmetyków i chemii.',
      pageIntro: 'Przeglądasz teraz:',
      pageAbout: 'Opis strony:',
      cta: 'Skontaktuj się z menedżerem sprzedaży przez WhatsApp',
      ctaHint: 'Aby otrzymać wycenę, kliknij poniżej — nasz menedżer sprzedaży pomoże.',
      waPrefill:
        'Dzień dobry, jestem zainteresowany Państwa produktami.\n\n📄 Strona: {title}\n🔗 URL: {url}\n\nCzy mogliby Państwo przesłać więcej informacji i wycenę? Dziękuję!',
    },
    pt: {
      agentName: 'Equipa comercial KIWL',
      agentRole: 'Online · Resposta normalmente em 1 hora',
      toggleLabel: 'Fale connosco',
      greeting: 'Olá! 👋 Bem-vindo à KIWL Soluções de enchimento de líquidos.',
      companyIntro:
        'Somos fabricante líder de enchedoras, tampadoras e linhas de engarrafamento turnkey para alimentos, molhos, cosméticos e químicos.',
      pageIntro: 'Está a ver:',
      pageAbout: 'Resumo da página:',
      cta: 'Contactar o gestor de vendas no WhatsApp',
      ctaHint: 'Para um orçamento, clique abaixo — o nosso gestor de vendas irá ajudá-lo.',
      waPrefill:
        'Olá, estou interessado nos vossos produtos.\n\n📄 Página: {title}\n🔗 URL: {url}\n\nPoderiam enviar mais informações e um orçamento? Obrigado!',
    },
  };

  function detectLang() {
    var htmlLang = (document.documentElement.lang || '').split('-')[0].toLowerCase();
    if (I18N[htmlLang]) return htmlLang;
    var m = location.pathname.match(/\/(zh|fr|de|it|es|ru|pl|pt)(\/|$)/i);
    if (m && I18N[m[1].toLowerCase()]) return m[1].toLowerCase();
    return 'en';
  }

  function stripTitleSuffix(title) {
    return title.replace(/\s*[-–|]\s*(China|KIWL|Chiny|Cina|Китай|主页|Home|Accueil).*$/i, '').trim() || title;
  }

  function getPageInfo() {
    var title = stripTitleSuffix(document.title || '');
    var descEl = document.querySelector('meta[name="description"]');
    var desc = descEl ? (descEl.getAttribute('content') || '').trim() : '';
    var h1El = document.querySelector('h1');
    var h1 = h1El ? h1El.textContent.replace(/\s+/g, ' ').trim() : '';
    var displayTitle = h1 || title;
    var url = location.href;
    var canon = document.querySelector('link[rel="canonical"]');
    if (canon && canon.href) url = canon.href;
    if (desc.length > 180) desc = desc.slice(0, 177) + '…';
    return { title: displayTitle, desc: desc, url: url };
  }

  function buildWaLink(t, page) {
    var text = t.waPrefill.replace('{title}', page.title).replace('{url}', page.url);
    return WA_BASE + '?text=' + encodeURIComponent(text);
  }

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function showTyping(container) {
    var box = el('div', 'kiwl-chat-typing');
    box.innerHTML = '<span></span><span></span><span></span>';
    container.appendChild(box);
    container.scrollTop = container.scrollHeight;
    return box;
  }

  function addMessage(container, text, extraClass) {
    var msg = el('div', 'kiwl-chat-msg' + (extraClass ? ' ' + extraClass : ''), text);
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    return msg;
  }

  function delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function runConversation(messagesEl, t, page) {
    if (messagesEl.dataset.started === '1') return;
    messagesEl.dataset.started = '1';
    messagesEl.innerHTML = '';

    var steps = [
      { text: t.greeting, delay: 400 },
      { text: t.companyIntro, delay: 900 },
      {
        html:
          '<strong>' +
          escapeHtml(t.pageIntro) +
          '</strong><em>' +
          escapeHtml(page.title) +
          '</em>' +
          (page.desc
            ? '<small>' + escapeHtml(t.pageAbout) + ' ' + escapeHtml(page.desc) + '</small>'
            : ''),
        className: 'kiwl-chat-msg-page',
        delay: 800,
      },
      {
        text: '💬 ' + t.ctaHint,
        delay: 700,
      },
    ];

    (async function () {
      for (var i = 0; i < steps.length; i++) {
        var typing = showTyping(messagesEl);
        await delay(steps[i].delay);
        typing.remove();
        if (steps[i].html) {
          addMessage(messagesEl, steps[i].html, steps[i].className);
        } else {
          addMessage(messagesEl, escapeHtml(steps[i].text));
        }
      }
    })();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildWidget() {
    var lang = detectLang();
    var t = I18N[lang] || I18N.en;
    var page = getPageInfo();
    var waLink = buildWaLink(t, page);

    var root = el('div', '');
    root.id = 'kiwl-chat-root';

    var toggle = el('button', '');
    toggle.id = 'kiwl-chat-toggle';
    toggle.setAttribute('aria-label', t.toggleLabel);
    toggle.setAttribute('type', 'button');
    toggle.innerHTML =
      '<span id="kiwl-chat-toggle-label">' +
      escapeHtml(t.toggleLabel) +
      '</span>' +
      '<span class="kiwl-toggle-icon-wrap">' +
      '<span class="kiwl-chat-online-dot" aria-hidden="true"></span>' +
      '<svg class="kiwl-icon-chat" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path fill="#ffffff" d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.2-14.5-20.1-17.1-22.4-3.2-2.7-6.5-2.1-12 1.4-5.5 3.5-21.1 10.4-24.4 11.4-3.3 1-6 1.5-8.5-.5-2.5-2-10.7-12.5-14.7-19.1-4-6.6-8-5.5-13.5-3.4-5.5 2.1-34.9 16.5-40.2 19.5-5.3 3-8.7 4.5-10 7-.9 1.7-.9 9.8 2.3 19.3 3.2 9.5 18.6 37.2 40.3 53.8 27.7 21.4 51 27.7 60.1 30.9 9.1 3.2 19.3 2.7 26.5-.6 7.2-3.3 45.7-21.5 52.1-25.9 6.4-4.4 10.7-6.6 12.2-10.3 1.5-3.7 1.5-6.9 1-10.7-.5-3.8-5.5-18.9-7.6-25.9-2.1-7-4.3-6-7.4-4.1-3.1 1.9-19.8 12.2-22.8 13.6-3 1.4-5.2 2.1-7.4-.2-2.2-2.3-8.6-10.6-12.1-14.3-3.5-3.7-7-1.2-10.8 2.5-3.8 3.7-14.9 14.6-18.5 17.8-3.6 3.2-7.2 3.4-12.1 1.7-4.9-1.7-20.7-7.6-39.4-24.7-14.6-13.5-24.5-30.2-27.4-35.3-2.9-5.1-.3-7.9 2.2-10.4 2.2-2.2 4.9-5.7 7.4-8.5 2.5-2.8 3.3-4.7 5-7.8 1.6-3.1 0.8-5.8-.4-8.1-1.3-2.3-11.7-28.2-16-38.4-4.2-10-8.5-8.6-11.7-8.8-3-.2-6.5-.2-10-.2-3.5 0-9.2 1.7-14 8.5-4.8 6.8-18.4 18-18.4 43.9 0 25.9 18.9 50.9 21.5 54.4 2.6 3.5 37.2 56.8 90.2 79.7 12.6 5.4 22.5 8.6 30.2 11 12.7 3.6 24.3 3.1 33.5-.7 9.2-3.8 57.9-27.5 66-54.1 8.1-26.6 8.1-49.4 5.7-54.1-2.4-4.7-8.7-7.4-12.3-9.1-3.6-1.7-7.8-1.4-10.9.8-3.1 2.2-11.9 11.3-13.8 12.3z"/>' +
      '</svg>' +
      '<svg class="kiwl-icon-close" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path fill="#ffffff" d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.3 10.59 10.6l6.29-6.3z"/>' +
      '</svg>' +
      '</span>';

    var panel = el('div', '');
    panel.id = 'kiwl-chat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', t.toggleLabel);

    var header = el('div', 'kiwl-chat-header');
    header.innerHTML =
      '<div class="kiwl-chat-avatar">KI</div>' +
      '<div class="kiwl-chat-header-text"><strong>' +
      escapeHtml(t.agentName) +
      '</strong><span>' +
      escapeHtml(t.agentRole) +
      '</span></div>';

    var messages = el('div', 'kiwl-chat-messages');

    var footer = el('div', 'kiwl-chat-footer');
    var waBtn = el(
      'a',
      'kiwl-chat-wa-btn',
      '<svg viewBox="0 0 448 512" aria-hidden="true"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.2-14.5-20.1-17.1-22.4-3.2-2.7-6.5-2.1-12 1.4-5.5 3.5-21.1 10.4-24.4 11.4-3.3 1-6 1.5-8.5-.5-2.5-2-10.7-12.5-14.7-19.1-4-6.6-8-5.5-13.5-3.4-5.5 2.1-34.9 16.5-40.2 19.5-5.3 3-8.7 4.5-10 7-.9 1.7-.9 9.8 2.3 19.3 3.2 9.5 18.6 37.2 40.3 53.8 27.7 21.4 51 27.7 60.1 30.9 9.1 3.2 19.3 2.7 26.5-.6 7.2-3.3 45.7-21.5 52.1-25.9 6.4-4.4 10.7-6.6 12.2-10.3 1.5-3.7 1.5-6.9 1-10.7-.5-3.8-5.5-18.9-7.6-25.9-2.1-7-4.3-6-7.4-4.1-3.1 1.9-19.8 12.2-22.8 13.6-3 1.4-5.2 2.1-7.4-.2-2.2-2.3-8.6-10.6-12.1-14.3-3.5-3.7-7-1.2-10.8 2.5-3.8 3.7-14.9 14.6-18.5 17.8-3.6 3.2-7.2 3.4-12.1 1.7-4.9-1.7-20.7-7.6-39.4-24.7-14.6-13.5-24.5-30.2-27.4-35.3-2.9-5.1-.3-7.9 2.2-10.4 2.2-2.2 4.9-5.7 7.4-8.5 2.5-2.8 3.3-4.7 5-7.8 1.6-3.1 0.8-5.8-.4-8.1-1.3-2.3-11.7-28.2-16-38.4-4.2-10-8.5-8.6-11.7-8.8-3-.2-6.5-.2-10-.2-3.5 0-9.2 1.7-14 8.5-4.8 6.8-18.4 18-18.4 43.9 0 25.9 18.9 50.9 21.5 54.4 2.6 3.5 37.2 56.8 90.2 79.7 12.6 5.4 22.5 8.6 30.2 11 12.7 3.6 24.3 3.1 33.5-.7 9.2-3.8 57.9-27.5 66-54.1 8.1-26.6 8.1-49.4 5.7-54.1-2.4-4.7-8.7-7.4-12.3-9.1-3.6-1.7-7.8-1.4-10.9.8-3.1 2.2-11.9 11.3-13.8 12.3z"/></svg>' +
      escapeHtml(t.cta),
    );
    waBtn.href = waLink;
    waBtn.target = '_blank';
    waBtn.rel = 'noopener noreferrer';
    footer.appendChild(waBtn);

    panel.appendChild(header);
    panel.appendChild(messages);
    panel.appendChild(footer);

    root.appendChild(panel);
    root.appendChild(toggle);
    document.body.appendChild(root);

    var open = false;

    function setOpen(next) {
      open = next;
      toggle.classList.toggle('is-open', open);
      panel.classList.toggle('is-open', open);
      if (open) runConversation(messages, t, page);
    }

    toggle.addEventListener('click', function () {
      setOpen(!open);
    });

    document.addEventListener('click', function (e) {
      if (open && !root.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) setOpen(false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildWidget);
  } else {
    buildWidget();
  }
})();
