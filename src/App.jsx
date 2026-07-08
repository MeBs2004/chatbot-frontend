import { Routes, Route } from "react-router-dom";

import Bot from "./component/Bot";
import OyaBot from "./component/OyaBot";
import Embed from "./pages/Embed";

// 👇 Change ONLY this line when testing locally
const COMPANY_ID = "nuform-social";
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
