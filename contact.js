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

if (form && statusNode) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearStatus();

    const fullName = getValue("full-name");
    const jobTitle = getValue("job-title");
    const organization = getValue("organization");
    const workEmail = getValue("work-email").toLowerCase();
    const organizationWebsite = getValue("organization-website");
    const inquiryType = getValue("inquiry-type");
    const timeline = getValue("timeline");
    const matterSummary = getValue("matter-summary");
    const confirmed = document.getElementById("screening-confirmation")?.checked;

    if (!form.reportValidity()) {
      setStatus("Complete all required fields before screening the inquiry.", "error");
      return;
    }

    const emailDomain = extractEmailDomain(workEmail);
    if (!emailDomain) {
      setStatus("Enter a valid organization email address.", "error");
      return;
    }

    if (blockedDomains.has(emailDomain)) {
      setStatus("Personal email providers are not accepted here. Use an organization-owned email domain.", "error");
      document.getElementById("work-email")?.focus();
      return;
    }

    const websiteHost = parseWebsiteHost(organizationWebsite);
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

    if (!confirmed) {
      setStatus("Confirm that you represent the named organization and will not send evidence through this public page.", "error");
      document.getElementById("screening-confirmation")?.focus();
      return;
    }

    const subject = `FrameAudit ${inquiryType} Request`;
    const body = [
      "Screened institutional inquiry",
      "",
      `Full name: ${fullName}`,
      `Job title: ${jobTitle}`,
      `Organization: ${organization}`,
      `Work email: ${workEmail}`,
      `Organization website: ${normalizeWebsite(organizationWebsite)}`,
      `Inquiry type: ${inquiryType}`,
      `Timeline: ${timeline}`,
      "",
      "Matter summary:",
      matterSummary,
      "",
      "Confirmation:",
      "I represent the named organization, I am using an organization-owned domain, and I understand that evidence should only be shared after a private route is approved."
    ].join("\n");

    setStatus("Screening passed. Your email client is opening with a structured inquiry draft.", "success");
    window.setTimeout(() => {
      window.location.href = `mailto:TeamMohamed@proton.me?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }, 150);
  });
}

function getValue(id) {
  return document.getElementById(id)?.value.trim() ?? "";
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