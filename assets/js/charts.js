/**
 * Chart.js helpers that follow the light/dark theme.
 *
 * Usage:
 *   App.chart('#revenue', function (t) {
 *     return { type: 'line', data: {...}, options: {...} };   // use t.text, t.grid, t.colors[0] ...
 *   });
 *
 * The factory is re-run when the theme changes, so colors always match.
 * Requires Chart.js 4 and app.js.
 */
(function ($) {
  'use strict';

  var registry = [];

  function theme() {
    var dark = document.documentElement.classList.contains('dark');
    return {
      dark: dark,
      text: dark ? '#94a3b8' : '#64748b',
      grid: dark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.12)',
      surface: dark ? '#0f172a' : '#ffffff',
      tooltipBg: dark ? '#1e293b' : '#0f172a',
      // primary, emerald, amber, sky, rose, violet
      colors: ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#f43f5e', '#8b5cf6'],
      alpha: function (hex, a) {
        var n = parseInt(hex.slice(1), 16);
        return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
      },
    };
  }

  function applyDefaults(t) {
    if (!window.Chart) return;
    var d = window.Chart.defaults;
    d.font.family = 'Inter, ui-sans-serif, system-ui, sans-serif';
    d.font.size = 12;
    d.color = t.text;
    d.borderColor = t.grid;
    d.maintainAspectRatio = false;
    d.plugins.legend.labels.usePointStyle = true;
    d.plugins.legend.labels.boxWidth = 8;
    d.plugins.legend.labels.boxHeight = 8;
    d.plugins.tooltip.backgroundColor = t.tooltipBg;
    d.plugins.tooltip.padding = 10;
    d.plugins.tooltip.cornerRadius = 8;
    d.plugins.tooltip.boxPadding = 4;
  }

  function build(entry) {
    var t = theme();
    applyDefaults(t);
    if (entry.chart) entry.chart.destroy();
    entry.chart = new window.Chart(entry.canvas, entry.factory(t));
  }

  window.App = window.App || {};

  window.App.chart = function (selector, factory) {
    var canvas = $(selector)[0];
    if (!canvas || !window.Chart) return null;
    var entry = { canvas: canvas, factory: factory, chart: null };
    build(entry);
    registry.push(entry);
    return entry; // entry.chart is the live Chart instance
  };

  window.App.chartTheme = theme;

  $(document).on('theme:change', function () {
    $.each(registry, function (_, entry) { build(entry); });
  });
})(jQuery);
