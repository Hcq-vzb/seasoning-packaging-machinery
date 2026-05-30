/**
 * Inquiry form handler – intercepts Elementor INQUIRY forms site-wide,
 * sends via Resend proxy (/api/send-inquiry), shows inline success/error.
 */
(function () {
  'use strict';

  var ENDPOINTS = ['/api/send-inquiry', '/.netlify/functions/send-inquiry'];

  var MESSAGES = {
    en: {
      success: 'Thank you! Your message has been sent successfully. We will get back to you soon.',
      error: 'Sorry, we could not send your message. Please try again or email us at cathy@kiwlmachine.com.',
      sending: 'Sending…',
      required: 'Please fill in all required fields (name, email, phone, message).',
      invalidEmail: 'Please enter a valid email address.',
    },
    zh: {
      success: '提交成功！我们已收到您的留言，会尽快与您联系。',
      error: '提交失败，请稍后重试或直接发送邮件至 cathy@kiwlmachine.com。',
      sending: '正在提交…',
      required: '请填写所有必填项（姓名、邮箱、电话、留言）。',
      invalidEmail: '请输入有效的邮箱地址。',
    },
    fr: {
      success: 'Merci ! Votre message a été envoyé avec succès. Nous vous répondrons bientôt.',
      error: 'Désolé, l\'envoi a échoué. Veuillez réessayer ou nous écrire à cathy@kiwlmachine.com.',
      sending: 'Envoi en cours…',
      required: 'Veuillez remplir tous les champs obligatoires (nom, e-mail, téléphone, message).',
      invalidEmail: 'Veuillez saisir une adresse e-mail valide.',
    },
    de: {
      success: 'Vielen Dank! Ihre Nachricht wurde erfolgreich gesendet. Wir melden uns in Kürze.',
      error: 'Leider konnte Ihre Nachricht nicht gesendet werden. Bitte versuchen Sie es erneut oder schreiben Sie an cathy@kiwlmachine.com.',
      sending: 'Wird gesendet…',
      required: 'Bitte füllen Sie alle Pflichtfelder aus (Name, E-Mail, Telefon, Nachricht).',
      invalidEmail: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
    },
    it: {
      success: 'Grazie! Il messaggio è stato inviato con successo. Ti risponderemo al più presto.',
      error: 'Impossibile inviare il messaggio. Riprova o scrivici a cathy@kiwlmachine.com.',
      sending: 'Invio in corso…',
      required: 'Compila tutti i campi obbligatori (nome, email, telefono, messaggio).',
      invalidEmail: 'Inserisci un indirizzo email valido.',
    },
    es: {
      success: '¡Gracias! Su mensaje se ha enviado correctamente. Le responderemos pronto.',
      error: 'No se pudo enviar el mensaje. Inténtelo de nuevo o escríbanos a cathy@kiwlmachine.com.',
      sending: 'Enviando…',
      required: 'Complete todos los campos obligatorios (nombre, correo, teléfono, mensaje).',
      invalidEmail: 'Introduzca una dirección de correo válida.',
    },
    ru: {
      success: 'Спасибо! Ваше сообщение успешно отправлено. Мы скоро свяжемся с вами.',
      error: 'Не удалось отправить сообщение. Попробуйте снова или напишите на cathy@kiwlmachine.com.',
      sending: 'Отправка…',
      required: 'Заполните все обязательные поля (имя, email, телефон, сообщение).',
      invalidEmail: 'Введите корректный адрес email.',
    },
    pl: {
      success: 'Dziękujemy! Wiadomość została wysłana. Wkrótce się z Państwem skontaktujemy.',
      error: 'Nie udało się wysłać wiadomości. Spróbuj ponownie lub napisz na cathy@kiwlmachine.com.',
      sending: 'Wysyłanie…',
      required: 'Wypełnij wszystkie wymagane pola (imię, e-mail, telefon, wiadomość).',
      invalidEmail: 'Podaj prawidłowy adres e-mail.',
    },
    pt: {
      success: 'Obrigado! A sua mensagem foi enviada com sucesso. Entraremos em contacto em breve.',
      error: 'Não foi possível enviar a mensagem. Tente novamente ou escreva para cathy@kiwlmachine.com.',
      sending: 'A enviar…',
      required: 'Preencha todos os campos obrigatórios (nome, e-mail, telefone, mensagem).',
      invalidEmail: 'Introduza um endereço de e-mail válido.',
    },
  };

  var PATH_LANG = {
    '/zh/': 'zh',
    '/fr/': 'fr',
    '/de/': 'de',
    '/it/': 'it',
    '/es/': 'es',
    '/ru/': 'ru',
    '/pl/': 'pl',
    '/pt/': 'pt',
  };

  function getLang() {
    var htmlLang = (document.documentElement.lang || 'en').split('-')[0].toLowerCase();
    if (MESSAGES[htmlLang]) return htmlLang;
    var path = (location.pathname || '').toLowerCase();
    for (var prefix in PATH_LANG) {
      if (path.indexOf(prefix) !== -1) return PATH_LANG[prefix];
    }
    return 'en';
  }

  function t(key) {
    var lang = getLang();
    return (MESSAGES[lang] || MESSAGES.en)[key] || MESSAGES.en[key];
  }

  function injectStyles() {
    if (document.getElementById('resend-inquiry-form-styles')) return;
    var style = document.createElement('style');
    style.id = 'resend-inquiry-form-styles';
    style.textContent =
      'form.elementor-form[name="INQUIRY"] .f12-captcha,' +
      'form.elementor-form[name="INQUIRY"] .elementor-field-group-text .f12t{display:none!important}' +
      '.resend-form-notice{margin:12px 0 0;padding:12px 16px;border-radius:4px;font-size:14px;line-height:1.5}' +
      '.resend-form-notice--success{background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7}' +
      '.resend-form-notice--error{background:#ffebee;color:#c62828;border:1px solid #ef9a9a}' +
      '.resend-form-notice--info{background:#e3f2fd;color:#1565c0;border:1px solid #90caf9}' +
      'form.elementor-form[name="INQUIRY"] .elementor-button[disabled]{opacity:.65;cursor:not-allowed}';
    document.head.appendChild(style);
  }

  function fieldValue(form, selector) {
    var el = form.querySelector(selector);
    return el ? String(el.value || '').trim() : '';
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function getNoticeEl(form) {
    var existing = form.querySelector('.resend-form-notice');
    if (existing) return existing;
    var notice = document.createElement('div');
    notice.className = 'resend-form-notice';
    notice.setAttribute('role', 'alert');
    notice.hidden = true;
    var buttons = form.querySelector('.e-form__buttons');
    if (buttons) {
      buttons.parentNode.insertBefore(notice, buttons.nextSibling);
    } else {
      form.appendChild(notice);
    }
    return notice;
  }

  function showNotice(form, type, text) {
    var notice = getNoticeEl(form);
    notice.hidden = false;
    notice.className = 'resend-form-notice resend-form-notice--' + type;
    notice.textContent = text;
    notice.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideNotice(form) {
    var notice = form.querySelector('.resend-form-notice');
    if (notice) notice.hidden = true;
  }

  function setSubmitting(form, submitting) {
    var btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.disabled = submitting;
    var textEl = btn.querySelector('.elementor-button-text');
    if (textEl) {
      if (!btn.dataset.originalText) btn.dataset.originalText = textEl.textContent;
      textEl.textContent = submitting ? t('sending') : btn.dataset.originalText;
    }
  }

  function collectData(form) {
    return {
      name: fieldValue(form, '[name="form_fields[name]"]'),
      email: fieldValue(form, '[name="form_fields[email]"]'),
      phone: fieldValue(form, '[name="form_fields[field_d03f910]"]'),
      message: fieldValue(form, '[name="form_fields[message]"]'),
      pageUrl: location.href,
      pageTitle: document.title || '',
    };
  }

  function validate(data) {
    if (!data.name || !data.email || !data.phone || !data.message) {
      return t('required');
    }
    if (!isValidEmail(data.email)) {
      return t('invalidEmail');
    }
    return '';
  }

  async function postInquiry(data) {
    var lastError = null;
    for (var i = 0; i < ENDPOINTS.length; i++) {
      try {
        var res = await fetch(ENDPOINTS[i], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.status === 404) continue;
        var body = await res.json().catch(function () {
          return {};
        });
        if (res.ok) return { ok: true };
        lastError = body.error || body.message || 'HTTP ' + res.status;
        return { ok: false, error: lastError };
      } catch (err) {
        lastError = err && err.message ? err.message : String(err);
      }
    }
    return { ok: false, error: lastError || 'Network error' };
  }

  async function handleSubmit(event) {
    var form = event.target.closest('form.elementor-form[name="INQUIRY"]');
    if (!form) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    hideNotice(form);

    var data = collectData(form);
    var validationError = validate(data);
    if (validationError) {
      showNotice(form, 'error', validationError);
      return;
    }

    setSubmitting(form, true);
    showNotice(form, 'info', t('sending'));

    try {
      var result = await postInquiry(data);
      if (result.ok) {
        showNotice(form, 'success', t('success'));
        form.reset();
      } else {
        showNotice(form, 'error', t('error'));
      }
    } catch (e) {
      showNotice(form, 'error', t('error'));
    } finally {
      setSubmitting(form, false);
    }
  }

  function prepareForm(form) {
    form.setAttribute('action', '#');
    form.setAttribute('method', 'post');
    form.querySelectorAll('.f12-captcha input, .f12c').forEach(function (el) {
      el.removeAttribute('required');
      el.removeAttribute('aria-required');
    });
  }

  function init() {
    injectStyles();
    document.querySelectorAll('form.elementor-form[name="INQUIRY"]').forEach(prepareForm);
    document.addEventListener('submit', handleSubmit, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
