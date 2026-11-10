/**
 * Load this synchronously in <head> (before any CSS paints) to avoid a
 * flash of the wrong theme / sidebar state.
 */
(function () {
  var html = document.documentElement;
  var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };

  var theme = get('theme');
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (theme === 'dark' || (!theme && prefersDark)) html.classList.add('dark');

  if (get('sidebar-collapsed') === '1') html.classList.add('sidebar-collapsed');

  html.classList.add('no-transition');
  window.addEventListener('load', function () {
    setTimeout(function () { html.classList.remove('no-transition'); }, 50);
  });
})();
