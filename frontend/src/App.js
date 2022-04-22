import { BrowserRouter, Route, Routes } from "react-router-dom";
import HeaderComponent from "./components/Header";
import Accounts from "./pages/accounts";
import Blocks from "./pages/blocks";
import BlockDetail from "./pages/blocks/blockDetail";
import Events from "./pages/events";
import Extrinsics from "./pages/extrinsics";
import Home from "./pages/home";
import Transfers from "./pages/transfers";

function App() {
  return (
    <BrowserRouter>
      <HeaderComponent />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/blocks" element={<Blocks />} />
        <Route path="/blocks/:id" element={<BlockDetail />} />
        <Route path="/transfers" element={<Transfers />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/extrinsics" element={<Extrinsics />} />
        <Route path="/events" element={<Events />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
