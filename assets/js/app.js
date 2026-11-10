/**
 * Dashboard Template - core script (jQuery 3.x)
 *
 * Everything is driven by data-attributes and event delegation, so it works
 * for markup loaded later (partials, AJAX content).
 *
 * Public API (window.App):
 *   App.ready(fn)                 run fn after partials are loaded + icons rendered
 *   App.toast(msg, type, opts)    type: success | error | warning | info
 *   App.modal.open(id) / close(id)
 *   App.theme.toggle() / set('dark'|'light') / isDark()
 *   App.icons()                   re-render Lucide icons after injecting HTML
 *   App.confirm(opts)             returns a Promise<boolean>
 *
 * Events (on document):
 *   'app:ready'     partials loaded
 *   'theme:change'  (e, isDark)
 */
(function ($) {
  'use strict';

  var $doc = $(document);
  var $html = $('html');
  var readyQueue = [];
  var isReady = false;

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
  };

  /* ------------------------------------------------------------------
   * Icons
   * ------------------------------------------------------------------ */
  function renderIcons() {
    if (window.lucide) window.lucide.createIcons({ attrs: { 'stroke-width': 1.75 } });
  }

  /* ------------------------------------------------------------------
   * Partials: <div data-include="partials/sidebar.html"></div>
   * The placeholder is replaced by the partial's markup.
   * ------------------------------------------------------------------ */
  function loadPartials() {
    var requests = $('[data-include]').map(function () {
      var $el = $(this);
      return $.get($el.data('include')).then(
        function (html) { $el.replaceWith(html); },
        function () {
          $el.html('<div class="p-4 text-sm text-red-600">Failed to load <code>' + $el.data('include') +
            '</code>. Open this page through a web server (http://), not file://.</div>');
        }
      );
    }).get();
    return $.when.apply($, requests);
  }

  function hydrateLayout() {
    var page = $('body').data('page');
    var title = $('body').data('title') || document.title;

    // Active sidebar link
    if (page) {
      var $active = $('#sidebar [data-nav="' + page + '"]');
      $active.addClass('is-active bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300')
        .removeClass('text-slate-600 dark:text-slate-400');
      // Open parent submenu if the active link is nested
      var $sub = $active.closest('.sidebar-submenu');
      if ($sub.length) {
        $sub.removeClass('hidden');
        $('[data-collapse-toggle="' + $sub.attr('id') + '"]').attr('aria-expanded', 'true');
      }
    }
    $('[data-page-title]').text(title);
    $('[data-year]').text(new Date().getFullYear());
  }

  /* ------------------------------------------------------------------
   * Theme
   * ------------------------------------------------------------------ */
  var theme = {
    isDark: function () { return $html.hasClass('dark'); },
    set: function (mode) {
      $html.toggleClass('dark', mode === 'dark');
      store.set('theme', mode);
      $doc.trigger('theme:change', [mode === 'dark']);
    },
    toggle: function () { theme.set(theme.isDark() ? 'light' : 'dark'); },
  };
  $doc.on('click', '[data-theme-toggle]', function () { theme.toggle(); });

  /* ------------------------------------------------------------------
   * Sidebar
   * ------------------------------------------------------------------ */
  var isDesktop = function () { return window.matchMedia('(min-width: 1024px)').matches; };

  $doc.on('click', '[data-sidebar-toggle]', function () {
    if (isDesktop()) {
      $html.toggleClass('sidebar-collapsed');
      store.set('sidebar-collapsed', $html.hasClass('sidebar-collapsed') ? '1' : '0');
    } else {
      $html.toggleClass('sidebar-open');
    }
  });
  $doc.on('click', '#sidebar-backdrop, [data-sidebar-close]', function () {
    $html.removeClass('sidebar-open');
  });

  // Submenus / generic collapse: <button data-collapse-toggle="targetId">
  $doc.on('click', '[data-collapse-toggle]', function () {
    var $btn = $(this);
    // Expand the sidebar first if a submenu is clicked while collapsed
    if ($btn.closest('#sidebar').length && $html.hasClass('sidebar-collapsed') && isDesktop()) {
      $html.removeClass('sidebar-collapsed');
      store.set('sidebar-collapsed', '0');
    }
    var $target = $('#' + $btn.data('collapse-toggle'));
    var open = $target.hasClass('hidden');
    $target.toggleClass('hidden', !open);
    $btn.attr('aria-expanded', open ? 'true' : 'false');
  });

  /* ------------------------------------------------------------------
   * Dropdown: <button data-dropdown-toggle="menuId">  +  <div id="menuId" class="dropdown-menu hidden">
   * ------------------------------------------------------------------ */
  function closeDropdowns($except) {
    $('.dropdown-menu.is-open').not($except || $()).removeClass('is-open').addClass('hidden');
    $('[data-dropdown-toggle]').attr('aria-expanded', 'false');
  }
  $doc.on('click', '[data-dropdown-toggle]', function (e) {
    e.stopPropagation();
    var $menu = $('#' + $(this).data('dropdown-toggle'));
    var willOpen = !$menu.hasClass('is-open');
    closeDropdowns($menu);
    $menu.toggleClass('is-open', willOpen).toggleClass('hidden', !willOpen);
    $(this).attr('aria-expanded', willOpen ? 'true' : 'false');
  });
  $doc.on('click', '.dropdown-menu', function (e) {
    // Keep menu open on inner clicks unless the item asks to close it
    if (!$(e.target).closest('[data-dropdown-close], a').length) e.stopPropagation();
  });
  $doc.on('click', function () { closeDropdowns(); });

  /* ------------------------------------------------------------------
   * Modal: <button data-modal-open="modalId">  +  <div id="modalId" class="modal hidden ..."> ... [data-modal-close]
   * ------------------------------------------------------------------ */
  var modal = {
    open: function (id) {
      var $m = $('#' + id);
      $m.removeClass('hidden').addClass('is-open').attr('aria-hidden', 'false');
      $('body').addClass('overflow-hidden');
      setTimeout(function () { $m.find('[autofocus], input, button').filter(':visible').first().trigger('focus'); }, 50);
      $m.trigger('modal:open');
    },
    close: function (id) {
      var $m = id ? $('#' + id) : $('.modal.is-open');
      $m.removeClass('is-open').addClass('hidden').attr('aria-hidden', 'true');
      if (!$('.modal.is-open').length) $('body').removeClass('overflow-hidden');
      $m.trigger('modal:close');
    },
  };
  $doc.on('click', '[data-modal-open]', function () { modal.open($(this).data('modal-open')); });
  $doc.on('click', '[data-modal-close]', function () { modal.close($(this).closest('.modal').attr('id')); });
  $doc.on('mousedown', '.modal', function (e) {
    if (e.target === this && $(this).data('static') !== true) modal.close(this.id);
  });

  /* ------------------------------------------------------------------
   * Confirm dialog (built on the modal) -> Promise<boolean>
   * ------------------------------------------------------------------ */
  function confirmDialog(opts) {
    opts = $.extend({
      title: 'Are you sure?',
      message: 'This action cannot be undone.',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      danger: true,
    }, opts);

    var $m = $('#app-confirm');
    if (!$m.length) {
      $m = $(
        '<div id="app-confirm" class="modal hidden fixed inset-0 z-[60] items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">' +
        '  <div class="modal-panel w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">' +
        '    <div class="flex gap-4">' +
        '      <div class="confirm-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-full"><i data-lucide="alert-triangle" class="h-5 w-5"></i></div>' +
        '      <div><h3 class="confirm-title text-base font-semibold text-slate-900 dark:text-white"></h3>' +
        '      <p class="confirm-message mt-1 text-sm text-slate-500 dark:text-slate-400"></p></div>' +
        '    </div>' +
        '    <div class="mt-6 flex justify-end gap-2">' +
        '      <button type="button" class="confirm-cancel inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"></button>' +
        '      <button type="button" class="confirm-ok inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-white"></button>' +
        '    </div>' +
        '  </div>' +
        '</div>'
      ).appendTo('body');
      renderIcons();
    }

    $m.find('.confirm-title').text(opts.title);
    $m.find('.confirm-message').text(opts.message);
    $m.find('.confirm-cancel').text(opts.cancelText);
    $m.find('.confirm-ok').text(opts.confirmText)
      .toggleClass('bg-red-600 hover:bg-red-700', opts.danger)
      .toggleClass('bg-primary-600 hover:bg-primary-700', !opts.danger);
    $m.find('.confirm-icon')
      .toggleClass('bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400', opts.danger)
      .toggleClass('bg-primary-100 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400', !opts.danger);

    return new Promise(function (resolve) {
      var done = function (val) {
        $m.off('.confirm');
        modal.close('app-confirm');
        resolve(val);
      };
      $m.on('click.confirm', '.confirm-ok', function () { done(true); });
      $m.on('click.confirm', '.confirm-cancel', function () { done(false); });
      $m.on('modal:close.confirm', function () { $m.off('.confirm'); resolve(false); });
      modal.open('app-confirm');
    });
  }

  /* ------------------------------------------------------------------
   * Tabs: <div data-tabs> <button data-tab="panelId"> ... </div>  panels: <div id="panelId" data-tab-panel>
   * ------------------------------------------------------------------ */
  var TAB_ACTIVE = 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400';
  var TAB_IDLE = 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200';
  function activateTab($btn) {
    var $group = $btn.closest('[data-tabs]');
    var style = $group.data('tabs-style'); // 'pills' or default underline
    $group.find('[data-tab]').each(function () {
      var $t = $(this);
      var on = $t.is($btn);
      $t.attr('aria-selected', on ? 'true' : 'false');
      if (style === 'pills') {
        $t.toggleClass('bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white', on)
          .toggleClass('text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200', !on);
      } else {
        $t.removeClass(TAB_ACTIVE + ' ' + TAB_IDLE).addClass(on ? TAB_ACTIVE : TAB_IDLE);
      }
      $('#' + $t.data('tab')).toggleClass('hidden', !on);
    });
  }
  $doc.on('click', '[data-tab]', function () { activateTab($(this)); });

  /* ------------------------------------------------------------------
   * Accordion: <button data-accordion-toggle="panelId" aria-expanded="false">
   * Add data-accordion="single" on the wrapper to allow only one open.
   * ------------------------------------------------------------------ */
  $doc.on('click', '[data-accordion-toggle]', function () {
    var $btn = $(this);
    var $panel = $('#' + $btn.data('accordion-toggle'));
    var open = $btn.attr('aria-expanded') !== 'true';
    var $wrap = $btn.closest('[data-accordion]');
    if (open && $wrap.data('accordion') === 'single') {
      $wrap.find('[data-accordion-toggle][aria-expanded="true"]').not($btn).each(function () {
        $(this).attr('aria-expanded', 'false');
        $('#' + $(this).data('accordion-toggle')).slideUp(150);
      });
    }
    $btn.attr('aria-expanded', open ? 'true' : 'false');
    $panel[open ? 'slideDown' : 'slideUp'](150);
  });

  /* ------------------------------------------------------------------
   * Dismissible: <div data-dismissible> ... <button data-dismiss>
   * ------------------------------------------------------------------ */
  $doc.on('click', '[data-dismiss]', function () {
    $(this).closest('[data-dismissible]').fadeOut(150, function () { $(this).remove(); });
  });

  /* ------------------------------------------------------------------
   * Password visibility: <button data-password-toggle="inputId">
   * ------------------------------------------------------------------ */
  $doc.on('click', '[data-password-toggle]', function () {
    var $input = $('#' + $(this).data('password-toggle'));
    var show = $input.attr('type') === 'password';
    $input.attr('type', show ? 'text' : 'password');
    $(this).find('[data-show]').toggleClass('hidden', show);
    $(this).find('[data-hide]').toggleClass('hidden', !show);
  });

  /* ------------------------------------------------------------------
   * Toasts
   * ------------------------------------------------------------------ */
  var TOAST = {
    success: { icon: 'check-circle-2', cls: 'text-emerald-500' },
    error:   { icon: 'x-circle',       cls: 'text-red-500' },
    warning: { icon: 'alert-triangle', cls: 'text-amber-500' },
    info:    { icon: 'info',           cls: 'text-sky-500' },
  };
  function toast(message, type, opts) {
    opts = $.extend({ duration: 3500, title: null }, opts);
    var t = TOAST[type] || TOAST.info;
    var $wrap = $('#toast-container');
    if (!$wrap.length) {
      $wrap = $('<div id="toast-container" class="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0" aria-live="polite"></div>').appendTo('body');
    }
    var $t = $(
      '<div class="toast pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900" role="status">' +
      '  <i data-lucide="' + t.icon + '" class="mt-0.5 h-5 w-5 shrink-0 ' + t.cls + '"></i>' +
      '  <div class="min-w-0 flex-1 text-sm">' +
      (opts.title ? '<p class="toast-title font-semibold text-slate-900 dark:text-white"></p>' : '') +
      '    <p class="toast-msg text-slate-600 dark:text-slate-300"></p>' +
      '  </div>' +
      '  <button type="button" class="toast-close -m-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800" aria-label="Close"><i data-lucide="x" class="h-4 w-4"></i></button>' +
      '</div>'
    );
    $t.find('.toast-title').text(opts.title || '');
    $t.find('.toast-msg').text(message);
    $wrap.append($t);
    renderIcons();

    var remove = function () {
      $t.addClass('is-leaving');
      setTimeout(function () { $t.remove(); }, 200);
    };
    $t.on('click', '.toast-close', remove);
    if (opts.duration > 0) setTimeout(remove, opts.duration);
    return $t;
  }
  // Declarative: <button data-toast="Saved!" data-toast-type="success">
  $doc.on('click', '[data-toast]', function () {
    toast($(this).data('toast'), $(this).data('toast-type') || 'info');
  });

  /* ------------------------------------------------------------------
   * Global keyboard
   * ------------------------------------------------------------------ */
  $doc.on('keydown', function (e) {
    if (e.key === 'Escape') {
      closeDropdowns();
      if ($('.modal.is-open').length) modal.close($('.modal.is-open').last().attr('id'));
      $html.removeClass('sidebar-open');
    }
    // Ctrl/Cmd + K focuses the global search
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      var $s = $('[data-global-search]');
      if ($s.length) { e.preventDefault(); $s.trigger('focus'); }
    }
  });

  // Close mobile sidebar when resizing up to desktop
  $(window).on('resize', function () { if (isDesktop()) $html.removeClass('sidebar-open'); });

  /* ------------------------------------------------------------------
   * Boot
   * ------------------------------------------------------------------ */
  function onReady(fn) {
    if (isReady) fn($); else readyQueue.push(fn);
  }

  $(function () {
    loadPartials().always(function () {
      hydrateLayout();
      renderIcons();
      // Initialise default tab state
      $('[data-tabs]').each(function () {
        var $first = $(this).find('[data-tab][aria-selected="true"]').first();
        activateTab($first.length ? $first : $(this).find('[data-tab]').first());
      });
      isReady = true;
      $.each(readyQueue, function (_, fn) { fn($); });
      readyQueue = [];
      $doc.trigger('app:ready');
    });
  });

  window.App = {
    ready: onReady,
    toast: toast,
    modal: modal,
    theme: theme,
    icons: renderIcons,
    confirm: confirmDialog,
    store: store,
  };
})(jQuery);
