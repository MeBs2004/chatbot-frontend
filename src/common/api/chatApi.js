import axios from "axios";

// Phase 14 — none of this file's axios calls had a timeout, so a
// hung backend/network request could leave the widget waiting
// indefinitely with no visible failure. 60s comfortably covers a
// real (if slow) AI reply without cutting off legitimate responses.
axios.defaults.timeout = 60000;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Change this to the company you want to run
// "nuform-social" OR "oya-gemkara"
const COMPANY_ID = "oya-gemkara";

export const saveVisitor = (data) =>
  axios.post(`${BACKEND_URL}bot/v1/visitor`, data, {
    headers: {
      "x-company-id": COMPANY_ID,
    },
  });

export const saveEmail = (data) =>
  axios.post(`${BACKEND_URL}bot/v1/visitor/email`, data, {
    headers: {
      "x-company-id": COMPANY_ID,
    },
  });

export const sendMessage = (data) =>
  axios.post(`${BACKEND_URL}bot/v1/message`, data, {
    headers: {
      "x-company-id": COMPANY_ID,
    },
  });

export const getSuggestions = (companyId = COMPANY_ID, language) =>
  axios.get(`${BACKEND_URL}bot/v1/suggestions`, {
    params: {
      companyId,
      language,
    },
    headers: {
      "x-company-id": companyId,
    },
  });