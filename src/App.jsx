import { Routes, Route } from "react-router-dom";

import Bot from "./component/Bot";
import OyaBot from "./component/OyaBot";
import Embed from "./pages/Embed";

function App() {
  return (
    <Routes>
      <Route path="/" element={<OyaBot />} />
      <Route path="/embed" element={<Embed />} />
      <Route path="/nuform" element={<Bot />} />
      <Route path="/oya" element={<OyaBot />} />
    </Routes>
  );
}

export default App;
