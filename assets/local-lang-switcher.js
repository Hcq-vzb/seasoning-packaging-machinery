/**
 * 本地静态站语言切换：优先 NPACKPM_LANG_EQUIV（同页面对应语言），否则 NPACKPM_LANG_HOMES（首页）。
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'npackpm_preferred_lang';
  var targets = window.NPACKPM_LANG_EQUIV || window.NPACKPM_LANG_HOMES || {};

  function langCode(el) {
    if (!el) return '';
    var l = el.getAttribute('lang') || '';
    return l.split('-')[0].toLowerCase();
  }

  function applyHrefs() {
    document.querySelectorAll('.ct-language-switcher a[lang]').forEach(function (a) {
      var code = langCode(a);
      if (code && targets[code]) {
        a.setAttribute('href', targets[code]);
      }
    });
  }

  function closeSwitchers() {
    document.querySelectorAll('.ct-language-switcher').forEach(function (sw) {
      sw.classList.remove('is-open');
      var active = sw.querySelector('.ct-active-language');
      if (active) active.blur();
    });
  }

  function init() {
    applyHrefs();

    document.querySelectorAll('.ct-language-switcher').forEach(function (sw) {
      var trigger = sw.querySelector('.ct-active-language');
      if (trigger) {
        trigger.addEventListener('click', function (e) {
          e.preventDefault();
          sw.classList.toggle('is-open');
        });
      }
    });

    document.querySelectorAll('.ct-language-switcher a[lang]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var code = langCode(a);
        var url = (code && targets[code]) || a.getAttribute('href');
        if (!url) return;
        e.preventDefault();
        try {
          if (code) localStorage.setItem(STORAGE_KEY, code);
        } catch (err) {}
        closeSwitchers();
        window.location.href = url;
      });
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.ct-language-switcher')) {
        closeSwitchers();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
