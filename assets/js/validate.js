/**
 * formValidate - lightweight jQuery form validation using native HTML5 rules.
 *
 * Supports: required, type=email/url/number, pattern, minlength, maxlength, min, max,
 * plus data-match="#otherInput" (e.g. confirm password).
 * Custom message per field: data-error="Please enter your name".
 *
 *   $('#my-form').formValidate({
 *     onValid: function ($form, data) { $.post('/api', data); },
 *     onInvalid: function ($form, $fields) {}
 *   });
 *
 * Add novalidate to the <form> so the browser's own bubbles don't show.
 */
(function ($) {
  'use strict';

  var ERR_INPUT = 'border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/70';

  function fieldMessage(el) {
    var $el = $(el);
    if ($el.data('error')) return $el.data('error');
    var v = el.validity;
    if (v.valueMissing) return el.type === 'checkbox' ? 'Please check this box.' : 'This field is required.';
    if (v.typeMismatch && el.type === 'email') return 'Please enter a valid email address.';
    if (v.typeMismatch && el.type === 'url') return 'Please enter a valid URL.';
    if (v.tooShort) return 'Please use at least ' + el.minLength + ' characters.';
    if (v.patternMismatch) return 'Please match the requested format.';
    if (v.customError) return el.validationMessage;
    return el.validationMessage || 'Invalid value.';
  }

  function errorAnchor($el) {
    // Put the message after the wrapping label (checkbox) or the input's relative wrapper
    var $label = $el.closest('label');
    if ($label.length) return $label;
    var $wrap = $el.parent('.relative, .flex');
    return $wrap.length ? $wrap : $el;
  }

  function clearError($el) {
    $el.removeClass(ERR_INPUT).removeAttr('aria-invalid');
    errorAnchor($el).next('.field-error').remove();
  }

  function showError($el, msg) {
    $el.addClass(ERR_INPUT).attr('aria-invalid', 'true');
    var $anchor = errorAnchor($el);
    var $msg = $anchor.next('.field-error');
    if (!$msg.length) $msg = $('<p class="field-error mt-1.5 text-xs text-red-600 dark:text-red-400"></p>').insertAfter($anchor);
    $msg.text(msg);
  }

  function checkField(el) {
    var $el = $(el);
    var match = $el.data('match');
    if (match) el.setCustomValidity(el.value !== $(match).val() ? ($el.data('error') || 'Values do not match.') : '');
    if (el.checkValidity()) { clearError($el); return true; }
    showError($el, fieldMessage(el));
    return false;
  }

  $.fn.formValidate = function (opts) {
    opts = $.extend({ onValid: null, onInvalid: null }, opts);

    return this.each(function () {
      var $form = $(this);
      var fields = 'input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea';

      // Re-validate a field once the user has touched it
      $form.on('input change', fields, function () {
        if ($(this).attr('aria-invalid') === 'true') checkField(this);
      });

      $form.on('reset', function () {
        setTimeout(function () { $form.find(fields).each(function () { clearError($(this)); }); }, 0);
      });

      $form.on('submit', function (e) {
        e.preventDefault();
        var $invalid = $form.find(fields).filter(function () { return !checkField(this); });

        if ($invalid.length) {
          $invalid.first().trigger('focus');
          if (opts.onInvalid) opts.onInvalid($form, $invalid);
          return;
        }

        var data = {};
        $.each($form.serializeArray(), function (_, f) {
          if (data[f.name] !== undefined) data[f.name] = [].concat(data[f.name], f.value);
          else data[f.name] = f.value;
        });
        if (opts.onValid) opts.onValid($form, data);
      });
    });
  };
})(jQuery);
