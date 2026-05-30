/**
 * Blocksy offcanvas / mobile menu fallback for static export.
 * Fixes: inert blocking clicks when chunk 447 fails to load, submenu toggles, panel open/close.
 */
(function () {
  'use strict';

  function panelSide(panel) {
    var b = (panel && panel.dataset.behaviour) || '';
    if (b.indexOf('left') > -1) return ':left';
    if (b.indexOf('right') > -1) return ':right';
    return '';
  }

  function syncInert(panel) {
    if (!panel) return;
    if (panel.classList.contains('active')) {
      panel.removeAttribute('inert');
    }
  }

  function openPanel(panel) {
    if (!panel) return;
    panel.classList.add('active');
    panel.removeAttribute('inert');
    document.body.setAttribute('data-panel', 'in' + panelSide(panel));
  }

  function closePanel(panel) {
    if (!panel) return;
    panel.classList.remove('active');
    document.body.removeAttribute('data-panel');
  }

  function menuItem(el) {
    return el.closest('.menu-item-has-children, .page_item_has_children');
  }

  function toggleItem(item, open) {
    if (!item) return;
    var isOpen = typeof open === 'boolean' ? open : !item.classList.contains('dropdown-active');
    item.classList.toggle('dropdown-active', isOpen);
    var btn = item.querySelector(':scope > .ct-sub-menu-parent .ct-toggle-dropdown-mobile');
    if (btn) btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  function closeSiblings(item) {
    var parent = item && item.parentElement;
    if (!parent) return;
    Array.prototype.forEach.call(parent.children, function (sib) {
      if (sib !== item && sib.classList && sib.classList.contains('dropdown-active')) {
        toggleItem(sib, false);
      }
    });
  }

  function watchPanels() {
    document.querySelectorAll('.ct-panel').forEach(function (panel) {
      syncInert(panel);
      if (panel.__npackWatch) return;
      panel.__npackWatch = true;
      new MutationObserver(function () {
        syncInert(panel);
      }).observe(panel, { attributes: true, attributeFilter: ['class'] });
    });
  }

  function ensurePanelInteractive() {
    document.querySelectorAll('.ct-panel.active').forEach(function (panel) {
      panel.removeAttribute('inert');
    });
  }

  document.addEventListener(
    'click',
    function (e) {
      var trigger = e.target.closest(
        '.ct-header-trigger[data-toggle-panel], .ct-offcanvas-trigger[data-toggle-panel], .ct-offcanvas-trigger[href]',
      );
      if (trigger) {
        var sel = trigger.getAttribute('data-toggle-panel') || trigger.getAttribute('href');
        if (sel && sel.charAt(0) === '#') {
          var panel = document.querySelector(sel);
          if (panel) {
            window.setTimeout(function () {
              if (!panel.classList.contains('active')) {
                openPanel(panel);
              } else {
                panel.removeAttribute('inert');
              }
            }, 0);
            window.setTimeout(ensurePanelInteractive, 50);
            window.setTimeout(ensurePanelInteractive, 200);
          }
        }
      }

      var toggleBtn = e.target.closest('.mobile-menu .ct-toggle-dropdown-mobile');
      if (toggleBtn) {
        e.preventDefault();
        e.stopPropagation();
        var item = menuItem(toggleBtn);
        if (!item) return;
        var willOpen = !item.classList.contains('dropdown-active');
        if (willOpen) closeSiblings(item);
        toggleItem(item, willOpen);
        return;
      }

      var subParent = e.target.closest('.mobile-menu .ct-sub-menu-parent');
      if (subParent && !e.target.closest('a.ct-menu-link')) {
        var btn2 = subParent.querySelector('.ct-toggle-dropdown-mobile');
        if (btn2) {
          e.preventDefault();
          e.stopPropagation();
          var item2 = menuItem(btn2);
          if (!item2) return;
          var willOpen2 = !item2.classList.contains('dropdown-active');
          if (willOpen2) closeSiblings(item2);
          toggleItem(item2, willOpen2);
        }
        return;
      }

      var closeBtn = e.target.closest('.ct-panel .ct-toggle-close');
      if (closeBtn) {
        e.preventDefault();
        e.stopPropagation();
        closePanel(closeBtn.closest('.ct-panel'));
        return;
      }

      if (document.body.getAttribute('data-panel') && e.target === document.body) {
        var active = document.querySelector('.ct-panel.active');
        if (active) closePanel(active);
      }
    },
    true,
  );

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var active = document.querySelector('.ct-panel.active');
    if (active) closePanel(active);
  });

  function init() {
    watchPanels();
    ensurePanelInteractive();
    window.setInterval(ensurePanelInteractive, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
