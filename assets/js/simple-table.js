/**
 * simpleTable - tiny client-side data table for jQuery
 *
 * Usage:
 *   var table = $('#users').simpleTable({
 *     data: [...],                       // array of objects (or load later with table.setData)
 *     columns: [
 *       { key: 'name', label: 'Name', sortable: true, render: function (value, row) { return ...html } },
 *       { key: 'actions', label: '', sortable: false, className: 'text-right', render: ... }
 *     ],
 *     pageSize: 10,
 *     pageSizes: [5, 10, 25, 50],
 *     searchKeys: ['name', 'email'],     // default: all column keys
 *     search: '#search-input',           // optional external input
 *     emptyText: 'No records found',
 *     onRender: function ($container) {} // called after each render
 *   }).data('simpleTable');
 *
 *   table.setData(rows)   table.removeWhere(fn)   table.refresh()   table.getRows()
 *
 * Note: render() return values are inserted as HTML. Escape untrusted values
 * with $.fn.simpleTable.escape(value).
 */
(function ($) {
  'use strict';

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function SimpleTable($el, opts) {
    this.$el = $el;
    this.opts = $.extend({
      data: [],
      columns: [],
      pageSize: 10,
      pageSizes: [5, 10, 25, 50],
      searchKeys: null,
      search: null,
      emptyText: 'No records found',
      onRender: null,
    }, opts);
    this.rows = this.opts.data.slice();
    this.page = 1;
    this.pageSize = this.opts.pageSize;
    this.query = '';
    this.sortKey = null;
    this.sortDir = 'asc';
    this.build();
    this.render();
  }

  SimpleTable.prototype.build = function () {
    var self = this;
    var head = $.map(this.opts.columns, function (c) {
      var sortable = c.sortable !== false;
      return '<th scope="col" class="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 ' +
        (c.className || '') + '">' +
        (sortable
          ? '<button type="button" data-sort="' + c.key + '" class="group inline-flex items-center gap-1 uppercase hover:text-slate-700 dark:hover:text-slate-200">' +
            escapeHtml(c.label) +
            '<span class="sort-icon text-slate-300 group-hover:text-slate-400 dark:text-slate-600">&#8597;</span></button>'
          : escapeHtml(c.label)) +
        '</th>';
    }).join('');

    var sizes = $.map(this.opts.pageSizes, function (s) {
      return '<option value="' + s + '"' + (s === self.pageSize ? ' selected' : '') + '>' + s + '</option>';
    }).join('');

    this.$el.html(
      '<div class="overflow-x-auto scrollbar-thin">' +
      '  <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-800">' +
      '    <thead class="bg-slate-50 dark:bg-slate-800/50"><tr>' + head + '</tr></thead>' +
      '    <tbody class="st-body divide-y divide-slate-100 dark:divide-slate-800"></tbody>' +
      '  </table>' +
      '</div>' +
      '<div class="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:text-slate-400">' +
      '  <div class="flex items-center gap-2">' +
      '    <span>Rows</span>' +
      '    <select class="st-size rounded-lg border border-slate-200 bg-white py-1 pl-2 pr-7 text-sm focus:border-primary-500 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800">' + sizes + '</select>' +
      '    <span class="st-info"></span>' +
      '  </div>' +
      '  <nav class="st-pager flex items-center gap-1" aria-label="Pagination"></nav>' +
      '</div>'
    );

    this.$el.on('click', '[data-sort]', function () {
      var key = $(this).data('sort');
      if (self.sortKey === key) self.sortDir = self.sortDir === 'asc' ? 'desc' : 'asc';
      else { self.sortKey = key; self.sortDir = 'asc'; }
      self.render();
    });
    this.$el.on('click', '[data-page-to]', function () {
      self.page = +$(this).data('page-to');
      self.render();
    });
    this.$el.on('change', '.st-size', function () {
      self.pageSize = +this.value;
      self.page = 1;
      self.render();
    });

    if (this.opts.search) {
      var timer;
      $(this.opts.search).on('input', function () {
        var v = this.value;
        clearTimeout(timer);
        timer = setTimeout(function () { self.query = v.trim().toLowerCase(); self.page = 1; self.render(); }, 150);
      });
    }
  };

  SimpleTable.prototype.filtered = function () {
    var self = this;
    var keys = this.opts.searchKeys || $.map(this.opts.columns, function (c) { return c.key; });
    var rows = this.rows;

    if (this.query) {
      rows = $.grep(rows, function (r) {
        return keys.some(function (k) { return String(r[k] == null ? '' : r[k]).toLowerCase().indexOf(self.query) !== -1; });
      });
    }
    if (this.sortKey) {
      var k = this.sortKey;
      var dir = this.sortDir === 'asc' ? 1 : -1;
      rows = rows.slice().sort(function (a, b) {
        var x = a[k], y = b[k];
        if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
        return String(x).localeCompare(String(y), undefined, { numeric: true }) * dir;
      });
    }
    return rows;
  };

  SimpleTable.prototype.render = function () {
    var self = this;
    var rows = this.filtered();
    var total = rows.length;
    var pages = Math.max(1, Math.ceil(total / this.pageSize));
    if (this.page > pages) this.page = pages;
    var start = (this.page - 1) * this.pageSize;
    var slice = rows.slice(start, start + this.pageSize);
    var cols = this.opts.columns;

    var body = slice.length
      ? $.map(slice, function (row) {
        return '<tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">' + $.map(cols, function (c) {
          var val = row[c.key];
          var html = c.render ? c.render(val, row) : escapeHtml(val);
          return '<td class="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-300 ' + (c.className || '') + '">' + html + '</td>';
        }).join('') + '</tr>';
      }).join('')
      : '<tr><td colspan="' + cols.length + '" class="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">' + escapeHtml(this.opts.emptyText) + '</td></tr>';

    this.$el.find('.st-body').html(body);

    // Sort indicators
    this.$el.find('[data-sort]').each(function () {
      var on = $(this).data('sort') === self.sortKey;
      $(this).find('.sort-icon')
        .html(on ? (self.sortDir === 'asc' ? '&#9650;' : '&#9660;') : '&#8597;')
        .toggleClass('text-primary-600 dark:text-primary-400', on);
    });

    this.$el.find('.st-info').text(total ? (start + 1) + '–' + Math.min(start + this.pageSize, total) + ' of ' + total : '0 results');
    this.$el.find('.st-pager').html(this.pager(pages));

    if (window.App) window.App.icons();
    if (this.opts.onRender) this.opts.onRender(this.$el);
  };

  SimpleTable.prototype.pager = function (pages) {
    var p = this.page;
    var btn = function (label, to, disabled, active) {
      return '<button type="button" ' + (disabled ? 'disabled' : 'data-page-to="' + to + '"') +
        ' class="inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium ' +
        (active ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800') +
        (disabled ? ' cursor-not-allowed opacity-40 hover:bg-transparent' : '') + '">' + label + '</button>';
    };
    var out = [btn('&lsaquo;', p - 1, p === 1)];
    var range = [];
    for (var i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - p) <= 1) range.push(i);
      else if (range[range.length - 1] !== '…') range.push('…');
    }
    $.each(range, function (_, i) {
      out.push(i === '…' ? '<span class="px-1">…</span>' : btn(i, i, false, i === p));
    });
    out.push(btn('&rsaquo;', p + 1, p === pages));
    return out.join('');
  };

  SimpleTable.prototype.setData = function (rows) { this.rows = rows.slice(); this.page = 1; this.render(); };
  SimpleTable.prototype.removeWhere = function (fn) { this.rows = $.grep(this.rows, fn, true); this.render(); };
  SimpleTable.prototype.refresh = function () { this.render(); };
  SimpleTable.prototype.getRows = function () { return this.rows.slice(); };

  $.fn.simpleTable = function (opts) {
    return this.each(function () {
      var $el = $(this);
      if (!$el.data('simpleTable')) $el.data('simpleTable', new SimpleTable($el, opts));
    });
  };
  $.fn.simpleTable.escape = escapeHtml;
})(jQuery);
