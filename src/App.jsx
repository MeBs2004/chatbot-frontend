import { Routes, Route } from "react-router-dom";

import Bot from "./component/Bot";
import OyaBot from "./component/OyaBot";
import Embed from "./pages/Embed";

// 👇 Change ONLY this line when testing locally
const COMPANY_ID = "oya-gemkara"; // "nuform-social" | "oya-gemkara" | "test-company" | "test-company-2" | "test-company-3" | "test-company-4" | "test-company-5" | "test-company-6" | "test-company-7" | "test-company-8" | "test-company-9" | "test-company-10"
// const COMPANY_ID = "nuform-social";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={COMPANY_ID === "oya-gemkara" ? <OyaBot /> : <Bot />}
      />

      <Route path="/embed" element={<Embed />} />

      {/* Optional direct routes */}
      <Route path="/nuform" element={<Bot />} />
      <Route path="/oya" element={<OyaBot />} />
    </Routes>
  );
}

export default App;
