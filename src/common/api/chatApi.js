import axios from "axios";

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