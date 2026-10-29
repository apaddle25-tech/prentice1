/* ============================================================================
   /apply — the Cohort 1 application starter.

   Everything needed to qualify and contact an applicant is taken in one
   sitting — there is no second form to wait for by email, because the gap
   between the two is where applicants are lost.

   The fields stop where the data class does. Name, email, licence type, state,
   experience and goals are C1 in the admissions contract
   (packages/contracts/src/admissions-fields.ts): employer-visible already, and
   retained to P+7. Mobile is C2. Nothing here touches what the contract guards
   — no licence NUMBER (B-06, C4, "employers verify via the Readiness Standard
   endpoint, not a number we hand over"), no date of birth (A-16, C4), no photo
   ID (A-23, C4), no street address (A-11..A-13, C3).

   Those live in the Intake proper, which the questionnaire defines as 47
   rendered fields over about seven minutes with one upload, autosaving and
   resumable. That is a platform instrument, not a static page.

   If the endpoint is unreachable — not yet deployed, the visitor offline, the
   request blocked — the submission falls back to a pre-addressed email, so the
   page is useful whatever the state of the platform behind it.
   ========================================================================= */
(function () {
  "use strict";

  // /api/, not /v1/: the API is a private Render service, and app.prentice1.com
  // rewrites /api/:path* to its /v1/:path*. /v1/ from a browser is a 404.
  var ENDPOINT = "https://app.prentice1.com/api/applications";
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

    if (!values.cohort) {
      setMsg("cohort", "Choose Cohort 1 or a future cohort.");
      first = first || form.querySelector('input[name="cohort"]');
      ok = false;
    } else {
      setMsg("cohort", "");
    }

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

    [["licence", "Select your license."],
     ["state", "Select the state you're licensed in."],
     ["experience", "Select a range."]].forEach(function (pair) {
      if (!values[pair[0]]) {
        setMsg(pair[0], pair[1]);
        first = first || document.getElementById(pair[0]);
        ok = false;
      } else {
        setMsg(pair[0], "");
      }
    });

    if (first) first.focus();
    return ok;
  }

  /* The fallback carries the C1 answers only. Mobile is C2 and marked
     employer "no" in the contract, with introductions brokered by Prentice1 —
     a plain email thread is outside every control that applies to it, so it
     is left out and asked for again on the call. */
  function fallbackLink(values) {
    var subject = "Application — Prentice1 " + cohortLabel(values.cohort);
    var body =
      "Starting: " + cohortLabel(values.cohort) + "\n" +
      "Name: " + values.name + "\n" +
      "Email: " + values.email + "\n" +
      "License: " + values.licence + "\n" +
      "State: " + values.state + "\n" +
      "Experience: " + values.experience + "\n" +
      (values.goals ? "Goals: " + values.goals + "\n" : "");
    return MAILTO + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  function cohortLabel(v) {
    return v === "future" ? "future cohort" : "Cohort 1";
  }

  /* Links from "Apply for a future cohort" arrive with ?cohort=future and
     land with that option already chosen; the applicant can still change it. */
  (function preselectCohort() {
    var m = /[?&]cohort=([^&]+)/.exec(window.location.search);
    if (!m) return;
    var radio = form.querySelector('input[name="cohort"][value="' + decodeURIComponent(m[1]).replace(/"/g, "") + '"]');
    if (radio) radio.checked = true;
  })();

  /* 50 states, DC and PR, matching A-14's allowed set. */
  var STATES = ("Alabama,Alaska,Arizona,Arkansas,California,Colorado,Connecticut,Delaware," +
    "District of Columbia,Florida,Georgia,Hawaii,Idaho,Illinois,Indiana,Iowa,Kansas,Kentucky," +
    "Louisiana,Maine,Maryland,Massachusetts,Michigan,Minnesota,Mississippi,Missouri,Montana," +
    "Nebraska,Nevada,New Hampshire,New Jersey,New Mexico,New York,North Carolina,North Dakota," +
    "Ohio,Oklahoma,Oregon,Pennsylvania,Puerto Rico,Rhode Island,South Carolina,South Dakota," +
    "Tennessee,Texas,Utah,Vermont,Virginia,Washington,West Virginia,Wisconsin,Wyoming").split(",");

  (function fillStates() {
    var sel = document.getElementById("state");
    if (!sel) return;
    var frag = document.createDocumentFragment();
    STATES.forEach(function (name) {
      var o = document.createElement("option");
      o.textContent = name;
      frag.appendChild(o);
    });
    sel.appendChild(frag);
  })();

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var checked = form.querySelector('input[name="cohort"]:checked');
    var values = {
      // TODO: confirm the applications API accepts `cohort` ("cohort-1" or
      // "future") before this ships; a server that rejects unknown fields would
      // send every applicant to the email fallback.
      cohort: checked ? checked.value : "",
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      licence: form.licence.value,
      state: form.state.value,
      experience: form.experience.value,
      goals: form.goals.value.trim(),
      // Sent, not filtered out here. A person cannot see this field, so anything
      // in it is automated — and the server is the side that has to act on that,
      // because a bot posting JSON directly never runs this file at all.
      company: form.company.value
    };

    // Answer a local catch exactly as a real submission, and send nothing.
    if (values.company) {
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
        /* Describes the next step and promises no clock. The only response time
           this page states is "within 5 business days OF THE INTERVIEW", three
           steps later — repeating the number here without that qualifier reads
           as five days from now, which nothing delivers. */
        say("ok", "<b>Thank you — we have your details.</b> We'll check your license and email " +
          escapeHtml(values.email) + " with the full application" +
          (values.cohort === "future" ? ", and let you know as soon as the next cohort's dates are set." : "."));
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
