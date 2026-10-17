/* ============================================================================
   /apply — the Cohort 1 application starter.

   This page collects a name and an email and nothing else. That is deliberate:
   licence, state and experience are classified fields under the platform's
   admissions contract (packages/contracts/src/admissions-fields.ts), each with
   a data class, a retention clock and an employer-visibility flag, and they
   belong behind the endpoint that honours those policies rather than in a
   static page. Name and email are the C1 fields, so they can be taken here and
   the rest follows by email.

   The endpoint below does not exist yet — the platform has the admissions
   contract but no route. Until it does, every submission takes the fallback
   path and hands the visitor a pre-addressed email, so the page is useful from
   the day it ships rather than from the day the route lands.
   ========================================================================= */
(function () {
  "use strict";

  var ENDPOINT = "https://app.prentice1.com/v1/applications";
  var MAILTO = "mailto:hello@prentice1.com";

  var form = document.getElementById("applyForm");
  if (!form) return;

  var submit = document.getElementById("applySubmit");
  var status = document.getElementById("applyStatus");

  function setMsg(id, text) {
    var msg = document.getElementById(id + "-msg");
    var input = document.getElementById(id);
    if (msg) msg.textContent = text || "";
    if (input) input.setAttribute("aria-invalid", text ? "true" : "false");
  }

  function say(kind, html) {
    status.hidden = false;
    status.className = "apply__status apply__status--" + kind;
    status.innerHTML = html;
  }

  function validate(values) {
    var ok = true;
    var first = null;

    if (!values.name) {
      setMsg("name", "Enter your full name.");
      first = first || document.getElementById("name");
      ok = false;
    } else {
      setMsg("name", "");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      setMsg("email", "Enter an email like name@example.com.");
      first = first || document.getElementById("email");
      ok = false;
    } else {
      setMsg("email", "");
    }

    if (first) first.focus();
    return ok;
  }

  function fallbackLink(values) {
    var subject = "Application — Prentice1 Cohort 1";
    var body = "Name: " + values.name + "\nEmail: " + values.email + "\n";
    return MAILTO + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var values = {
      name: form.name.value.trim(),
      email: form.email.value.trim()
    };

    // Honeypot: a person cannot see this field, so anything in it is a bot.
    // Answer exactly as we would a real submission, and send nothing.
    if (form.company.value) {
      say("ok", "<b>Thank you.</b> We'll be in touch.");
      return;
    }

    if (!validate(values)) return;

    submit.disabled = true;
    var original = submit.textContent;
    submit.textContent = "Sending…";
    status.hidden = true;

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        form.reset();
        say("ok", "<b>Thank you.</b> We'll email the full application to " +
          escapeHtml(values.email) + " within 3 business days.");
        submit.hidden = true;
      })
      .catch(function () {
        /* The route is not live yet, the visitor is offline, or the request was
           blocked. Any of those, the answer is the same: do not pretend it
           sent, and do not make them retype anything. */
        say("warn",
          "<b>We couldn't submit that automatically.</b> " +
          "<a href=\"" + fallbackLink(values) + "\">Send it to us by email instead</a> " +
          "— the message is already filled in, and we'll pick it up from there.");
        submit.disabled = false;
        submit.textContent = original;
      });
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
})();
