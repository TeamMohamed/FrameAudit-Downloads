const blockedDomains = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "gmx.com"
]);

const form = document.getElementById("screened-contact-form");
const statusNode = document.getElementById("screened-contact-status");
const submitNode = document.getElementById("screened-contact-submit");
const fallbackNode = document.getElementById("screened-contact-fallback");
const noteNode = document.getElementById("screened-contact-note");
const endpointMeta = document.querySelector('meta[name="frameaudit-intake-endpoint"]');
const intakeEndpoint = normalizeEndpoint(endpointMeta?.getAttribute("content") ?? "");

if (submitNode && noteNode) {
  if (intakeEndpoint) {
    submitNode.textContent = "Submit Screened Inquiry";
    noteNode.textContent = "This build is configured to submit inquiries to a server-side screening endpoint. Rejected domains stop there and never reach the intake mailbox.";
    fallbackNode?.setAttribute("hidden", "hidden");
  } else {
    noteNode.textContent = "This build is not yet pointing at a server-side screening endpoint. Passing screening opens a structured email draft for manual review.";
    fallbackNode?.removeAttribute("hidden");
  }
}

if (form && statusNode) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearStatus();

    const submission = readSubmission();

    if (!form.reportValidity()) {
      setStatus("Complete all required fields before screening the inquiry.", "error");
      return;
    }

    const emailDomain = extractEmailDomain(submission.workEmail);
    if (!emailDomain) {
      setStatus("Enter a valid organization email address.", "error");
      return;
    }

    if (blockedDomains.has(emailDomain)) {
      setStatus("Personal email providers are not accepted here. Use an organization-owned email domain.", "error");
      document.getElementById("work-email")?.focus();
      return;
    }

    const websiteHost = parseWebsiteHost(submission.organizationWebsite);
    if (!websiteHost) {
      setStatus("Enter a valid organization website such as company.com or https://company.com.", "error");
      document.getElementById("organization-website")?.focus();
      return;
    }

    if (!domainsAlign(emailDomain, websiteHost)) {
      setStatus("The work email domain must align with the organization website you provide.", "error");
      document.getElementById("organization-website")?.focus();
      return;
    }

    if (!submission.screeningConfirmation) {
      setStatus("Confirm that you represent the named organization and will not send evidence through this public page.", "error");
      document.getElementById("screening-confirmation")?.focus();
      return;
    }

    if (intakeEndpoint) {
      await submitToEndpoint(submission);
      return;
    }

    const subject = `FrameAudit ${submission.inquiryType} Request`;
    const body = [
      "Screened institutional inquiry",
      "",
      `Full name: ${submission.fullName}`,
      `Job title: ${submission.jobTitle}`,
      `Organization: ${submission.organization}`,
      `Work email: ${submission.workEmail}`,
      `Organization website: ${normalizeWebsite(submission.organizationWebsite)}`,
      `Inquiry type: ${submission.inquiryType}`,
      `Timeline: ${submission.timeline}`,
      "",
      "Matter summary:",
      submission.matterSummary,
      "",
      "Confirmation:",
      "I represent the named organization, I am using an organization-owned domain, and I understand that evidence should only be shared after a private route is approved."
    ].join("\n");

    setStatus("Screening passed. Your email client is opening with a structured inquiry draft.", "success");
    globalThis.setTimeout(() => {
      globalThis.location.href = `mailto:TeamMohamed@proton.me?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }, 150);
  });
}

function readSubmission() {
  return {
    fullName: getValue("full-name"),
    jobTitle: getValue("job-title"),
    organization: getValue("organization"),
    workEmail: getValue("work-email").toLowerCase(),
    organizationWebsite: getValue("organization-website"),
    inquiryType: getValue("inquiry-type"),
    timeline: getValue("timeline"),
    matterSummary: getValue("matter-summary"),
    screeningConfirmation: Boolean(document.getElementById("screening-confirmation")?.checked)
  };
}

async function submitToEndpoint(submission) {
  try {
    const response = await fetch(intakeEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(submission)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(data.message ?? "The screening service rejected the inquiry.", "error");
      return;
    }

    form?.reset();
    setStatus(data.message ?? "Inquiry accepted. You will receive a reply after screening.", "success");
  } catch {
    setStatus("The screening service is unavailable right now. Try again later or use the direct email fallback in a build that exposes it.", "error");
  }
}

function getValue(id) {
  return document.getElementById(id)?.value.trim() ?? "";
}

function normalizeEndpoint(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("__")) {
    return "";
  }
  return trimmed;
}

function extractEmailDomain(email) {
  const parts = email.split("@");
  return parts.length === 2 ? parts[1] : "";
}

function normalizeWebsite(value) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function parseWebsiteHost(value) {
  try {
    const url = new URL(normalizeWebsite(value));
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function domainsAlign(emailDomain, websiteHost) {
  return emailDomain === websiteHost
    || emailDomain.endsWith(`.${websiteHost}`)
    || websiteHost.endsWith(`.${emailDomain}`);
}

function clearStatus() {
  statusNode.hidden = true;
  statusNode.textContent = "";
  delete statusNode.dataset.state;
}

function setStatus(message, state) {
  statusNode.hidden = false;
  statusNode.textContent = message;
  statusNode.dataset.state = state;
}